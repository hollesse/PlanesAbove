// @vitest-environment node
// Real path: startService writes the config location/radius/place as the observation point of each sighting (sighting-log-k4m7q).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { parseConfig } from '../../../src/server/config';
import { startService } from '../../../src/server/app';

describe('observation point wiring', () => {
  it('a written sighting points at an observation_points row with the config values', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-op-'));
    const scenario = path.join(dir, 's.json');
    const plane = { icao24: 'a', callsign: 'DLH400', typeCode: 'A20N', distanceKm: 5, bearingDeg: 90, altitudeFt: 36000, speedKt: 470 };
    fs.writeFileSync(scenario, JSON.stringify({ name: 't', startTime: '2026-10-27T10:00:00Z', steps: [{ at: 0, planes: [plane] }] }));
    const config = parseConfig(`mode: mock\nscenario: ${scenario}\nport: 0\ndataDir: ${path.join(dir, 'data')}\nlocation: { lat: 48.123456, lon: 7.654321 }\nplace: Oberweyer\nradiusKm: 25\nspeech: { adapter: fake }\npollIntervalSeconds: 10\n`);
    const svc = await startService({ config, clientDir: path.join(dir, 'client'), write: () => undefined, timeZone: 'UTC' });
    await fetch(`http://127.0.0.1:${svc.port}/mock/advance`, { method: 'POST', body: JSON.stringify({ seconds: 10 }) });
    await svc.stop();
    const db = new Database(path.join(dir, 'data', 'planesabove.db'), { readonly: true });
    const row = db.prepare('SELECT p.lat, p.lon, p.radius_km AS r, p.place FROM sightings s JOIN observation_points p ON p.id = s.observation_point_id').get();
    expect(row).toEqual({ lat: 48.1235, lon: 7.6543, r: 25, place: 'Oberweyer' });
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
