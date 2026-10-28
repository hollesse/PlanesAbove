// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { openDatabase, LATEST_SCHEMA_VERSION } from '../../../src/server/db';
import { SightingRepository, type ObservationPoint, type SightingInput } from '../../../src/server/modules/sighting-log/repository';
import migration0001 from '../../../src/server/migrations/0001-sightings';
import migration0002 from '../../../src/server/migrations/0002-route-source';
import migration0003 from '../../../src/server/migrations/0003-route-lookups';
import migration0004 from '../../../src/server/migrations/0004-flightaware-calls';
import migration0005 from '../../../src/server/migrations/0005-flight-source-calls';

const MIN = 60_000;
const A: ObservationPoint = { lat: 50.1234, lon: 8.5678, radiusKm: 30, place: 'Frankfurt' };
const B: ObservationPoint = { lat: 48.0, lon: 7.8, radiusKm: 30, place: 'Oberweyer' };
const input = (over: Partial<SightingInput> = {}): SightingInput => ({ icao24: 'x', callsign: 'DLH400', typklasse: 'narrow', liveryPresent: false, distanceKm: 8, route: null, slot: 1, ...over });
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 'p.db');
const points = (db: ReturnType<typeof openDatabase>) => db.prepare('SELECT * FROM observation_points ORDER BY id').all() as any[];

describe('migration 0006', () => {
  it('adds observation_points and a NULL observation_point_id to existing sightings, idempotently', () => {
    const file = tmp();
    const raw = new Database(file);
    [migration0001, migration0002, migration0003, migration0004, migration0005].forEach((m) => raw.exec(m));
    raw.pragma('user_version = 5');
    raw.exec("INSERT INTO sightings (icao24, typklasse, livery_present, closest_distance_km, first_seen_at, last_seen_at, last_seen_ms) VALUES ('old','narrow',0,3,'t','t',1)");
    raw.close();
    const db = openDatabase(file);
    expect(db.pragma('user_version', { simple: true })).toBe(LATEST_SCHEMA_VERSION);
    expect(db.prepare('SELECT observation_point_id AS p FROM sightings').all()).toEqual([{ p: null }]);
    expect(() => db.exec("INSERT INTO observation_points (lat, lon, radius_km, place, first_used_at) VALUES (1,2,3,'a','t'),(1,2,3,'b','t')")).toThrow(/UNIQUE/);
    db.close();
    const again = openDatabase(file);
    expect(again.pragma('user_version', { simple: true })).toBe(LATEST_SCHEMA_VERSION);
    expect(again.prepare('SELECT COUNT(*) AS n FROM sightings').get()).toEqual({ n: 1 });
  });
});

describe('SightingRepository observation point', () => {
  it('find-or-creates one point, rounding to 4 decimals; other coords or radius create a new one; place only relabels', () => {
    const db = openDatabase(':memory:');
    new SightingRepository(db, MIN, { ...A, lat: 50.123449 });
    const first = points(db)[0].first_used_at;
    new SightingRepository(db, MIN, { ...A, lat: 50.12341 });
    expect(points(db)).toHaveLength(1);
    new SightingRepository(db, MIN, { ...A, radiusKm: 40 });
    new SightingRepository(db, MIN, B);
    expect(points(db)).toHaveLength(3);
    new SightingRepository(db, MIN, { ...A, place: 'Neu' });
    expect(points(db)).toHaveLength(3);
    expect(points(db)[0]).toMatchObject({ place: 'Neu', lat: 50.1234, first_used_at: first });
  });
  it('a location change ends the visit; the old row keeps its closest distance', () => {
    const db = openDatabase(':memory:');
    expect(new SightingRepository(db, 30 * MIN, A).observe(input({ distanceKm: 5 }), 0)).toBe('new');
    expect(new SightingRepository(db, 30 * MIN, B).observe(input({ distanceKm: 1 }), MIN)).toBe('new');
    const rows = db.prepare('SELECT observation_point_id AS p, closest_distance_km AS d FROM sightings ORDER BY id').all() as any[];
    expect(rows).toHaveLength(2);
    expect(rows[0].p).not.toBe(rows[1].p);
    expect(rows[0].d).toBe(5);
  });
  it('same point continues the visit (hydrate); NULL rows are never hydrated', () => {
    const db = openDatabase(':memory:');
    new SightingRepository(db, 30 * MIN, A).observe(input(), 0);
    expect(new SightingRepository(db, 30 * MIN, A).observe(input(), MIN)).toBe('seen');
    expect(db.prepare('SELECT COUNT(*) AS n FROM sightings').get()).toEqual({ n: 1 });
    db.exec("INSERT INTO sightings (icao24, typklasse, livery_present, closest_distance_km, first_seen_at, last_seen_at, last_seen_ms) VALUES ('n','narrow',0,3,'t','t',0)");
    expect(new SightingRepository(db, 30 * MIN, A).observe(input({ icao24: 'n' }), MIN)).toBe('new');
  });
  it('recordLookup and latest only see rows of the current point', () => {
    const db = openDatabase(':memory:');
    const ra = new SightingRepository(db, 30 * MIN, A); ra.observe(input(), 0);
    const rb = new SightingRepository(db, 30 * MIN, B);
    expect(rb.latest()).toBeUndefined();
    rb.recordLookup('x', [{ source: 'vrs', outcome: 'hit' }], false, 'vrs', 1);
    expect(db.prepare('SELECT COUNT(*) AS n FROM route_lookups').get()).toEqual({ n: 0 });
    ra.recordLookup('x', [{ source: 'vrs', outcome: 'hit' }], false, 'vrs', 1);
    expect(db.prepare('SELECT COUNT(*) AS n FROM route_lookups').get()).toEqual({ n: 1 });
    expect(ra.latest()?.icao24).toBe('x');
  });
});

describe('stats:routes --standort', () => {
  const NOW = Date.now();
  const seed = (withPoints = true) => {
    const file = tmp();
    const db = openDatabase(file);
    db.exec(`INSERT INTO sightings (icao24, typklasse, livery_present, closest_distance_km, first_seen_at, last_seen_at, last_seen_ms, slot) VALUES ('u1','n',0,1,'${new Date(NOW - 5000).toISOString()}','t',${NOW - 5000},1), ('u2','n',0,1,'${new Date(NOW - 4000).toISOString()}','t',${NOW - 4000},1)`);
    new SightingRepository(db, MIN, A).observe(input({ icao24: 'a1' }), NOW - 3000);
    new SightingRepository(db, MIN, B).observe(input({ icao24: 'b1' }), NOW - 2000);
    new SightingRepository(db, MIN, B).observe(input({ icao24: 'b2' }), NOW - 1000);
    db.close();
    if (!withPoints) { /* pre-0006 shape is built in its own test */ }
    return file;
  };
  const cli = (...args: string[]) => spawnSync(process.execPath, [path.resolve(import.meta.dirname, '../../../scripts/stats-routes.mjs'), ...args], { encoding: 'utf8' });
  const total = (f: string, ...a: string[]) => { const j = JSON.parse(cli('--db', f, '--json', ...a).stdout); return { j, n: j.days.reduce((s: number, d: any) => s + d.total, 0) }; };
  it('defaults to the newest sighting\'s point; id, unbekannt and alle override; overview lists all groups', () => {
    const f = seed();
    const def = total(f);
    expect(def.n).toBe(2);
    expect(def.j.standort).toBe(2);
    expect(def.j.standorte.map((s: any) => [s.id, s.sightings])).toEqual([[1, 1], [2, 2], [null, 2]]);
    expect(total(f, '--standort', '1').n).toBe(1);
    expect(total(f, '--standort', 'unbekannt').n).toBe(2);
    expect(total(f, '--standort', 'alle').n).toBe(5);
    const text = cli('--db', f).stdout;
    expect(text).toContain('Standort-Filter: 2');
    expect(text).toContain('unbekannt  2 Sichtungen');
    expect(text).toContain('Oberweyer');
  });
  it('rejects an invalid --standort; a pre-0006 database yields only the unbekannt group', () => {
    const f = seed();
    const bad = cli('--db', f, '--standort', 'nope');
    expect(bad.status).not.toBe(0);
    expect(bad.stderr).toContain('--standort');
    const old = tmp();
    const raw = new Database(old);
    [migration0001, migration0002, migration0003].forEach((m) => raw.exec(m));
    raw.exec(`INSERT INTO sightings (icao24, typklasse, livery_present, closest_distance_km, first_seen_at, last_seen_at, last_seen_ms, slot) VALUES ('o','n',0,1,'${new Date(NOW).toISOString()}','t',${NOW},1)`);
    raw.close();
    const r = cli('--db', old, '--json');
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).standorte).toEqual([{ id: null, place: null, lat: null, lon: null, radiusKm: null, sightings: 1 }]);
  });
});
