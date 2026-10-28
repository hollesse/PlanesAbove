// @vitest-environment node
// `commit` (from GIT_SHA) is reported in /healthz and the startup log; buildId stays the client-asset hash (ADR 0008/0011).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseConfig } from '../../../src/server/config';
import { startService, type Service } from '../../../src/server/app';

let svc: Service | undefined;
let dir: string;
afterEach(async () => { await svc?.stop(); svc = undefined; fs.rmSync(dir, { recursive: true, force: true }); });

async function boot(env: Record<string, string | undefined>) {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-commit-'));
  fs.mkdirSync(path.join(dir, 'client'));
  fs.writeFileSync(path.join(dir, 'client', 'build-id.txt'), 'hash123\n');
  const scenario = path.join(dir, 's.json');
  fs.writeFileSync(scenario, JSON.stringify({ name: 't', startTime: '2026-10-27T10:00:00Z', steps: [{ at: 0, planes: [] }] }));
  const config = parseConfig(`mode: mock\nscenario: ${scenario}\nport: 0\ndataDir: ${path.join(dir, 'data')}\nlocation: { lat: 50.05, lon: 8.57 }\nspeech: { adapter: fake }\n`);
  const lines: string[] = [];
  svc = await startService({ config, clientDir: path.join(dir, 'client'), write: (l) => lines.push(l), timeZone: 'UTC', env });
  const url = `http://127.0.0.1:${svc.port}`;
  const health = (await (await fetch(url + '/healthz')).json()) as { commit: string; buildId: string };
  const state = (await (await fetch(url + '/api/state')).json()) as { buildId?: string };
  return { health, state, lines };
}

describe('commit field', () => {
  it('reports GIT_SHA in /healthz and the service started log', async () => {
    const { health, lines } = await boot({ GIT_SHA: 'abc123' });
    expect(health.commit).toBe('abc123');
    const started = lines.map((l) => JSON.parse(l)).find((l) => l.msg === 'service started' || l.message === 'service started');
    expect(JSON.stringify(started)).toContain('"commit":"abc123"');
  });
  it('falls back to "dev" when GIT_SHA is missing or empty', async () => {
    expect((await boot({})).health.commit).toBe('dev');
    await svc?.stop(); svc = undefined; fs.rmSync(dir, { recursive: true, force: true });
    expect((await boot({ GIT_SHA: '' })).health.commit).toBe('dev');
  });
  it('keeps buildId as the client hash regardless of GIT_SHA', async () => {
    const a = await boot({ GIT_SHA: 'aaa' });
    await svc?.stop(); svc = undefined; fs.rmSync(dir, { recursive: true, force: true });
    const b = await boot({ GIT_SHA: 'bbb' });
    expect(a.health.buildId).toBe('hash123');
    expect(b.health.buildId).toBe('hash123');
    if (a.state.buildId !== undefined) expect(a.state.buildId).toBe('hash123');
  });
});
