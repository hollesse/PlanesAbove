// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseConfig, ConfigError, flightMaxAgeMs } from '../../../src/server/config';

const MIN = 'location:\n  lat: 50.05\n  lon: 8.57\n';

describe('flightMaxAgeMs (shared by scene and /healthz, ADR 0011)', () => {
  it('defaults to 3 x pollIntervalSeconds', () => { expect(flightMaxAgeMs(parseConfig(MIN))).toBe(90_000); expect(flightMaxAgeMs(parseConfig(MIN + 'pollIntervalSeconds: 10\n'))).toBe(30_000); });
  it('health.flightMaxAgeSeconds overrides the default', () => { expect(flightMaxAgeMs(parseConfig(MIN + 'health: { flightMaxAgeSeconds: 45 }\n'))).toBe(45_000); });
});

describe('parseConfig (ADR 0007)', () => {
  it('applies defaults to a minimal config', () => {
    const c = parseConfig(MIN);
    expect(c).toMatchObject({ mode: 'live', radiusKm: 30, pollIntervalSeconds: 30, speech: { adapter: 'piper', voice: 'de_DE-thorsten-medium' }, sky: { time: 'day', weather: 'clear' }, liveries: { enabled: true } });
  });
  it('reports every problem at once with the key path', () => {
    try {
      parseConfig('radiusKm: -1\nspeech:\n  adapter: espeak\n');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      const msg = (e as Error).message;
      expect(msg).toContain('location');
      expect(msg).toContain('radiusKm');
      expect(msg).toContain('speech.adapter');
    }
  });
  it('requires a scenario in mock mode', () => {
    expect(() => parseConfig(`${MIN}mode: mock\n`)).toThrow(/scenario/);
    expect(parseConfig(`${MIN}mode: mock\nscenario: scenarios/empty.json\n`).mode).toBe('mock');
  });
  it('rejects unparsable YAML readably', () => {
    expect(() => parseConfig('location: [unclosed')).toThrow(ConfigError);
  });
});

describe('sources.route (ADR 0014)', () => {
  it('defaults to order [hexdb, adsbdb, vrs] with a 24h snapshot refresh (ADR 0016)', () => {
    expect(parseConfig(MIN).sources.route).toMatchObject({ order: ['hexdb', 'adsbdb', 'vrs'], snapshotRefreshHours: 24, hexdb: { timeoutMs: 5000, backoffMinutes: 5 }, adsbdb: { timeoutMs: 5000, backoffMinutes: 5 } });
  });
  it('keeps [vrs] valid and validates the adsbdb timeout/backoff', () => {
    expect(parseConfig(MIN + 'sources: { route: { order: [vrs] } }\n').sources.route.order).toEqual(['vrs']);
    for (const bad of ['0', '-1', '"x"']) {
      expect(() => parseConfig(MIN + `sources: { route: { adsbdb: { timeoutMs: ${bad} } } }\n`)).toThrow(/adsbdb\.timeoutMs/);
      expect(() => parseConfig(MIN + `sources: { route: { adsbdb: { backoffMinutes: ${bad} } } }\n`)).toThrow(/adsbdb\.backoffMinutes/);
    }
  });
  it('accepts hexdb in the order and validates hexdb timeout/backoff', () => {
    expect(parseConfig(MIN + 'sources: { route: { order: [vrs, hexdb] } }\n').sources.route.order).toEqual(['vrs', 'hexdb']);
    for (const bad of [0, -1]) {
      expect(() => parseConfig(MIN + `sources: { route: { hexdb: { timeoutMs: ${bad} } } }\n`)).toThrow(/hexdb\.timeoutMs/);
      expect(() => parseConfig(MIN + `sources: { route: { hexdb: { backoffMinutes: ${bad} } } }\n`)).toThrow(/hexdb\.backoffMinutes/);
    }
  });
  it('accepts vrs and adsbdb, rejects anything else (e.g. adsblol)', () => {
    expect(parseConfig(MIN + 'sources: { route: { order: [vrs, adsbdb] } }\n').sources.route.order).toEqual(['vrs', 'adsbdb']);
    expect(() => parseConfig(MIN + 'sources: { route: { order: [adsblol] } }\n')).toThrow(/sources\.route\.order/);
  });
  it('requires a positive refresh interval', () => {
    expect(() => parseConfig(MIN + 'sources: { route: { snapshotRefreshHours: 0 } }\n')).toThrow(/snapshotRefreshHours/);
  });
});

describe('scene.slotHoldTakte (ADR 0017)', () => {
  it('defaults to 3', () => { expect(parseConfig(MIN).scene.slotHoldTakte).toBe(3); });
  it('accepts a positive integer', () => { expect(parseConfig(MIN + 'scene: { slotHoldTakte: 5 }\n').scene.slotHoldTakte).toBe(5); });
  it('rejects 0, negatives, decimals and non-numbers', () => {
    for (const bad of ['0', '-2', '2.5', '"x"']) expect(() => parseConfig(MIN + `scene: { slotHoldTakte: ${bad} }\n`)).toThrow(/scene\.slotHoldTakte/);
  });
});
