// /healthz evaluation (ADR 0011): ok | degraded | failing, judged per source; only `failing` is HTTP 503.
export interface HealthInput {
  now: number;
  bootAt: number;
  pollIntervalMs: number;
  flight: { lastSuccessAt: number | null; lastTickAt: number | null; consecutiveFailures: number; lastErrorClass: string | null };
  dbWritable: boolean;
  lastClientPollAt: number | null;
  clientSilenceMs: number;
  /** Flight-source freshness threshold; computed once by `flightMaxAgeMs(config)` (src/server/config.ts). */
  flightMaxAgeMs: number;
}

export interface HealthReport {
  status: 'ok' | 'degraded' | 'failing';
  reasons: string[];
  flight: { lastSuccessAt: number | null; ageSeconds: number | null; consecutiveFailures: number; lastErrorClass: string | null };
  client: { lastPollAt: number | null; ageSeconds: number | null };
  db: { writable: boolean };
}

export function evaluateHealth(i: HealthInput): HealthReport {
  const failing: string[] = [];
  const degraded: string[] = [];
  if (!i.dbWritable) failing.push('database not writable');
  const lastTick = i.flight.lastTickAt ?? i.bootAt;
  if (i.now - lastTick > 5 * i.pollIntervalMs) failing.push('poll scheduler has not ticked');
  const maxAge = i.flightMaxAgeMs;
  const flightAge = i.flight.lastSuccessAt === null ? null : i.now - i.flight.lastSuccessAt;
  if (flightAge === null ? i.now - i.bootAt > maxAge : flightAge > maxAge) degraded.push('flight source stale');
  const sinceClient = i.now - (i.lastClientPollAt ?? i.bootAt);
  if (i.now - i.bootAt > i.clientSilenceMs && sinceClient > i.clientSilenceMs) degraded.push('no client poll');
  const secs = (ms: number | null): number | null => (ms === null ? null : Math.round(ms / 1000));
  return {
    status: failing.length ? 'failing' : degraded.length ? 'degraded' : 'ok',
    reasons: [...failing, ...degraded],
    flight: { lastSuccessAt: i.flight.lastSuccessAt, ageSeconds: secs(flightAge), consecutiveFailures: i.flight.consecutiveFailures, lastErrorClass: i.flight.lastErrorClass },
    client: { lastPollAt: i.lastClientPollAt, ageSeconds: i.lastClientPollAt === null ? null : secs(i.now - i.lastClientPollAt) },
    db: { writable: i.dbWritable },
  };
}
