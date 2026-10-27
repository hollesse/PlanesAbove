// FlightSource chain with failover and per-source backoff (ADR 0019). One Takt asks the first *available* source;
// on failure the next one is asked in the same Takt. Only when all fail does the Takt fail (stale rule unchanged).
import type { Clock } from '../../clock';
import type { Logger } from '../../logger';
import { SourceError, type FlightSource, type Flugzeug, type LatLon } from './model';

import { FLIGHT_SOURCE_NAMES, type FlightSourceName } from './flight-source-names';
export { FLIGHT_SOURCE_NAMES, type FlightSourceName };

export const BREAKER_THRESHOLD = 3;
export const BREAKER_BASE_MS = 30_000;
export const BREAKER_MAX_MS = 300_000;

export interface SourceState { name: string; state: 'ok' | 'backoff' | 'blocked'; until: number | null; consecutiveFailures: number; lastErrorClass: string | null }
export interface ChainStatus { active: string | null; sources: SourceState[] }

interface Entry { source: FlightSource; failures: number; blockedUntil: number; kind: 'backoff' | 'blocked'; lastErrorClass: string | null }

export class FlightSourceChain implements FlightSource {
  readonly name = 'chain';
  private readonly entries: Entry[];
  private active: string | null = null;
  private readonly jitter: () => number;

  /** `jitter` returns a factor applied to breaker pauses (default 1.0-1.2); tests inject `() => 1`. */
  constructor(sources: FlightSource[], private readonly d: { clock: Clock; log: Logger; jitter?: () => number }) {
    this.entries = sources.map((source) => ({ source, failures: 0, blockedUntil: 0, kind: 'backoff', lastErrorClass: null }));
    this.jitter = d.jitter ?? (() => 1 + Math.random() * 0.2);
  }

  /** Block a source until `now + ms` (e.g. fed by a daily budget, airspace-b9r4w). */
  blockFor(name: string, ms: number, kind: 'backoff' | 'blocked' = 'blocked'): void {
    const e = this.entries.find((x) => x.source.name === name);
    if (e) { e.blockedUntil = this.d.clock.now() + ms; e.kind = kind; }
  }

  status(): ChainStatus {
    const now = this.d.clock.now();
    return {
      active: this.active,
      sources: this.entries.map((e) => {
        const blocked = e.blockedUntil > now;
        return { name: e.source.name, state: blocked ? e.kind : 'ok', until: blocked ? e.blockedUntil : null, consecutiveFailures: e.failures, lastErrorClass: e.lastErrorClass };
      }),
    };
  }

  async fetchAircraft(center: LatLon, radiusKm: number): Promise<Flugzeug[]> {
    const { clock, log } = this.d;
    let last: SourceError | undefined;
    for (const e of this.entries) {
      if (e.blockedUntil > clock.now()) continue;
      try {
        const aircraft = await e.source.fetchAircraft(center, radiusKm);
        e.failures = 0; e.blockedUntil = 0; e.lastErrorClass = null;
        if (this.active !== e.source.name) { log.info('flight source active', { from: this.active, to: e.source.name }); this.active = e.source.name; }
        return aircraft;
      } catch (err) {
        const se = err instanceof SourceError ? err : new SourceError('network', (err as Error)?.message);
        last = se;
        this.recordFailure(e, se);
      }
    }
    throw last ?? new SourceError('unavailable', 'all flight sources are blocked');
  }

  private recordFailure(e: Entry, err: SourceError): void {
    const now = this.d.clock.now();
    e.failures++;
    e.lastErrorClass = err.errorClass;
    if (err.retryAfterMs !== undefined) {
      e.blockedUntil = now + err.retryAfterMs; e.kind = 'blocked';
      this.d.log.warn('flight source blocked', { source: e.source.name, errorClass: err.errorClass, pauseSeconds: Math.round(err.retryAfterMs / 1000), failures: e.failures });
    } else if (e.failures >= BREAKER_THRESHOLD) {
      const pause = Math.min(BREAKER_BASE_MS * 2 ** (e.failures - BREAKER_THRESHOLD), BREAKER_MAX_MS);
      const ms = Math.min(Math.round(pause * this.jitter()), BREAKER_MAX_MS);
      e.blockedUntil = now + ms; e.kind = 'backoff';
      this.d.log.warn('flight source in backoff', { source: e.source.name, errorClass: err.errorClass, pauseSeconds: Math.round(ms / 1000), failures: e.failures });
    }
  }
}

/** Build the chain from `sources.flight.order`; names without a registered adapter are skipped with a warning. */
export function buildFlightSourceChain(order: readonly FlightSourceName[], adapters: Partial<Record<FlightSourceName, FlightSource>>, d: { clock: Clock; log: Logger; jitter?: () => number }): FlightSourceChain {
  const sources: FlightSource[] = [];
  for (const name of order) {
    const a = adapters[name];
    if (a) sources.push(a); else d.log.warn('flight source in sources.flight.order has no adapter yet: skipped', { source: name });
  }
  if (sources.length === 0) throw new Error('sources.flight.order contains no available flight source adapter');
  return new FlightSourceChain(sources, d);
}
