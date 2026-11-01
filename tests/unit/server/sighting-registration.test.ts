// @vitest-environment node
// Kennzeichen je Sichtung (sighting-log-r3kw8, ADR 0033 Amendment).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../../src/server/db';
import { SightingRepository, knownAircraft } from '../../../src/server/modules/sighting-log/repository';
import { sightingsByClass } from '../../../src/server/modules/sighting-log/sightings-by-class';

const NOW = Date.parse('2026-10-27T12:00:00Z');
const mk = () => {
  const db = openDatabase(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 's.db'));
  const repo = new SightingRepository(db, 1800_000, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' });
  const b = { typklasse: 'narrow', liveryPresent: false, distanceKm: 1, route: null, slot: 1 };
  return { db, repo, obs: (icao24: string, o: object = {}, at = NOW) => repo.observe({ ...b, icao24, callsign: 'DLH1', airline: 'Lufthansa', ...o } as never, at) };
};
const regs = (db: ReturnType<typeof mk>['db']) => (db.prepare('SELECT icao24, registration FROM sightings ORDER BY id').all() as { icao24: string; registration: string | null }[]);

describe('registration column', () => {
  it('migration 0009 keeps old rows with NULL registration', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 'old.db');
    openDatabase(file).close();
    const raw = new Database(file);
    raw.exec('ALTER TABLE sightings DROP COLUMN registration');
    raw.pragma('user_version = 8');
    raw.prepare("INSERT INTO sightings (icao24, typklasse, livery_present, closest_distance_km, first_seen_at, last_seen_at, last_seen_ms) VALUES ('abc','narrow',0,1,'x','x',1)").run();
    raw.close();
    const db = openDatabase(file);
    expect(regs(db)).toEqual([{ icao24: 'abc', registration: null }]);
  });
  it('stores trimmed upper-case; empty or missing becomes NULL', () => {
    const { db, obs } = mk();
    obs('a1', { registration: 'd-aixa ' });
    obs('a2', { registration: '  ' });
    obs('a3');
    expect(regs(db).map((r) => r.registration)).toEqual(['D-AIXA', null, null]);
  });
  it('fills an empty column on a continued visit but never overwrites', () => {
    const { db, obs } = mk();
    obs('a1');
    obs('a1', { registration: 'D-AAAA' }, NOW + 1000);
    obs('a1', { registration: 'D-BBBB' }, NOW + 2000);
    expect(regs(db)).toEqual([{ icao24: 'a1', registration: 'D-AAAA' }]);
  });
  it('delivers the registration in samples', () => {
    const { db, obs } = mk();
    obs('a1', { registration: 'D-AIXA' });
    obs('a2');
    const s = sightingsByClass(db, { days: 7, nowMs: NOW + 1000 }).rows[0].samples;
    expect(s.map((x) => [x.icao24, x.registration]).sort()).toEqual([['a1', 'D-AIXA'], ['a2', null]]);
  });
});

describe('knownAircraft', () => {
  it('null for unseen hex, null registration when none stored, newest registration otherwise, case-insensitive', () => {
    const { db, obs } = mk();
    obs('3c6444');
    obs('abc123', { registration: 'D-OLD1' }, NOW);
    obs('abc123', { registration: 'D-NEW1' }, NOW + 3_600_000);
    obs('abc123', {}, NOW + 7_200_000);
    expect(knownAircraft(db, 'ffffff')).toBeNull();
    expect(knownAircraft(db, '3c6444')).toEqual({ registration: null });
    expect(knownAircraft(db, 'ABC123')).toEqual({ registration: 'D-NEW1' });
  });
});
