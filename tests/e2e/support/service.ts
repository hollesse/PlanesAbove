// Starts the REAL built service (dist/server/server.mjs) in mock mode with a scenario file, on a free port.
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export interface MockService { url: string; advance(seconds: number): Promise<void>; sightings(): Promise<{ icao24: string; callsign: string | null }[]>; stop(): Promise<void> }

const freePort = (): Promise<number> => new Promise((res, rej) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = (s.address() as net.AddressInfo).port; s.close(() => res(p)); }); s.on('error', rej); });

// freePort() releases the port before the service binds it, so parallel workers can collide (EADDRINUSE); retry on early exit.
export async function startMockService(scenario: string): Promise<MockService> {
  for (let attempt = 1; ; attempt++) {
    try { return await startOnce(scenario); } catch (e) { if (attempt >= 4) throw e; }
  }
}

async function startOnce(scenario: string): Promise<MockService> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-e2e-'));
  const port = await freePort();
  const cfg = path.join(dir, 'config.yaml');
  fs.writeFileSync(cfg, [
    'mode: mock', `scenario: ${path.join(root, 'scenarios', scenario + '.json')}`, `port: ${port}`, `dataDir: ${path.join(dir, 'data')}`,
    'location: { lat: 50.05, lon: 8.57 }', 'place: Testdorf', 'speech: { adapter: fake }',
    'client: { pollIntervalSeconds: 0.2, speechWatchdogSeconds: 10 }',
  ].join('\n'));
  const child: ChildProcess = spawn('node', [path.join(root, 'dist/server/server.mjs')], { env: { ...process.env, CONFIG_PATH: cfg, CLIENT_DIR: path.join(root, 'dist/client') }, stdio: ['ignore', 'ignore', 'inherit'] });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url + '/healthz')).status < 500) break; } catch { /* not up yet */ }
    if (child.exitCode !== null) { fs.rmSync(dir, { recursive: true, force: true }); throw new Error(`service exited with ${child.exitCode}`); }
    await new Promise((r) => setTimeout(r, 100));
  }
  return {
    url,
    advance: async (seconds) => { await fetch(url + '/mock/advance', { method: 'POST', body: JSON.stringify({ seconds }) }); },
    sightings: async () => (await fetch(url + '/mock/sightings')).json(),
    stop: async () => { if (child.exitCode === null) { child.kill('SIGTERM'); const t = setTimeout(() => child.kill('SIGKILL'), 3000); await new Promise((r) => child.once('exit', r)); clearTimeout(t); } fs.rmSync(dir, { recursive: true, force: true }); },
  };
}
