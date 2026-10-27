// Composition root + HTTP surface of the home-server service (ADR 0004). Everything is passed in explicitly (ADR 0007).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { FakeClock, SystemClock, type Scheduler } from './clock';
import { flightMaxAgeMs, type Config } from './config';
import { openDatabase } from './db';
import { evaluateHealth } from './health';
import { createLogger, type Logger } from './logger';
import { loadScenario, ScenarioDriver, ScenarioFlightSource, ScenarioRouteSource } from './mock/scenario';
import { AdsbLolFlightSource } from './modules/airspace/adapters/adsb-lol';
import { AdsbFiFlightSource } from './modules/airspace/adapters/adsb-fi';
import { buildFlightSourceChain, type FlightSourceChain } from './modules/airspace/flight-source-chain';
import type { Fetch } from './modules/airspace/adapters/http';
import { AdsbdbRouteSource } from './modules/airspace/adapters/adsbdb-route-source';
import { FlightAwareRouteSource } from './modules/airspace/adapters/flightaware-route-source';
import { FlightAwareCallLog } from './modules/airspace/flightaware-call-log';
import { VrsRouteSource } from './modules/airspace/adapters/vrs-route-source';
import type { FlightSource, RouteSource } from './modules/airspace/model';
import { RouteService } from './modules/airspace/route-service';
import { defaultTables } from './modules/airspace/typeclass';
import { SightingRepository } from './modules/sighting-log/repository';
import { AudioService } from './modules/sky-scene/audio-service';
import { FakeSpeechSynthesizer } from './modules/sky-scene/fake-speech';
import { PiperSpeechSynthesizer } from './modules/sky-scene/piper-speech';
import { SkyService } from './modules/sky-scene/sky-service';
import type { SpeechSynthesizer } from './modules/sky-scene/speech';

export interface ServiceOptions {
  config: Config;
  /** Directory with index.html + app.js + app.css (default: ./dist/client). */
  clientDir?: string;
  /** Test seam: replaces global fetch for live adapters. */
  fetch?: Fetch;
  /** Logging sink (default stdout). */
  write?: (line: string) => void;
  timeZone?: string;
  /** Environment for secrets (default process.env); FLIGHTAWARE_API_KEY is read only from here, never from config (ADR 0007/0018). */
  env?: Record<string, string | undefined>;
}

export interface Service { port: number; stop(): Promise<void> }

const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon' };

export async function startService(o: ServiceOptions): Promise<Service> {
  const { config } = o;
  const mock = config.mode === 'mock';
  const clientDir = path.resolve(o.clientDir ?? 'dist/client');
  const buildIdFile = path.join(clientDir, 'build-id.txt');
  const buildId = fs.existsSync(buildIdFile) ? fs.readFileSync(buildIdFile, 'utf8').trim() : 'dev';

  // Clock: fake and manually advanced in mock mode (ADR 0004), system clock otherwise.
  let fake: FakeClock | undefined;
  let scheduler: Scheduler;
  let driver: ScenarioDriver | undefined;
  if (mock) {
    const scenario = loadScenario(path.resolve(config.scenario as string));
    fake = new FakeClock(Date.parse(scenario.startTime));
    scheduler = fake;
    driver = new ScenarioDriver(scenario, fake, fake.now());
  } else scheduler = new SystemClock();
  const clock = scheduler;
  const bootAt = clock.now();
  const log: Logger = createLogger(clock, config.logLevel, o.write);

  fs.mkdirSync(config.dataDir, { recursive: true });
  const db = openDatabase(path.join(config.dataDir, 'planesabove.db'));
  const sightings = new SightingRepository(db, config.sightings.visitGapMinutes * 60_000);

  const fetchFn: Fetch = o.fetch ?? ((url, init) => fetch(url, init));
  const ua = config.sources.userAgent;
  let flight: FlightSource;
  let flightChain: FlightSourceChain | undefined;
  let routeSources: RouteSource[];
  let stopSnapshot: (() => void) | undefined;
  let flightaware: FlightAwareRouteSource | undefined;
  let speech: SpeechSynthesizer;
  if (driver) {
    flight = new ScenarioFlightSource(driver);
    routeSources = [new ScenarioRouteSource(driver)];
    speech = new FakeSpeechSynthesizer(() => (driver as ScenarioDriver).current().tts);
  } else {
    const fo = { fetch: fetchFn, userAgent: ua, timeoutMs: config.sources.flight.timeoutMs };
    // airplanes-live (airspace-v6m3h) registers here once its adapter exists.
    flightChain = buildFlightSourceChain(config.sources.flight.order, { 'adsb-fi': new AdsbFiFlightSource(fo), 'adsb-lol': new AdsbLolFlightSource(fo) }, { clock, log });
    flight = flightChain;
    routeSources = [];
    for (const name of config.sources.route.order) {
      if (name === 'flightaware') {
        const apiKey = (o.env ?? process.env).FLIGHTAWARE_API_KEY;
        if (!apiKey) { log.warn('flightaware is in sources.route.order but FLIGHTAWARE_API_KEY is not set: FlightAware disabled'); continue; }
        const f = config.sources.route.flightaware;
        flightaware = new FlightAwareRouteSource({ fetch: fetchFn, apiKey, clock: scheduler, log, calls: new FlightAwareCallLog(db), ...f });
        routeSources.push(flightaware);
      } else if (name === 'adsbdb') {
        const r = config.sources.route.adsbdb;
        routeSources.push(new AdsbdbRouteSource({ fetch: fetchFn, userAgent: ua, timeoutMs: r.timeoutMs, backoffMs: r.backoffMinutes * 60_000, clock, log }));
      } else {
        const vrs = new VrsRouteSource({ fetch: fetchFn, dataDir: config.dataDir, userAgent: ua, timeoutMs: config.sources.route.timeoutMs, clock: scheduler, log, refreshMs: config.sources.route.snapshotRefreshHours * 3_600_000 });
        routeSources.push(vrs);
        if (config.sources.route.enabled) stopSnapshot = vrs.start();
      }
    }
    speech = config.speech.adapter === 'piper' ? new PiperSpeechSynthesizer({ fetch: fetchFn, endpoint: config.speech.endpoint, timeoutMs: config.speech.timeoutMs }) : new FakeSpeechSynthesizer();
  }
  const noRoutes: RouteSource = { name: 'none', lookup: async () => null };
  const routes = new RouteService(config.sources.route.enabled ? routeSources : [noRoutes], clock, { ttlMs: config.sources.route.cacheTtlHours * 3_600_000, negativeTtlMs: config.sources.route.negativeTtlMinutes * 60_000, compareAll: config.sources.route.compareAll, log });
  const audio = new AudioService(speech, { voice: config.speech.voice, render: mock ? 'lazy' : config.speech.render, cacheDir: path.join(config.dataDir, 'audio'), log });
  const sky = new SkyService({ config, clock, log, flight, routes, tables: defaultTables(), sightings, audio, buildId, timeZone: o.timeZone });

  const stopFlightAwareSync = config.sources.route.enabled ? await flightaware?.start() : undefined; // usage sync before the first paid lookup (ADR 0018)

  let lastClientPollAt: number | null = null;
  const pollMs = config.pollIntervalSeconds * 1000;
  const dbWritable = (): boolean => { try { db.prepare('CREATE TABLE IF NOT EXISTS _health (x INTEGER)').run(); db.prepare('DELETE FROM _health').run(); db.prepare('INSERT INTO _health VALUES (1)').run(); return true; } catch { return false; } };

  const json = (res: http.ServerResponse, status: number, body: unknown): void => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(body)); };
  const readBody = (req: http.IncomingMessage): Promise<string> => new Promise((resolve) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => resolve(b)); });

  const serveStatic = (urlPath: string, res: http.ServerResponse): void => {
    const rel = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath).replace(/^\/+/, '');
    const file = path.resolve(clientDir, rel);
    if (!file.startsWith(clientDir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    try {
      if (req.method === 'GET' && url.pathname === '/api/state') { lastClientPollAt = clock.now(); return json(res, 200, sky.state()); }
      if (req.method === 'GET' && url.pathname === '/healthz') {
        const report = evaluateHealth({ now: clock.now(), bootAt, pollIntervalMs: pollMs, flight: sky.health, dbWritable: dbWritable(), lastClientPollAt, clientSilenceMs: config.health.clientSilenceMinutes * 60_000, flightMaxAgeMs: flightMaxAgeMs(config), flightChain: flightChain?.status() });
        return json(res, report.status === 'failing' ? 503 : 200, { ...report, buildId, uptimeSeconds: Math.round((clock.now() - bootAt) / 1000) });
      }
      const audioMatch = /^\/audio\/([0-9a-f]+)\.wav$/.exec(url.pathname);
      if (req.method === 'GET' && audioMatch) {
        const bytes = await audio.get(audioMatch[1]);
        if (!bytes) { res.writeHead(503).end('audio unavailable'); return; }
        res.writeHead(200, { 'content-type': 'audio/wav', 'content-length': bytes.length, 'cache-control': 'max-age=3600' }).end(bytes);
        return;
      }
      if (mock && url.pathname.startsWith('/mock/')) {
        if (req.method === 'POST' && url.pathname === '/mock/advance') {
          const { seconds = 30 } = JSON.parse((await readBody(req)) || '{}') as { seconds?: number };
          await (fake as FakeClock).advance(seconds * 1000);
          return json(res, 200, { now: clock.now() });
        }
        if (req.method === 'GET' && url.pathname === '/mock/sightings') return json(res, 200, sightings.list());
      }
      if (req.method === 'GET') return serveStatic(url.pathname, res);
      res.writeHead(405).end();
    } catch (e) {
      log.error('request failed', { path: url.pathname, errorClass: 'internal', detail: (e as Error).message });
      if (!res.headersSent) res.writeHead(500).end('internal error');
    }
  });

  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(config.port, '0.0.0.0', resolve); });
  const port = (server.address() as { port: number }).port;

  await sky.tick(); // first Takt right away, then every pollIntervalSeconds
  const cancel = scheduler.every(pollMs, () => sky.tick());
  log.info('service started', { port, mode: config.mode, buildId, radiusKm: config.radiusKm });

  return {
    port,
    async stop() {
      cancel();
      stopSnapshot?.();
      stopFlightAwareSync?.();
      await new Promise<void>((r) => server.close(() => r()));
      try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch { /* best effort */ }
      db.close();
    },
  };
}
