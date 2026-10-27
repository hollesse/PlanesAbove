// @vitest-environment node
// The scene (/api/state) and /healthz must flip at the same moment, driven by the ONE shared threshold (ADR 0011).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseConfig } from '../../../src/server/config';
import { startService, type Service } from '../../../src/server/app';

let svc: Service | undefined;
let dir: string;
afterEach(async () => { await svc?.stop(); svc = undefined; fs.rmSync(dir, { recursive: true, force: true }); });

async function boot(steps: object[], extra: string) {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-stale-'));
  const scenario = path.join(dir, 's.json');
  fs.writeFileSync(scenario, JSON.stringify({ name: 't', startTime: '2026-10-27T10:00:00Z', steps }));
  const config = parseConfig(`mode: mock\nscenario: ${scenario}\nport: 0\ndataDir: ${path.join(dir, 'data')}\nlocation: { lat: 50.05, lon: 8.57 }\nspeech: { adapter: fake }\npollIntervalSeconds: 10\n${extra}`);
  svc = await startService({ config, clientDir: path.join(dir, 'client'), write: () => undefined, timeZone: 'UTC' });
  const url = `http://127.0.0.1:${svc.port}`;
  return {
    advance: (seconds: number) => fetch(url + '/mock/advance', { method: 'POST', body: JSON.stringify({ seconds }) }),
    view: async () => {
      const stale = ((await (await fetch(url + '/api/state')).json()) as { stale: boolean }).stale;
      const health = (await (await fetch(url + '/healthz')).json()) as { reasons: string[] };
      return { stale, degraded: health.reasons.includes('flight source stale') };
    },
  };
}
const plane = { icao24: 'a', callsign: 'DLH400', typeCode: 'A20N', distanceKm: 5, bearingDeg: 90, altitudeFt: 36000, speedKt: 470 };
const outage = [{ at: 0, planes: [plane] }, { at: 10, failure: 'http-429' }];

describe('scene and /healthz share one flight-source threshold', () => {
  it('health.flightMaxAgeSeconds: both fine at N s without success, both flip at N+1 s', async () => {
    const s = await boot(outage, 'health: { flightMaxAgeSeconds: 25 }');
    await s.advance(25);
    expect(await s.view()).toEqual({ stale: false, degraded: false });
    await s.advance(1);
    expect(await s.view()).toEqual({ stale: true, degraded: true });
  });
  it('default 3 x pollIntervalSeconds: both fine at 30 s, both flip at 31 s', async () => {
    const s = await boot(outage, '');
    await s.advance(30);
    expect(await s.view()).toEqual({ stale: false, degraded: false });
    await s.advance(1);
    expect(await s.view()).toEqual({ stale: true, degraded: true });
  });
  it('no success since boot: both flip once the threshold has passed since boot', async () => {
    const s = await boot([{ at: 0, failure: 'network' }], '');
    await s.advance(30);
    expect(await s.view()).toEqual({ stale: false, degraded: false });
    await s.advance(1);
    expect(await s.view()).toEqual({ stale: true, degraded: true });
  });
});
