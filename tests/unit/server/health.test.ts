// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { evaluateHealth, type HealthInput } from '../../../src/server/health';

const POLL = 30_000;
const base = (o: Partial<HealthInput> = {}): HealthInput => ({ now: 1_000_000, bootAt: 0, pollIntervalMs: POLL, flightMaxAgeMs: 3 * POLL, flight: { lastSuccessAt: 990_000, lastTickAt: 990_000, consecutiveFailures: 0, lastErrorClass: null }, dbWritable: true, lastClientPollAt: 995_000, clientSilenceMs: 600_000, ...o });

describe('evaluateHealth (ADR 0011)', () => {
  it('ok when fresh', () => { expect(evaluateHealth(base())).toMatchObject({ status: 'ok', reasons: [] }); });
  it('degraded (not failing) when the flight source is older than 3 Takte - a zero-aircraft success still counts as fresh', () => {
    const r = evaluateHealth(base({ flight: { lastSuccessAt: 900_000, lastTickAt: 990_000, consecutiveFailures: 3, lastErrorClass: 'http-429' } }));
    expect(r.status).toBe('degraded');
    expect(r.reasons).toContain('flight source stale');
  });
  it('degraded when no client polled for the silence window', () => {
    expect(evaluateHealth(base({ lastClientPollAt: 100_000 })).status).toBe('degraded');
  });
  it('gives the client a grace period after boot', () => {
    expect(evaluateHealth(base({ now: 100_000, bootAt: 0, lastClientPollAt: null, flight: { lastSuccessAt: 90_000, lastTickAt: 90_000, consecutiveFailures: 0, lastErrorClass: null } })).status).toBe('ok');
  });
  it('failing when the database is not writable or the scheduler is stuck', () => {
    expect(evaluateHealth(base({ dbWritable: false })).status).toBe('failing');
    expect(evaluateHealth(base({ flight: { lastSuccessAt: 990_000, lastTickAt: 700_000, consecutiveFailures: 0, lastErrorClass: null } })).status).toBe('failing');
  });
});
