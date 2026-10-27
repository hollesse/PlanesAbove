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
    expect(c).toMatchObject({ mode: 'live', radiusKm: 30, pollIntervalSeconds: 30, speech: { adapter: 'piper', voice: 'de_DE-thorsten' }, sky: { time: 'day', weather: 'clear' }, liveries: { enabled: false } });
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
