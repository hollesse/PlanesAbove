// config.yaml parsed with `yaml` and validated with zod at startup; all errors at once (ADR 0007). Secrets come from env only.
import fs from 'node:fs';
import YAML from 'yaml';
import { z } from 'zod';

const ROUTE_DEFAULTS = { enabled: true, order: ['vrs' as const], timeoutMs: 300000, snapshotRefreshHours: 24, cacheTtlHours: 6, negativeTtlMinutes: 10 };

const schema = z.object({
  mode: z.enum(['live', 'mock']).default('live'),
  scenario: z.string().optional(),
  port: z.number().int().min(0).max(65535).default(8080),
  location: z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }),
  /** Shown as "Der Himmel über <place>"; never the exact address if you do not want to. */
  place: z.string().default('dem Haus'),
  radiusKm: z.number().positive().max(463).default(30),
  pollIntervalSeconds: z.number().positive().default(30),
  dataDir: z.string().default('./data'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  /** Placeholder sky until the weather module exists (ADR 0006 stretch). */
  sky: z.object({
    time: z.enum(['dawn', 'day', 'dusk', 'night']).default('day'),
    weather: z.enum(['clear', 'light', 'overcast', 'fog', 'rain', 'snow', 'storm']).default('clear'),
  }).default({ time: 'day', weather: 'clear' }),
  /** Skeleton: only the white Standard-Lackierung is shown unless enabled. */
  liveries: z.object({ enabled: z.boolean().default(false) }).default({ enabled: false }),
  sources: z.object({
    userAgent: z.string().default('PlanesAbove/0.1 (self-hosted, single household)'),
    flight: z.object({ timeoutMs: z.number().int().positive().default(8000) }).default({ timeoutMs: 8000 }),
    route: z.object({
      enabled: z.boolean().default(true),
      /** Source order; only the offline VRS standing-data snapshot (default) and the optional online adsbdb lookup (ADR 0014). */
      order: z.array(z.enum(['vrs', 'adsbdb'])).min(1).default(['vrs']),
      /** Timeout for the snapshot download. */
      timeoutMs: z.number().int().positive().default(300000),
      /** How often the VRS snapshot is re-downloaded. */
      snapshotRefreshHours: z.number().positive().default(24),
      cacheTtlHours: z.number().positive().default(6),
      negativeTtlMinutes: z.number().positive().default(10),
    }).default(ROUTE_DEFAULTS),
  }).default({ userAgent: 'PlanesAbove/0.1 (self-hosted, single household)', flight: { timeoutMs: 8000 }, route: ROUTE_DEFAULTS }),
  speech: z.object({
    adapter: z.enum(['piper', 'fake']).default('piper'),
    voice: z.string().default('de_DE-thorsten'),
    endpoint: z.string().default('http://tts:5000'),
    render: z.enum(['eager', 'lazy']).default('eager'),
    timeoutMs: z.number().int().positive().default(15000),
  }).default({ adapter: 'piper', voice: 'de_DE-thorsten', endpoint: 'http://tts:5000', render: 'eager', timeoutMs: 15000 }),
  client: z.object({
    pollIntervalSeconds: z.number().positive().default(10),
    staleAfterMinutes: z.number().positive().default(5),
    reloadAt: z.string().regex(/^\d{2}:\d{2}$/).default('04:00'),
    speechWatchdogSeconds: z.number().positive().default(60),
  }).default({ pollIntervalSeconds: 10, staleAfterMinutes: 5, reloadAt: '04:00', speechWatchdogSeconds: 60 }),
  sightings: z.object({ visitGapMinutes: z.number().positive().default(30) }).default({ visitGapMinutes: 30 }),
  health: z.object({
    flightMaxAgeSeconds: z.number().positive().optional(),
    clientSilenceMinutes: z.number().positive().default(10),
  }).default({ clientSilenceMinutes: 10 }),
}).refine((c) => c.mode !== 'mock' || Boolean(c.scenario), { path: ['scenario'], message: 'required when mode is "mock"' });

export type Config = z.infer<typeof schema>;

/** The one shared freshness threshold for the flight source: scene staleness and /healthz `degraded` (ADR 0011). Default 3 Takte. */
export const flightMaxAgeMs = (c: Pick<Config, 'pollIntervalSeconds' | 'health'>): number => (c.health.flightMaxAgeSeconds ?? 3 * c.pollIntervalSeconds) * 1000;

export class ConfigError extends Error {}

export function parseConfig(yamlText: string): Config {
  let raw: unknown;
  try { raw = YAML.parse(yamlText) ?? {}; } catch (e) { throw new ConfigError(`config: cannot parse YAML: ${(e as Error).message}`); }
  const r = schema.safeParse(raw);
  if (!r.success) throw new ConfigError('Invalid configuration:\n' + r.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n'));
  return r.data;
}

export function loadConfig(file: string): Config {
  if (!fs.existsSync(file)) throw new ConfigError(`Config file not found: ${file} (set CONFIG_PATH, see config.example.yaml)`);
  return parseConfig(fs.readFileSync(file, 'utf8'));
}
