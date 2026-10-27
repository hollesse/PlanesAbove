// config.yaml parsed with `yaml` and validated with zod at startup; all errors at once (ADR 0007). Secrets come from env only.
import fs from 'node:fs';
import YAML from 'yaml';
import { z } from 'zod';

import { FLIGHT_SOURCE_NAMES } from './modules/airspace/flight-source-names';
const FLIGHTAWARE_DEFAULTS = { timeoutMs: 8000, monthlyBudgetUsd: 4.5, monthlyRequestCap: 900, usageSyncMinutes: 30, usageLagMinutes: 15, billingPeriodStartDay: 1 };
const PLAUSIBILITY_DEFAULTS = { corridorBaseKm: 50, corridorPercent: 5, originZoneKm: 60, destinationZoneKm: 80, minHeadingCheckAltitudeM: 3000, maxHeadingDeviationDeg: 65, maxClimbDistanceKm: 250, climbMetersPerKm: 120, descentMetersPerKm: 80, profileSlackM: 600 };
const ROUTE_DEFAULTS = { enabled: true, order: ['adsbdb' as const, 'vrs' as const], adsbdb: { timeoutMs: 5000, backoffMinutes: 5 }, timeoutMs: 300000, snapshotRefreshHours: 24, cacheTtlHours: 6, negativeTtlMinutes: 10, compareAll: false, flightaware: FLIGHTAWARE_DEFAULTS, plausibility: PLAUSIBILITY_DEFAULTS };

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
    flight: z.object({
      /** Per-source request timeout; the chain then moves on to the next source in the same Takt (ADR 0019). */
      timeoutMs: z.number().int().positive().default(5000),
      /** Failover order; names without an adapter yet are skipped with a warning at start. */
      order: z.array(z.enum(FLIGHT_SOURCE_NAMES)).min(1).default([...FLIGHT_SOURCE_NAMES]),
      /** adsb.lol allows 500 requests/day; stay below it (airspace-b9r4w). UTC day. */
      adsbLol: z.object({ dailyRequestCap: z.number().int().positive().default(400) }).default({ dailyRequestCap: 400 }),
    }).default({ timeoutMs: 5000, order: [...FLIGHT_SOURCE_NAMES], adsbLol: { dailyRequestCap: 400 } }),
    route: z.object({
      enabled: z.boolean().default(true),
      /** Source order: adsbdb live lookup first, offline VRS snapshot as fallback (ADR 0016). */
      order: z.array(z.enum(['vrs', 'adsbdb', 'flightaware'])).min(1).default(['adsbdb', 'vrs']),
      adsbdb: z.object({
        timeoutMs: z.number().int().positive().default(5000),
        /** adsbdb is skipped this long after an HTTP 429. */
        backoffMinutes: z.number().positive().default(5),
      }).default({ timeoutMs: 5000, backoffMinutes: 5 }),
      /** Timeout for the snapshot download. */
      timeoutMs: z.number().int().positive().default(300000),
      /** How often the VRS snapshot is re-downloaded. */
      snapshotRefreshHours: z.number().positive().default(24),
      cacheTtlHours: z.number().positive().default(6),
      negativeTtlMinutes: z.number().positive().default(10),
      /** Ask every source (not just until the first plausible hit) so conflicts between sources can be recorded; costs extra requests. */
      compareAll: z.boolean().default(false),
      /** Plausibility of a source's route against own observation (airspace-p8w2k, ADR 0005 #3). */
      plausibility: z.object({
        corridorBaseKm: z.number().positive().default(50),
        corridorPercent: z.number().positive().default(5),
        originZoneKm: z.number().positive().default(60),
        destinationZoneKm: z.number().positive().default(80),
        minHeadingCheckAltitudeM: z.number().positive().default(3000),
        maxHeadingDeviationDeg: z.number().positive().max(180).default(65),
        maxClimbDistanceKm: z.number().positive().default(250),
        climbMetersPerKm: z.number().positive().default(120),
        descentMetersPerKm: z.number().positive().default(80),
        profileSlackM: z.number().positive().default(600),
      }).default(PLAUSIBILITY_DEFAULTS),
      /** FlightAware AeroAPI: paid, opt-in last resort with a hard budget (ADR 0018). Only active when listed in `order` and FLIGHTAWARE_API_KEY is set in the environment (never here). */
      flightaware: z.object({
        timeoutMs: z.number().int().positive().default(8000),
        monthlyBudgetUsd: z.number().positive().default(4.5),
        monthlyRequestCap: z.number().int().positive().default(900),
        /** Usage-sync interval; AeroAPI usage data lags up to 10 minutes, so never sync less often than every 30. */
        usageSyncMinutes: z.number().int().min(1).max(30).default(30),
        /** Window in which own calls are added on top of the last synced total (the usage endpoint lags). */
        usageLagMinutes: z.number().positive().default(15),
        /** Day of month (UTC) the billing period starts on; check against the AeroAPI portal. */
        billingPeriodStartDay: z.number().int().min(1).max(28).default(1),
      }).default(FLIGHTAWARE_DEFAULTS),
    }).default(ROUTE_DEFAULTS),
  }).default({ userAgent: 'PlanesAbove/0.1 (self-hosted, single household)', flight: { timeoutMs: 5000, order: [...FLIGHT_SOURCE_NAMES], adsbLol: { dailyRequestCap: 400 } }, route: ROUTE_DEFAULTS }),
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
  /** Slot-Haltezeit (ADR 0017): a plane keeps its slot at least this many Takte unless it leaves the radius/data. */
  scene: z.object({ slotHoldTakte: z.number().int().positive().default(3) }).default({ slotHoldTakte: 3 }),
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
