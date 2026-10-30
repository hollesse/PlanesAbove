// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PiperSpeechSynthesizer } from '../../../src/server/modules/sky-scene/piper-speech';
import { FakeSpeechSynthesizer } from '../../../src/server/modules/sky-scene/fake-speech';
import { AudioService } from '../../../src/server/modules/sky-scene/audio-service';
import { SpeechError } from '../../../src/server/modules/sky-scene/speech';
import { makeSilentWav, pcmToWav, wavDurationMs } from '../../../src/server/modules/sky-scene/wav';
import { silentLogger } from '../../../src/server/logger';
import { ElevenLabsSpeechSynthesizer } from '../../../src/server/modules/sky-scene/elevenlabs-speech';
import { SpeechUsage } from '../../../src/server/modules/sky-scene/speech-usage';
import { buildSpeechSetup } from '../../../src/server/modules/sky-scene/speech-setup';
import { parseConfig } from '../../../src/server/config';
import { openDatabase } from '../../../src/server/db';
import { FakeClock } from '../../../src/server/clock';
import type { Fetch } from '../../../src/server/modules/airspace/adapters/http';

// Fixture recorded from the running Piper sidecar (piper-tts 1.8.0, de_DE-thorsten-medium) - see tests/fixtures/piper-sample.wav.origin.txt
const wavFixture = new Uint8Array(fs.readFileSync(new URL('../../fixtures/piper-sample.wav', import.meta.url)));
const reply = (status: number, bytes: Uint8Array): Fetch => async () => ({ ok: status < 300, status, text: async () => '', arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer });
const piper = (f: Fetch, t = 1000) => new PiperSpeechSynthesizer({ fetch: f, endpoint: 'http://tts:5000', timeoutMs: t });
const kind = (p: Promise<unknown>) => p.catch((e: SpeechError) => e.kind);

describe('wav helpers', () => {
  it('round-trips the duration of a silent clip', () => { expect(wavDurationMs(makeSilentWav(1500))).toBe(1500); });
  it('pcmToWav round-trips: duration = bytes / (2 * sampleRate)', () => {
    const wav = pcmToWav(new Uint8Array(44100), 22050); // 22050 samples = 1 s
    expect(wavDurationMs(wav)).toBe(1000);
    expect(wav.length).toBe(44 + 44100);
  });
  it('rejects non-WAV bytes', () => { expect(wavDurationMs(new Uint8Array([1, 2, 3]))).toBeUndefined(); });
});

describe('PiperSpeechSynthesizer contract', () => {
  it('POSTs text and voice and returns audio with its duration', async () => {
    let seen: { url?: string; body?: string } = {};
    const f: Fetch = async (url, init) => { seen = { url, body: init?.body }; return reply(200, wavFixture)(url, init); };
    const r = await piper(f).synthesize('Hallo Welt.', 'de_DE-thorsten-medium');
    expect(seen.url).toBe('http://tts:5000/synthesize');
    expect(JSON.parse(seen.body!)).toEqual({ text: 'Hallo Welt.', voice: 'de_DE-thorsten-medium' });
    expect(r).toMatchObject({ mimeType: 'audio/wav' });
    expect(r.durationMs).toBeGreaterThan(500);
    expect(r.durationMs).toBeLessThan(3000);
  });
  it('tolerates a trailing slash on the endpoint', async () => {
    let url = '';
    const f: Fetch = async (u, init) => { url = u; return reply(200, wavFixture)(u, init); };
    await new PiperSpeechSynthesizer({ fetch: f, endpoint: 'http://tts:5000/', timeoutMs: 1000 }).synthesize('x', 'v');
    expect(url).toBe('http://tts:5000/synthesize');
  });
  it('maps failures to typed errors: 5xx/network/garbage unavailable, 404 bad-voice, 429 quota-exceeded', async () => {
    expect(await kind(piper(reply(500, new Uint8Array())).synthesize('x', 'v'))).toBe('unavailable');
    expect(await kind(piper(reply(200, new Uint8Array([1, 2, 3]))).synthesize('x', 'v'))).toBe('unavailable');
    expect(await kind(piper(async () => { throw new TypeError('fetch failed'); }).synthesize('x', 'v'))).toBe('unavailable');
    expect(await kind(piper(reply(404, new Uint8Array())).synthesize('x', 'v'))).toBe('bad-voice');
    expect(await kind(piper(reply(429, new Uint8Array())).synthesize('x', 'v'))).toBe('quota-exceeded');
  });
  it('maps a hanging sidecar to unavailable (timeout)', async () => {
    const hang: Fetch = (_u, i) => new Promise((_r, rej) => i?.signal?.addEventListener('abort', () => rej(i.signal!.reason)));
    expect(await kind(piper(hang, 20).synthesize('x', 'v'))).toBe('unavailable');
  });
});

describe('FakeSpeechSynthesizer', () => {
  it('returns a clip of the scenario-controlled length or the scripted failure', async () => {
    expect((await new FakeSpeechSynthesizer(() => ({ durationMs: 1200 })).synthesize()).durationMs).toBe(1200);
    expect(await kind(new FakeSpeechSynthesizer(() => ({ durationMs: 1, failure: 'quota-exceeded' })).synthesize())).toBe('quota-exceeded');
  });
});

describe('AudioService', () => {
  const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pa-audio-'));
  const counting = () => { let calls = 0; const s = new FakeSpeechSynthesizer(() => { calls++; return { durationMs: 500 }; }); return { s, calls: () => calls }; };
  it('lazy mode synthesizes on first request only and serves the cache afterwards', async () => {
    const c = counting();
    const svc = new AudioService(c.s, { voice: 'v', render: 'lazy', cacheDir: dir(), log: silentLogger });
    const { audioUrl } = svc.register('Hallo');
    expect(c.calls()).toBe(0);
    const key = audioUrl.replace('/audio/', '').replace('.wav', '');
    expect((await svc.get(key))!.length).toBeGreaterThan(44);
    await svc.get(key);
    expect(c.calls()).toBe(1);
    expect(svc.register('Hallo').durationMs).toBe(500);
  });
  it('logs a successful synthesis (adapter, voice, duration) so the operator can verify the sidecar', async () => {
    const lines: Array<{ msg: string; f?: Record<string, unknown> }> = [];
    const log = { ...silentLogger, info: (msg: string, f?: Record<string, unknown>) => { lines.push({ msg, f }); } };
    const svc = new AudioService(new FakeSpeechSynthesizer(() => ({ durationMs: 700 })), { voice: 'v', render: 'lazy', log });
    await svc.get(svc.register('Hallo').audioUrl.replace('/audio/', '').replace('.wav', ''));
    expect(lines).toEqual([{ msg: 'speech synthesized', f: { source: 'tts', adapter: 'fake', voice: 'v', durationMs: 700 } }]);
  });
  it('eager mode starts rendering at registration', async () => {
    const c = counting();
    const svc = new AudioService(c.s, { voice: 'v', render: 'eager', log: silentLogger });
    const { audioUrl } = svc.register('Hallo');
    await svc.get(audioUrl.replace('/audio/', '').replace('.wav', ''));
    expect(c.calls()).toBe(1);
  });
  it('keys differ by voice and text; an unknown key or a failed synthesis yields undefined', async () => {
    const a = new AudioService(new FakeSpeechSynthesizer(), { voice: 'a', render: 'lazy', log: silentLogger });
    const b = new AudioService(new FakeSpeechSynthesizer(), { voice: 'b', render: 'lazy', log: silentLogger });
    expect(a.keyFor('x')).not.toBe(b.keyFor('x'));
    expect(a.keyFor('x')).not.toBe(a.keyFor('y'));
    expect(await a.get('nope')).toBeUndefined();
    const failing = new AudioService(new FakeSpeechSynthesizer(() => ({ durationMs: 1, failure: 'unavailable' })), { voice: 'a', render: 'lazy', log: silentLogger });
    const k = failing.register('x').audioUrl.replace('/audio/', '').replace('.wav', '');
    expect(await failing.get(k)).toBeUndefined();
  });
});

describe('ElevenLabsSpeechSynthesizer contract', () => {
  const pcm = new Uint8Array(22050 * 2 * 2); // 2 s of pcm_22050
  const el = (f: Fetch, t = 1000) => new ElevenLabsSpeechSynthesizer({ fetch: f, apiKey: 'k-secret', modelId: 'eleven_flash_v2_5', outputFormat: 'pcm_22050', timeoutMs: t });
  it('POSTs xi-api-key, model_id and output_format; wraps PCM into a WAV with the right duration', async () => {
    let seen: { url?: string; init?: Parameters<Fetch>[1] } = {};
    const f: Fetch = async (url, init) => { seen = { url, init }; return reply(200, pcm)(url, init); };
    const r = await el(f).synthesize('Hallo', 'VOICE1');
    expect(seen.url).toBe('https://api.elevenlabs.io/v1/text-to-speech/VOICE1?output_format=pcm_22050');
    expect(seen.init?.headers?.['xi-api-key']).toBe('k-secret');
    expect(JSON.parse(seen.init!.body!)).toEqual({ text: 'Hallo', model_id: 'eleven_flash_v2_5' });
    expect(r.mimeType).toBe('audio/wav');
    expect(r.durationMs).toBe(2000);
    expect(wavDurationMs(r.audio)).toBe((pcm.length / (2 * 22050)) * 1000);
  });
  it('maps errors: 401 unavailable (key warning), 429/402 quota-exceeded, 404/422 bad-voice, 5xx/network/empty unavailable', async () => {
    const warns: string[] = [];
    const log = { ...silentLogger, warn: (m: string) => { warns.push(m); } };
    const withLog = new ElevenLabsSpeechSynthesizer({ fetch: reply(401, new Uint8Array()), apiKey: 'k', modelId: 'm', outputFormat: 'pcm_22050', timeoutMs: 1000, log });
    expect(await kind(withLog.synthesize('x', 'v'))).toBe('unavailable');
    expect(warns.join()).toContain('ELEVENLABS_API_KEY');
    expect(await kind(el(reply(429, new Uint8Array())).synthesize('x', 'v'))).toBe('quota-exceeded');
    expect(await kind(el(reply(402, new Uint8Array())).synthesize('x', 'v'))).toBe('quota-exceeded');
    expect(await kind(el(reply(422, new Uint8Array())).synthesize('x', 'v'))).toBe('bad-voice');
    expect(await kind(el(reply(404, new Uint8Array())).synthesize('x', 'v'))).toBe('bad-voice');
    expect(await kind(el(reply(503, new Uint8Array())).synthesize('x', 'v'))).toBe('unavailable');
    expect(await kind(el(reply(200, new Uint8Array())).synthesize('x', 'v'))).toBe('unavailable');
    expect(await kind(el(async () => { throw new TypeError('fetch failed'); }).synthesize('x', 'v'))).toBe('unavailable');
  });
  it('maps a hanging API to unavailable (timeout)', async () => {
    const hang: Fetch = (_u, i) => new Promise((_r, rej) => i?.signal?.addEventListener('abort', () => rej(i.signal!.reason)));
    expect(await kind(el(hang, 20).synthesize('x', 'v'))).toBe('unavailable');
  });
});

describe('AudioService with primary budget and fallback (sky-scene-t6h2p)', () => {
  const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pa-audio-'));
  const keyOf = (url: string) => url.replace('/audio/', '').replace('.wav', '');
  const named = (name: string, behaviour: () => { durationMs: number; failure?: 'unavailable' | 'quota-exceeded' | 'bad-voice' } = () => ({ durationMs: 500 })) => {
    const inner = new FakeSpeechSynthesizer(behaviour); let calls = 0;
    return { name, calls: () => calls, synthesize: async (t: string, v: string) => { calls++; return inner.synthesize(); } } as import('../../../src/server/modules/sky-scene/speech').SpeechSynthesizer & { calls(): number };
  };
  const setup = (budget: number, primary = named('elevenlabs'), cacheDir = dir(), db = openDatabase(':memory:')) => {
    const clock = new FakeClock(Date.parse('2026-10-15T10:00:00Z'));
    const fallback = named('piper');
    const usage = new SpeechUsage(db, clock);
    const svc = new AudioService(primary, { voice: 'EV', render: 'lazy', cacheDir, log: silentLogger, fallback: { synth: fallback, voice: 'PV' }, budget: { usage, monthlyCharacterBudget: budget } });
    return { svc, primary, fallback, usage, cacheDir, db, clock };
  };
  it('budget 100: first 60-char text from ElevenLabs, second from the fallback under the fallback key; counter 60', async () => {
    const { svc, primary, fallback, usage, cacheDir } = setup(100);
    const t1 = 'a'.repeat(60); const t2 = 'b'.repeat(60);
    const u1 = svc.register(t1).audioUrl; const u2 = svc.register(t2).audioUrl;
    expect(await svc.get(keyOf(u1))).toBeDefined();
    expect(await svc.get(keyOf(u2))).toBeDefined();
    expect(primary.calls()).toBe(1); expect(fallback.calls()).toBe(1);
    expect(fs.existsSync(path.join(cacheDir, `${keyOf(u1)}.wav`))).toBe(true);
    expect(fs.existsSync(path.join(cacheDir, `${keyOf(u2)}.wav`))).toBe(false); // primary key stays empty
    const fbKey = fs.readdirSync(cacheDir).filter((f) => f !== `${keyOf(u1)}.wav`);
    expect(fbKey).toHaveLength(1);
    expect(usage.characters()).toBe(60);
    await svc.get(keyOf(u2)); // fallback cache hit, no second render
    expect(fallback.calls()).toBe(1);
  });
  it('quota-exceeded from the primary delivers fallback audio', async () => {
    const { svc, fallback } = setup(1000, named('elevenlabs', () => ({ durationMs: 1, failure: 'quota-exceeded' })));
    expect(await svc.get(keyOf(svc.register('Hallo').audioUrl))).toBeDefined();
    expect(fallback.calls()).toBe(1);
  });
  it('the month counter survives a restart (new AudioService over the same SQLite) and resets next month', async () => {
    const a = setup(100);
    await a.svc.get(keyOf(a.svc.register('x'.repeat(60)).audioUrl));
    const b = setup(100, named('elevenlabs'), dir(), a.db);
    expect(b.usage.characters()).toBe(60);
    await b.svc.get(keyOf(b.svc.register('y'.repeat(60)).audioUrl));
    expect(b.fallback.calls()).toBe(1); // 60 + 60 > 100 across the restart
    a.clock.advance(20 * 24 * 3600_000);
    expect(new SpeechUsage(a.db, a.clock).characters()).toBe(0);
  });
  it('cache key contains the adapter name and the voice', () => {
    const e = new AudioService(named('elevenlabs'), { voice: 'v', render: 'lazy', log: silentLogger });
    const p = new AudioService(named('piper'), { voice: 'v', render: 'lazy', log: silentLogger });
    const e2 = new AudioService(named('elevenlabs'), { voice: 'w', render: 'lazy', log: silentLogger });
    expect(e.keyFor('x')).not.toBe(p.keyFor('x'));
    expect(e.keyFor('x')).not.toBe(e2.keyFor('x'));
  });
  it('first fallback of a month logs warn, later ones info; syntheses log charactersUsedThisMonth', async () => {
    const lines: Array<[string, string, Record<string, unknown> | undefined]> = [];
    const log = { ...silentLogger, info: (m: string, f?: Record<string, unknown>) => { lines.push(['info', m, f]); }, warn: (m: string, f?: Record<string, unknown>) => { lines.push(['warn', m, f]); } };
    const s = setup(10);
    const svc = new AudioService(s.primary, { voice: 'EV', render: 'lazy', log, fallback: { synth: s.fallback, voice: 'PV' }, budget: { usage: s.usage, monthlyCharacterBudget: 10 } });
    await svc.get(keyOf(svc.register('a'.repeat(20)).audioUrl));
    await svc.get(keyOf(svc.register('b'.repeat(20)).audioUrl));
    expect(lines.filter((l) => l[1].includes('falling back')).map((l) => l[0])).toEqual(['warn', 'info']);
    expect(lines.find((l) => l[1] === 'speech synthesized')![2]).toMatchObject({ adapter: 'piper', charactersUsedThisMonth: 0 });
  });
});

describe('buildSpeechSetup (ELEVENLABS_API_KEY from env only)', () => {
  const MIN = 'location: { lat: 50, lon: 8 }\n';
  const base = { fetch: reply(200, new Uint8Array()), db: openDatabase(':memory:'), clock: new FakeClock(0) };
  it('adapter elevenlabs without key: warn mentioning ELEVENLABS_API_KEY and the fallback serves audio', async () => {
    const warns: string[] = [];
    const log = { ...silentLogger, warn: (m: string) => { warns.push(m); } };
    const setup = buildSpeechSetup({ ...base, config: parseConfig(MIN + 'speech: { adapter: elevenlabs }\n'), env: {}, log, fetch: reply(200, wavFixture) });
    expect(warns.join()).toContain('ELEVENLABS_API_KEY');
    expect(setup.synth.name).toBe('piper');
    expect(setup.voice).toBe('de_DE-thorsten-medium');
    expect(setup.fallback).toBeUndefined();
    expect((await setup.synth.synthesize('x', setup.voice)).durationMs).toBeGreaterThan(0);
  });
  it('with a key: elevenlabs primary, piper fallback, budget from config', () => {
    const setup = buildSpeechSetup({ ...base, config: parseConfig(MIN + 'speech: { adapter: elevenlabs }\n'), env: { ELEVENLABS_API_KEY: 'k' }, log: silentLogger });
    expect(setup.synth.name).toBe('elevenlabs');
    expect(setup.fallback?.synth.name).toBe('piper');
    expect(setup.budget?.monthlyCharacterBudget).toBe(9000);
  });
  it('adapter piper needs no key and has neither fallback nor budget', () => {
    const setup = buildSpeechSetup({ ...base, config: parseConfig(MIN), env: {}, log: silentLogger });
    expect(setup).toMatchObject({ synth: { name: 'piper' }, voice: 'de_DE-thorsten-medium' });
    expect(setup.fallback).toBeUndefined(); expect(setup.budget).toBeUndefined();
  });
});
