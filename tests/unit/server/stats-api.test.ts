// @vitest-environment node
// GET /api/stats/routes and /api/stats/liveries: same results as the evaluation functions, validation, text format, read-only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { parseConfig } from '../../../src/server/config';
import { startService, type Service } from '../../../src/server/app';
import { formatLiveryStats, liveryStats } from '../../../src/server/modules/sighting-log/livery-stats';
import { formatRouteStats, routeStats } from '../../../src/server/modules/sighting-log/route-stats';

const START = Date.parse('2026-10-27T10:00:00Z');
let svc: Service | undefined;
let dir: string;
afterEach(async () => { await svc?.stop(); svc = undefined; fs.rmSync(dir, { recursive: true, force: true }); });

async function boot() {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-stats-api-'));
  fs.mkdirSync(path.join(dir, 'client'));
  fs.writeFileSync(path.join(dir, 'client', 'build-id.txt'), 'h\n');
  const scenario = path.join(dir, 's.json');
  fs.writeFileSync(scenario, JSON.stringify({ name: 't', startTime: '2026-10-27T10:00:00Z', steps: [{ at: 0, planes: [] }] }));
  const config = parseConfig(`mode: mock\nscenario: ${scenario}\nport: 0\ndataDir: ${path.join(dir, 'data')}\nlocation: { lat: 50.05, lon: 8.57 }\nspeech: { adapter: fake }\n`);
  svc = await startService({ config, clientDir: path.join(dir, 'client'), write: () => {}, timeZone: 'UTC', env: {} });
  const file = path.join(dir, 'data', 'planesabove.db');
  const raw = new Database(file);
  // the service registered its own observation point (id 1) at boot (migration 0006)
  expect(raw.prepare('SELECT COUNT(*) n FROM observation_points WHERE id = 1').get()).toEqual({ n: 1 });
  const ins = raw.prepare("INSERT INTO sightings (icao24, callsign, airline, typklasse, livery_present, route, route_source, closest_distance_km, first_seen_at, last_seen_at, last_seen_ms, slot, observation_point_id) VALUES (?, ?, ?, 'narrow', 0, ?, ?, 1, ?, ?, ?, 1, ?)");
  const t = START - 60_000;
  const iso = new Date(t).toISOString();
  const sid = (icao: string, cs: string, airline: string, route: string | null, src: string | null, pid: number | null, at = t): number => Number(ins.run(icao, cs, airline, route, src, new Date(at).toISOString(), new Date(at).toISOString(), at, pid).lastInsertRowid);
  const a = sid('a', 'UAE1', 'Emirates', 'A → B', 'vrs', 1);
  const b = sid('b', 'DLH2', 'Lufthansa', null, null, 1);
  const c = sid('c', 'SXS3', 'SunExpress', 'C → D', 'hexdb', null, t - 1000); // older, so the default Standort (newest sighting) is point 1
  const lk = raw.prepare('INSERT INTO route_lookups (sighting_id, source, outcome, conflict, chosen, looked_up_at) VALUES (?, ?, ?, ?, ?, ?)');
  lk.run(a, 'vrs', 'hit', 1, 1, iso); lk.run(a, 'adsbdb', 'hit', 1, 0, iso);
  lk.run(b, 'vrs', 'unknown', 0, 0, iso); lk.run(b, 'adsbdb', 'unknown', 0, 0, iso); lk.run(b, 'hexdb', 'unavailable', 0, 0, iso);
  lk.run(c, 'hexdb', 'hit', 0, 1, iso);
  const counts = () => Object.fromEntries((raw.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map(({ name }) => [name, (raw.prepare(`SELECT COUNT(*) n FROM "${name}"`).get() as { n: number }).n]));
  return { url: `http://127.0.0.1:${svc.port}`, raw, counts };
}

describe('stats API', () => {
  it('routes: 200 JSON equal to routeStats for the same data and options', async () => {
    const { url, raw } = await boot();
    const r = await fetch(`${url}/api/stats/routes?days=1`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('application/json');
    const hasPoints = Boolean(raw.prepare("SELECT 1 FROM sqlite_master WHERE name='observation_points'").get());
    const expected = routeStats(raw, { days: 1, nowMs: START, hasPoints });
    expect(expected.sources.length).toBeGreaterThanOrEqual(3);
    expect(expected.sources.some((x) => x.chosen > 0 && x.hit > 0)).toBe(true);
    expect(expected.sources.some((x) => x.unknown > 0)).toBe(true);
    expect(expected.conflicts.length).toBeGreaterThan(0);
    expect(await r.json()).toEqual(JSON.parse(JSON.stringify(expected)));
  });
  it('liveries: 200 JSON equal to liveryStats', async () => {
    const { url, raw } = await boot();
    const r = await fetch(`${url}/api/stats/liveries?days=1`);
    expect(r.status).toBe(200);
    const hasPoints = Boolean(raw.prepare("SELECT 1 FROM sqlite_master WHERE name='observation_points'").get());
    expect(await r.json()).toEqual(JSON.parse(JSON.stringify(liveryStats(raw, { days: 1, nowMs: START, hasPoints }))));
  });
  it('standort alle / unbekannt / id are evaluated like the script; invalid input is 400', async () => {
    const { url, raw } = await boot();
    const hasPoints = true;
    for (const s of ['alle', 'unbekannt', '1']) {
      const body = await (await fetch(`${url}/api/stats/routes?days=1&standort=${s}`)).json();
      const f = s === '1' ? 1 : s;
      const expected = routeStats(raw, { days: 1, nowMs: START, standort: f as never, hasPoints });
      expect(body).toEqual(JSON.parse(JSON.stringify(expected)));
      expect(expected.days.reduce((n, d) => n + d.total, 0)).toBe({ alle: 3, unbekannt: 1, '1': 2 }[s]);
    }
    for (const q of ['days=0', 'days=abc', 'days=-3', 'days=1&standort=x', 'days=1&standort=1.5']) {
      for (const ep of ['routes', 'liveries']) {
        const r = await fetch(`${url}/api/stats/${ep}?${q}`);
        expect(r.status, `${ep}?${q}`).toBe(400);
        expect(typeof ((await r.json()) as { error: string }).error).toBe('string');
      }
    }
  });
  it('format=text returns text/plain with the formatted output', async () => {
    const { url, raw } = await boot();
    const hasPoints = true;
    const r = await fetch(`${url}/api/stats/routes?days=1&format=text`);
    expect(r.headers.get('content-type')).toContain('text/plain');
    expect(await r.text()).toBe(formatRouteStats(routeStats(raw, { days: 1, nowMs: START, hasPoints })));
    const l = await fetch(`${url}/api/stats/liveries?days=1&format=text`);
    expect(l.headers.get('content-type')).toContain('text/plain');
    expect(await l.text()).toBe(formatLiveryStats(liveryStats(raw, { days: 1, nowMs: START, hasPoints })));
  });
  it('writes nothing to the database', async () => {
    const { url, counts } = await boot();
    const before = counts();
    for (const q of ['routes?days=1', 'liveries?days=1', 'routes?days=1&format=text', 'routes?days=x']) await (await fetch(`${url}/api/stats/${q}`)).text();
    expect(counts()).toEqual(before);
  });
});
