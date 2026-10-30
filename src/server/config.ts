// config.yaml parsed with `yaml` and validated with zod at startup; all errors at once (ADR 0007). Secrets come from env only.
import fs from 'node:fs';
import YAML from 'yaml';
import { z } from 'zod';

import { DEFAULT_CLOSED_AIRSPACES } from './modules/airspace/closed-airspace';
import { FLIGHT_SOURCE_NAMES } from './modules/airspace/flight-source-names';
const FLIGHTAWARE_DEFAULTS = { timeoutMs: 8000, monthlyBudgetUsd: 4.5, monthlyRequestCap: 900, usageSyncMinutes: 30, usageLagMinutes: 15, billingPeriodStartDay: 1 };
const PLAUSIBILITY_DEFAULTS = { corridorBaseKm: 50, corridorPercent: 8, corridorMaxKm: 150, originZoneKm: 60, destinationZoneKm: 80, minHeadingCheckAltitudeM: 3000, maxHeadingDeviationDeg: 65, maxClimbDistanceKm: 400, climbMetersPerKm: 150, descentMetersPerKm: 80, profileSlackM: 1500, phaseMaxAltitudeM: 8000, phaseMinRateMs: 5, detourHeadingDeviationDeg: 90, closedAirspaceSampleKm: 100, closedAirspaces: DEFAULT_CLOSED_AIRSPACES };
const ROUTE_DEFAULTS = { enabled: true, order: ['hexdb' as const, 'adsbdb' as const, 'vrs' as const], hexdb: { timeoutMs: 5000, backoffMinutes: 5 }, adsbdb: { timeoutMs: 5000, backoffMinutes: 5 }, timeoutMs: 300000, snapshotRefreshHours: 24, cacheTtlHours: 6, negativeTtlMinutes: 10, compareAll: false, flightaware: FLIGHTAWARE_DEFAULTS, plausibility: PLAUSIBILITY_DEFAULTS };

/** Piper model in the tts image. */
const PIPER_VOICE = 'de_DE-thorsten-medium';
/** ElevenLabs premade library voice "Rachel" (multilingual models speak German with it). Unverified without an API key: the operator confirms by listening. */
export const ELEVENLABS_DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM';

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
  liveries: z.object({ enabled: z.boolean().default(true) }).default({ enabled: true }),
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
    /** Live cross-check of the aircraft type per hex against hexdb (airspace-t4x9k); results memory-only. Backoff after 429 is route.hexdb.backoffMinutes (same host). */
    aircraftType: z.object({
      hexdb: z.object({
        enabled: z.boolean().default(true),
        /** Short on purpose: the lookup runs inside the Takt before the selection is shown. */
        timeoutMs: z.number().int().positive().default(2000),
        cacheTtlHours: z.number().positive().default(24),
      }).default({ enabled: true, timeoutMs: 2000, cacheTtlHours: 24 }),
    }).default({ hexdb: { enabled: true, timeoutMs: 2000, cacheTtlHours: 24 } }),
    route: z.object({
      enabled: z.boolean().default(true),
      /** Source order: hexdb, then adsbdb live lookups, offline VRS snapshot as fallback (ADR 0016, amendment 2026-10-27). */
      order: z.array(z.enum(['vrs', 'adsbdb', 'hexdb', 'flightaware'])).min(1).default(['hexdb', 'adsbdb', 'vrs']),
      hexdb: z.object({
        timeoutMs: z.number().int().positive().default(5000),
        /** hexdb is skipped this long after an HTTP 429. */
        backoffMinutes: z.number().positive().default(5),
      }).default({ timeoutMs: 5000, backoffMinutes: 5 }),
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
        corridorPercent: z.number().positive().default(8),
        corridorMaxKm: z.number().positive().default(150),
        originZoneKm: z.number().positive().default(60),
        destinationZoneKm: z.number().positive().default(80),
        minHeadingCheckAltitudeM: z.number().positive().default(3000),
        maxHeadingDeviationDeg: z.number().positive().max(180).default(65),
        maxClimbDistanceKm: z.number().positive().default(400),
        climbMetersPerKm: z.number().positive().default(150),
        descentMetersPerKm: z.number().positive().default(80),
        profileSlackM: z.number().positive().default(1500),
        phaseMaxAltitudeM: z.number().positive().default(8000),
        phaseMinRateMs: z.number().positive().default(5),
        /** Heading tolerance on a detoured leg (great circle crosses a closed airspace; airspace-v4kqz). */
        detourHeadingDeviationDeg: z.number().positive().max(180).default(90),
        closedAirspaceSampleKm: z.number().positive().default(100),
        /** Replaces the default list entirely (no merge); [] disables detour detection. Corners are [lat, lon]. */
        closedAirspaces: z.array(z.object({
          name: z.string().min(1),
          since: z.string().min(1),
          note: z.string().optional(),
          polygon: z.array(z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)])).min(3),
        })).default(DEFAULT_CLOSED_AIRSPACES),
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
  }).default({ userAgent: 'PlanesAbove/0.1 (self-hosted, single household)', flight: { timeoutMs: 5000, order: [...FLIGHT_SOURCE_NAMES], adsbLol: { dailyRequestCap: 400 } }, aircraftType: { hexdb: { enabled: true, timeoutMs: 2000, cacheTtlHours: 24 } }, route: ROUTE_DEFAULTS }),
  speech: z.object({
    adapter: z.enum(['piper', 'elevenlabs', 'fake']).default('piper'),
    /** Voice of the primary adapter: Piper model name or ElevenLabs voice_id. Default depends on the adapter. */
    voice: z.string().optional(),
    endpoint: z.string().default('http://tts:5000'),
    /** Default: lazy for elevenlabs (every render costs credits), eager otherwise (ADR 0012). */
    render: z.enum(['eager', 'lazy']).optional(),
    timeoutMs: z.number().int().positive().default(15000),
    /** Adapter used when the primary is out of budget, over quota, unreachable or has no key. elevenlabs is not allowed here. */
    fallback: z.enum(['piper', 'fake'], { error: 'must be "piper" or "fake" (elevenlabs cannot be its own fallback)' }).default('piper'),
    /** Voice used with the fallback adapter. */
    fallbackVoice: z.string().default(PIPER_VOICE),
    elevenlabs: z.object({
      modelId: z.string().min(1).default('eleven_flash_v2_5'),
      /** PCM only (wrapped into a WAV; the free plan allows pcm up to 24 kHz). */
      outputFormat: z.string().regex(/^pcm_\d+$/, 'must be a PCM format such as pcm_22050 (mp3 is not supported)').default('pcm_22050'),
      /** Free plan: 10000 credits/month, 1 credit ~ 1 character; keep a reserve. */
      monthlyCharacterBudget: z.number().int().positive().default(9000),
      timeoutMs: z.number().int().positive().default(15000),
    }).default({ modelId: 'eleven_flash_v2_5', outputFormat: 'pcm_22050', monthlyCharacterBudget: 9000, timeoutMs: 15000 }),
  }).default({ adapter: 'piper', endpoint: 'http://tts:5000', timeoutMs: 15000, fallback: 'piper', fallbackVoice: PIPER_VOICE, elevenlabs: { modelId: 'eleven_flash_v2_5', outputFormat: 'pcm_22050', monthlyCharacterBudget: 9000, timeoutMs: 15000 } })
    .transform((s) => ({ ...s, voice: s.voice ?? (s.adapter === 'elevenlabs' ? ELEVENLABS_DEFAULT_VOICE : PIPER_VOICE), render: s.render ?? (s.adapter === 'elevenlabs' ? 'lazy' as const : 'eager' as const) })),
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
