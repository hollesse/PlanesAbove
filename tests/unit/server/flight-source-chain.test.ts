// @vitest-environment node
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../src/server/clock';
import { createLogger } from '../../../src/server/logger';
import { buildFlightSourceChain, FlightSourceChain } from '../../../src/server/modules/airspace/flight-source-chain';
import { SourceError, type FlightSource, type Flugzeug } from '../../../src/server/modules/airspace/model';
import { retryAfterMs, type Fetch } from '../../../src/server/modules/airspace/adapters/http';
import { AdsbLolFlightSource } from '../../../src/server/modules/airspace/adapters/adsb-lol';
import { parseConfig } from '../../../src/server/config';

const C = { lat: 50, lon: 8 };
const plane = { icao24: 'a' } as Flugzeug;
class Fake implements FlightSource {
  calls = 0;
  constructor(readonly name: string, public behaviour: () => Flugzeug[] = () => [plane]) {}
  async fetchAircraft(): Promise<Flugzeug[]> { this.calls++; return this.behaviour(); }
}
const fail = (cls: 'http-5xx' | 'http-429' | 'timeout', retry?: number) => () => { throw new SourceError(cls, undefined, retry); };
function setup(...sources: FlightSource[]) {
  const clock = new FakeClock(1_000_000);
  const lines: { level: string; msg: string; [k: string]: unknown }[] = [];
  const log = createLogger(clock, 'debug', (l) => lines.push(JSON.parse(l)));
  return { clock, lines, chain: new FlightSourceChain(sources, { clock, log, jitter: () => 1 }) };
}

describe('FlightSourceChain failover', () => {
  it('asks the first source only while it works', async () => {
    const a = new Fake('a'), b = new Fake('b');
    const { chain } = setup(a, b);
    await chain.fetchAircraft(C, 30);
    expect([a.calls, b.calls]).toEqual([1, 0]);
  });
  it('falls through to source 2 in the same Takt and logs the switch', async () => {
    const a = new Fake('a', fail('http-5xx')), b = new Fake('b');
    const { chain, lines } = setup(a, b);
    await expect(chain.fetchAircraft(C, 30)).resolves.toEqual([plane]);
    expect(lines.find((l) => l.msg === 'flight source active')).toMatchObject({ level: 'info', to: 'b' });
    expect(chain.status().active).toBe('b');
  });
  it('fails the Takt only when every source fails', async () => {
    const { chain } = setup(new Fake('a', fail('http-5xx')), new Fake('b', fail('timeout')));
    await expect(chain.fetchAircraft(C, 30)).rejects.toMatchObject({ errorClass: 'timeout' });
  });
  it('throws unavailable when every source is blocked', async () => {
    const { chain } = setup(new Fake('a', fail('http-429', 60_000)));
    await chain.fetchAircraft(C, 30).catch(() => undefined);
    await expect(chain.fetchAircraft(C, 30)).rejects.toMatchObject({ errorClass: 'unavailable' });
  });
  it('a recovered primary is asked again after its pause and takes over', async () => {
    const a = new Fake('a', fail('http-429', 60_000)), b = new Fake('b');
    const { chain, clock } = setup(a, b);
    await chain.fetchAircraft(C, 30);
    await chain.fetchAircraft(C, 30);
    expect(a.calls).toBe(1);
    a.behaviour = () => [plane];
    await clock.advance(60_000);
    await chain.fetchAircraft(C, 30);
    expect(a.calls).toBe(2);
    expect(chain.status().active).toBe('a');
  });
});

describe('FlightSourceChain backoff', () => {
  it('429 with a pause blocks exactly that long and warns', async () => {
    const a = new Fake('a', fail('http-429', 120_000)), b = new Fake('b');
    const { chain, clock, lines } = setup(a, b);
    await chain.fetchAircraft(C, 30);
    expect(lines.some((l) => l.level === 'warn' && l.msg === 'flight source blocked')).toBe(true);
    await clock.advance(119_999); await chain.fetchAircraft(C, 30); expect(a.calls).toBe(1);
    await clock.advance(1); await chain.fetchAircraft(C, 30); expect(a.calls).toBe(2);
  });
  it('breaker: 3 failures -> 30 s, then 60, 120, capped at 300; success resets', async () => {
    const a = new Fake('a', fail('http-5xx')), b = new Fake('b');
    const { chain, clock } = setup(a, b);
    const pauseAfterFailure = async (): Promise<number> => {
      const before = clock.now();
      await chain.fetchAircraft(C, 30);
      const until = chain.status().sources[0].until;
      return until === null ? 0 : until - before;
    };
    expect(await pauseAfterFailure()).toBe(0);
    await clock.advance(1); expect(await pauseAfterFailure()).toBe(0);
    await clock.advance(1);
    const pauses: number[] = [];
    for (let i = 0; i < 6; i++) {
      pauses.push(Math.round((await pauseAfterFailure()) / 1000));
      await clock.advance(300_000);
    }
    expect(pauses).toEqual([30, 60, 120, 240, 300, 300]);
    a.behaviour = () => [plane];
    await chain.fetchAircraft(C, 30);
    expect(chain.status().sources[0]).toMatchObject({ state: 'ok', consecutiveFailures: 0 });
  });
  it('blockFor feeds an external budget', async () => {
    const a = new Fake('a'), b = new Fake('b');
    const { chain } = setup(a, b);
    chain.blockFor('a', 60_000);
    await chain.fetchAircraft(C, 30);
    expect(a.calls).toBe(0);
  });
});

describe('Retry-After / x-ratelimit-reset parsing', () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });
  it('Retry-After seconds', () => expect(retryAfterMs(h({ 'retry-after': '120' }))).toBe(120_000));
  it('Retry-After http date', () => expect(retryAfterMs(h({ 'retry-after': new Date(10_000).toUTCString() }), 0)).toBe(10_000));
  it('x-ratelimit-reset seconds', () => expect(retryAfterMs(h({ 'x-ratelimit-reset': '25203' }))).toBe(25_203_000));
  it('none', () => { expect(retryAfterMs(h({}))).toBeUndefined(); expect(retryAfterMs(undefined)).toBeUndefined(); });
  it('adsb.lol 429 with x-ratelimit-reset blocks the chain until then', async () => {
    const f: Fetch = async () => ({ ok: false, status: 429, headers: h({ 'x-ratelimit-reset': '25203' }), text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) });
    const lol = new AdsbLolFlightSource({ fetch: f, userAgent: 't', timeoutMs: 100 });
    const { chain, clock } = setup(lol, new Fake('b'));
    await chain.fetchAircraft(C, 30);
    expect(chain.status().sources[0]).toMatchObject({ state: 'blocked', until: clock.now() + 25_203_000 });
  });
});

describe('order and config', () => {
  it('default order is adsb-fi, adsb-lol', () => {
    expect(parseConfig('location: { lat: 1, lon: 2 }\n').sources.flight.order).toEqual(['adsb-fi', 'adsb-lol']);
  });
  it('rejects the removed feeder-only source in order', () => {
    const removed = ['air', 'planes-live'].join('');
    expect(() => parseConfig(`location: { lat: 1, lon: 2 }\nsources: { flight: { order: [${removed}] } }\n`)).toThrow(/sources\.flight\.order/);
  });
  it('rejects unknown source names', () => {
    expect(() => parseConfig('location: { lat: 1, lon: 2 }\nsources: { flight: { order: [opensky] } }\n')).toThrow(/sources\.flight\.order/);
  });
  it('skips names without a registered adapter with a warning', () => {
    const clock = new FakeClock(0);
    const lines: { level: string; msg: string; source?: string }[] = [];
    const log = createLogger(clock, 'debug', (l) => lines.push(JSON.parse(l)));
    const chain = buildFlightSourceChain(['adsb-fi', 'opensky' as never, 'adsb-lol'], { 'adsb-fi': new Fake('adsb-fi'), 'adsb-lol': new Fake('adsb-lol') }, { clock, log });
    expect(chain.status().sources.map((s) => s.name)).toEqual(['adsb-fi', 'adsb-lol']);
    expect(lines.find((l) => l.level === 'warn')).toMatchObject({ source: 'opensky' });
  });
});

describe('attribution (adsb.fi terms: cite adsb.fi and link its home page)', () => {
  it('README names adsb.fi with a link', () => {
    const readme = fs.readFileSync(new URL('../../../README.md', import.meta.url), 'utf8');
    expect(readme).toContain('Data: [adsb.fi](https://adsb.fi)');
  });
});
