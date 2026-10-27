// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SightingDedup } from '../../../src/server/modules/sighting-log/dedup';
import { SightingRepository, type SightingInput } from '../../../src/server/modules/sighting-log/repository';
import { openDatabase } from '../../../src/server/db';

const MIN = 60_000;

describe('SightingDedup (ein Eintrag je Flug und Besuch)', () => {
  it('reports a flight as new once; repeated Takte of the same flight are "seen"', () => {
    const d = new SightingDedup(30 * MIN);
    expect(d.observe('abc123', 0)).toBe('new');
    expect(d.observe('abc123', 30_000)).toBe('seen');
    expect(d.observe('abc123', 60_000)).toBe('seen');
  });
  it('tracks distinct flights independently', () => {
    const d = new SightingDedup(30 * MIN);
    expect(d.observe('a', 0)).toBe('new');
    expect(d.observe('b', 0)).toBe('new');
    expect(d.observe('a', 1000)).toBe('seen');
  });
  it('starts a new visit when the flight was absent longer than the gap', () => {
    const d = new SightingDedup(30 * MIN);
    d.observe('a', 0);
    expect(d.observe('a', 29 * MIN)).toBe('seen');
    expect(d.observe('a', 29 * MIN + 31 * MIN)).toBe('new');
  });
  it('can be hydrated from stored last-seen times (restart survives)', () => {
    const d = new SightingDedup(30 * MIN, { a: 10 * MIN });
    expect(d.observe('a', 11 * MIN)).toBe('seen');
  });
});

const input = (over: Partial<SightingInput> = {}): SightingInput => ({ icao24: 'abc123', callsign: 'DLH400', airline: 'Lufthansa', typeCode: 'A20N', typklasse: 'narrowbody', liveryPresent: true, distanceKm: 8.2, route: null, ...over });

describe('SightingRepository on SQLite', () => {
  const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 'planesabove.db');

  it('writes exactly one row for a flight observed across several Takte', () => {
    const repo = new SightingRepository(openDatabase(':memory:'), 30 * MIN, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' });
    repo.observe(input(), 0);
    repo.observe(input({ distanceKm: 5 }), 30_000);
    repo.observe(input({ distanceKm: 9 }), 60_000);
    const rows = repo.list();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ icao24: 'abc123', callsign: 'DLH400', airline: 'Lufthansa', typeCode: 'A20N', typklasse: 'narrowbody', liveryPresent: true, firstSeenAt: '1970-01-01T00:00:00.000Z', closestDistanceKm: 5 });
  });
  it('stores the Auswahl slot (1/2 when shown, null otherwise) and keeps the first one', () => {
    const repo = new SightingRepository(openDatabase(':memory:'), 30 * MIN, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' });
    repo.observe(input({ icao24: 'a', slot: 2 }), 0);
    repo.observe(input({ icao24: 'a', slot: 1 }), 1000);
    repo.observe(input({ icao24: 'b' }), 0);
    expect(repo.list().map((s) => [s.icao24, s.slot])).toEqual([['a', 2], ['b', null]]);
  });
  it('writes one row per distinct flight', () => {
    const repo = new SightingRepository(openDatabase(':memory:'), 30 * MIN, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' });
    repo.observe(input({ icao24: 'a' }), 0);
    repo.observe(input({ icao24: 'b', callsign: undefined, airline: undefined }), 0);
    expect(repo.list()).toHaveLength(2);
  });
  it('survives a restart: reopening the file keeps rows and does not duplicate the ongoing visit', () => {
    const file = tmp();
    const db1 = openDatabase(file);
    new SightingRepository(db1, 30 * MIN, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' }).observe(input(), 1_000_000);
    db1.close();
    const repo2 = new SightingRepository(openDatabase(file), 30 * MIN, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' });
    expect(repo2.list()).toHaveLength(1);
    repo2.observe(input(), 1_030_000);
    expect(repo2.list()).toHaveLength(1);
    repo2.observe(input(), 1_000_000 + 40 * MIN);
    expect(repo2.list()).toHaveLength(2);
  });
  it('counts unmapped type codes and airline prefixes (ADR 0010 #5)', () => {
    const repo = new SightingRepository(openDatabase(':memory:'), 30 * MIN, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' });
    repo.reportUnmapped('type', 'ZZZZ');
    repo.reportUnmapped('type', 'ZZZZ');
    repo.reportUnmapped('airline', 'QQQ');
    expect(repo.unmapped()).toEqual([{ kind: 'airline', key: 'QQQ', count: 1 }, { kind: 'type', key: 'ZZZZ', count: 2 }]);
  });
  it('returns the latest sighting for the "Zuletzt" bar', () => {
    const repo = new SightingRepository(openDatabase(':memory:'), 30 * MIN, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' });
    expect(repo.latest()).toBeUndefined();
    repo.observe(input({ icao24: 'a' }), 1000);
    repo.observe(input({ icao24: 'b', callsign: 'RYR1', airline: 'Ryanair' }), 5000);
    expect(repo.latest()).toMatchObject({ icao24: 'b', airline: 'Ryanair', lastSeenAtMs: 5000 });
  });
});
