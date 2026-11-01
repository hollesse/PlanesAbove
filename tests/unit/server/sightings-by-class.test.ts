// @vitest-environment node
// Sichtungen je Airline x Typklasse (ADR 0033).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../../src/server/db';
import { SightingRepository } from '../../../src/server/modules/sighting-log/repository';
import { sightingsByClass } from '../../../src/server/modules/sighting-log/sightings-by-class';

const NOW = Date.parse('2026-10-27T12:00:00Z');
const seed = () => {
  const db = openDatabase(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 's.db'));
  const repo = new SightingRepository(db, 1800_000, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' });
  const b = { typklasse: 'widebody', liveryPresent: false, distanceKm: 1, route: null, slot: 1 };
  const obs = (icao24: string, callsign: string | null, airline: string | null, o: object = {}, at = NOW - 1000) => repo.observe({ ...b, icao24, callsign, airline, ...o } as never, at);
  for (let i = 1; i <= 4; i++) obs(`u${i}`, `UAE${i}`, 'Emirates', {}, NOW - i * 1000);
  obs('u9', 'UAE9', 'Emirates', { typklasse: 'double-decker' }, NOW - 500);
  obs('p1', 'DLH4', 'Lufthansa', { liveryPresent: true, typklasse: 'narrow' }, NOW - 100);
  obs('x1', 'XYZ1', null, { typklasse: 'narrow' }, NOW - 200);
  obs('x2', 'XYZ2', null, { typklasse: 'narrow' }, NOW - 300);
  obs('n1', 'DEABC', null, { typklasse: 'narrow' }, NOW - 5000);
  obs('l1', 'DLH5', 'Lufthansa', { typklasse: 'light-aircraft' });
  obs('g1', 'GLD1', 'Glider Co', { typklasse: 'glider' });
  obs('ns', 'UAE7', 'Emirates', { slot: null });
  obs('old', 'UAE8', 'Emirates', {}, NOW - 30 * 86_400_000);
  return db;
};

describe('sightingsByClass', () => {
  it('groups per prefix x Typklasse with count, lastSeenMs, newest 3 samples, sorted count desc then lastSeenMs desc', () => {
    const r = sightingsByClass(seed(), { days: 7, nowMs: NOW });
    expect(r.days).toBe(7);
    expect(r.rows.map((x) => [x.prefix, x.typklasse, x.count])).toEqual([['UAE', 'widebody', 4], ['XYZ', 'narrow', 2], ['DLH', 'narrow', 1], ['UAE', 'double-decker', 1], ['?', 'narrow', 1]]);
    const uae = r.rows[0];
    expect(uae).toMatchObject({ airline: 'Emirates', lastSeenMs: NOW - 1000 });
    expect(uae.samples).toEqual([1, 2, 3].map((i) => ({ icao24: `u${i}`, registration: null, callsign: `UAE${i}`, lastSeenMs: NOW - i * 1000 })));
  });
  it('counts sightings with livery present; unknown prefix has airline null', () => {
    const r = sightingsByClass(seed(), { days: 7, nowMs: NOW });
    expect(r.rows.find((x) => x.prefix === 'DLH')).toMatchObject({ airline: 'Lufthansa', count: 1 });
    expect(r.rows.find((x) => x.prefix === 'XYZ')?.airline).toBeNull();
  });
  it('excludes light-aircraft, glider, no-slot and out-of-window; window can be widened', () => {
    const db = seed();
    expect(sightingsByClass(db, { days: 7, nowMs: NOW }).rows.reduce((n, x) => n + x.count, 0)).toBe(9);
    expect(sightingsByClass(db, { days: 60, nowMs: NOW }).rows[0].count).toBe(5);
  });
  it('filters by Standort like liveryStats', () => {
    const db = seed();
    expect(sightingsByClass(db, { days: 7, nowMs: NOW, standort: 'unbekannt' }).rows).toEqual([]);
    expect(sightingsByClass(db, { days: 7, nowMs: NOW, standort: 999 }).rows).toEqual([]);
    expect(sightingsByClass(db, { days: 7, nowMs: NOW, standort: 'alle' }).rows).toHaveLength(5);
    const d = sightingsByClass(db, { days: 7, nowMs: NOW });
    expect(d.standort).toBe(1);
    expect(d.rows).toHaveLength(5);
  });
});
