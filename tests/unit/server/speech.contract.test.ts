// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PiperSpeechSynthesizer } from '../../../src/server/modules/sky-scene/piper-speech';
import { FakeSpeechSynthesizer } from '../../../src/server/modules/sky-scene/fake-speech';
import { AudioService } from '../../../src/server/modules/sky-scene/audio-service';
import { SpeechError } from '../../../src/server/modules/sky-scene/speech';
import { concatWav, makeSilentWav, pcmToWav, wavDurationMs } from '../../../src/server/modules/sky-scene/wav';
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
    expect(lines).toEqual([{ msg: 'speech synthesized', f: { source: 'tts', adapter: 'fake', voice: 'v', durationMs: 700, parts: 1, partsRendered: 1 } }]);
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
  const body = (status: number, json: unknown): Fetch => async () => ({ ok: false, status, text: async () => typeof json === 'string' ? json : JSON.stringify(json), arrayBuffer: async () => new ArrayBuffer(0) });
  const detail = (code: string, message = 'msg') => ({ detail: { code, message, status: code } });
  it('402 paid_plan_required -> bad-config; message carries status and detail.code; warn line carries status, code and the ElevenLabs message', async () => {
    const warns: Array<[string, Record<string, unknown> | undefined]> = [];
    const log = { ...silentLogger, warn: (m: string, f?: Record<string, unknown>) => { warns.push([m, f]); } };
    const s = new ElevenLabsSpeechSynthesizer({ fetch: body(402, detail('paid_plan_required', 'Free users cannot use library voices via the API.')), apiKey: 'k', modelId: 'm', outputFormat: 'pcm_22050', timeoutMs: 1000, log });
    const err = await s.synthesize('x', 'v').catch((e: SpeechError) => e);
    expect((err as SpeechError).kind).toBe('bad-config');
    expect((err as SpeechError).message).toContain('402');
    expect((err as SpeechError).message).toContain('paid_plan_required');
    expect(warns).toHaveLength(1);
    expect(warns[0][0]).toContain('status=402');
    expect(warns[0][0]).toContain('code=paid_plan_required');
    expect(warns[0][0]).toContain('Free users cannot use library voices via the API.');
    expect(warns[0][0]).toContain('speech.voice');
  });
  it('maps errors: 401/403 bad-config, 401 quota_exceeded and 429 quota-exceeded (status in message), 404/422 bad-voice, 5xx/network/empty unavailable', async () => {
    expect(await kind(el(body(401, detail('invalid_api_key'))).synthesize('x', 'v'))).toBe('bad-config');
    expect(await kind(el(body(403, detail('missing_permissions'))).synthesize('x', 'v'))).toBe('bad-config');
    expect(await kind(el(body(401, detail('quota_exceeded'))).synthesize('x', 'v'))).toBe('quota-exceeded');
    const e429 = await el(body(429, detail('too_many_concurrent_requests'))).synthesize('x', 'v').catch((e: SpeechError) => e);
    expect((e429 as SpeechError).kind).toBe('quota-exceeded');
    expect((e429 as SpeechError).message).toContain('status=429');
    expect(await kind(el(body(422, 'not json')).synthesize('x', 'v'))).toBe('bad-voice');
    expect(await kind(el(body(404, detail('voice_not_found'))).synthesize('x', 'v'))).toBe('bad-voice');
    expect(await kind(el(reply(503, new Uint8Array())).synthesize('x', 'v'))).toBe('unavailable');
    expect(await kind(el(reply(200, new Uint8Array())).synthesize('x', 'v'))).toBe('unavailable');
    expect(await kind(el(async () => { throw new TypeError('fetch failed'); }).synthesize('x', 'v'))).toBe('unavailable');
  });
  it('non-JSON body: first 300 characters end up in the error message', async () => {
    const err = await el(body(402, 'x'.repeat(500))).synthesize('x', 'v').catch((e: SpeechError) => e);
    expect((err as SpeechError).message).toContain('x'.repeat(300));
    expect((err as SpeechError).message).not.toContain('x'.repeat(301));
  });
  it('maps a hanging API to unavailable (timeout)', async () => {
    const hang: Fetch = (_u, i) => new Promise((_r, rej) => i?.signal?.addEventListener('abort', () => rej(i.signal!.reason)));
    expect(await kind(el(hang, 20).synthesize('x', 'v'))).toBe('unavailable');
    const err = await el(hang, 20).synthesize('x', 'v').catch((e) => e);
    expect((err as SpeechError).timedOut).toBe(true);
  });
});

describe('AudioService with primary budget and fallback (sky-scene-t6h2p)', () => {
  const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pa-audio-'));
  const keyOf = (url: string) => url.replace('/audio/', '').replace('.wav', '');
  const named = (name: string, behaviour: () => { durationMs: number; failure?: 'unavailable' | 'quota-exceeded' | 'bad-voice' | 'bad-config'; timedOut?: boolean } = () => ({ durationMs: 500 })) => {
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
  it('bad-config from the primary with 60 chars: fallback delivers audio, counter stays 0', async () => {
    const { svc, fallback, usage } = setup(1000, named('elevenlabs', () => ({ durationMs: 1, failure: 'bad-config' })));
    expect(await svc.get(keyOf(svc.register('a'.repeat(60)).audioUrl))).toBeDefined();
    expect(fallback.calls()).toBe(1); expect(usage.characters()).toBe(0);
  });
  it('quota-exceeded leaves the counter at 0, success adds the text length, timeout adds the text length', async () => {
    const q = setup(1000, named('elevenlabs', () => ({ durationMs: 1, failure: 'quota-exceeded' })));
    await q.svc.get(keyOf(q.svc.register('a'.repeat(60)).audioUrl));
    expect(q.usage.characters()).toBe(0);
    const ok = setup(1000);
    await ok.svc.get(keyOf(ok.svc.register('a'.repeat(60)).audioUrl));
    expect(ok.usage.characters()).toBe(60);
    const t = setup(1000, named('elevenlabs', () => ({ durationMs: 1, failure: 'unavailable', timedOut: true })));
    await t.svc.get(keyOf(t.svc.register('a'.repeat(60)).audioUrl));
    expect(t.usage.characters()).toBe(60);
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

describe('ElevenLabs failure log lines (sky-scene-k3f8d)', () => {
  it('402: a warn line with status=402, code=paid_plan_required and the message; 429: the fallback line carries status=429', async () => {
    const lines: Array<[string, string]> = [];
    const log = { ...silentLogger, info: (m: string) => { lines.push(['info', m]); }, warn: (m: string) => { lines.push(['warn', m]); } };
    const mk = (status: number, code: string) => {
      const f: Fetch = async (url) => url.includes('elevenlabs') ? { ok: false, status, text: async () => JSON.stringify({ detail: { code, message: 'Free users cannot use library voices' } }), arrayBuffer: async () => new ArrayBuffer(0) } : reply(200, wavFixture)(url);
      const primary = new ElevenLabsSpeechSynthesizer({ fetch: f, apiKey: 'k', modelId: 'm', outputFormat: 'pcm_22050', timeoutMs: 1000, log });
      const fb = new PiperSpeechSynthesizer({ fetch: f, endpoint: 'http://tts:5000', timeoutMs: 1000 });
      return new AudioService(primary, { voice: 'EV', render: 'lazy', log, fallback: { synth: fb, voice: 'PV' } });
    };
    const a = mk(402, 'paid_plan_required');
    expect(await a.get(a.keyFor('t') && a.register('t').audioUrl.replace('/audio/', '').replace('.wav', ''))).toBeDefined();
    const warn = lines.find((l) => l[0] === 'warn' && l[1].includes('status=402'))!;
    expect(warn[1]).toContain('code=paid_plan_required');
    expect(warn[1]).toContain('Free users cannot use library voices');
    lines.length = 0;
    const b = mk(429, 'too_many_requests');
    await b.get(b.register('t').audioUrl.replace('/audio/', '').replace('.wav', ''));
    expect(lines.some((l) => l[1].includes('status=429'))).toBe(true);
  });
});

describe('buildSpeechSetup (ELEVENLABS_API_KEY from env only)', () => {
  const MIN = 'location: { lat: 50, lon: 8 }\n';
  const VOICE = 'MYVOICE';
  const base = { fetch: reply(200, new Uint8Array()), db: openDatabase(':memory:'), clock: new FakeClock(0) };
  it('adapter elevenlabs without key: warn mentioning ELEVENLABS_API_KEY and the fallback serves audio', async () => {
    const warns: string[] = [];
    const log = { ...silentLogger, warn: (m: string) => { warns.push(m); } };
    const setup = buildSpeechSetup({ ...base, config: parseConfig(MIN + 'speech: { adapter: elevenlabs, voice: VOICE }\n'), env: {}, log, fetch: reply(200, wavFixture) });
    expect(warns.join()).toContain('ELEVENLABS_API_KEY');
    expect(setup.synth.name).toBe('piper');
    expect(setup.voice).toBe('de_DE-thorsten-medium');
    expect(setup.fallback).toBeUndefined();
    expect((await setup.synth.synthesize('x', setup.voice)).durationMs).toBeGreaterThan(0);
  });
  it('with a key: elevenlabs primary, piper fallback, budget from config', () => {
    const setup = buildSpeechSetup({ ...base, config: parseConfig(MIN + 'speech: { adapter: elevenlabs, voice: VOICE }\n'), env: { ELEVENLABS_API_KEY: 'k' }, log: silentLogger });
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

describe('Steckbrief sentence blocks in AudioService (sky-scene-b7w2n)', () => {
  const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pa-parts-'));
  const keyOf = (url: string) => url.replace('/audio/', '').replace('.wav', '');
  const spy = (name: string, rate = 22050, failOn?: (t: string) => 'quota-exceeded' | undefined) => {
    const texts: string[] = [];
    return { name, texts, synthesize: async (t: string) => {
      texts.push(t);
      const f = failOn?.(t); if (f) throw new SpeechError(f);
      return { audio: pcmToWav(new Uint8Array(rate * 2), rate), mimeType: 'audio/wav', durationMs: 500 };
    } } as import('../../../src/server/modules/sky-scene/speech').SpeechSynthesizer & { texts: string[] };
  };
  const mk = (primary = spy('elevenlabs'), withFallback = true) => {
    const cacheDir = dir(); const fallback = spy('piper', 22050);
    const usage = new SpeechUsage(openDatabase(':memory:'), new FakeClock(Date.parse('2026-10-15T10:00:00Z')));
    const lines: Array<{ msg: string; f?: Record<string, unknown> }> = [];
    const log = { ...silentLogger, info: (msg: string, f?: Record<string, unknown>) => { lines.push({ msg, f }); } } as typeof silentLogger;
    const svc = new AudioService(primary, { voice: 'EV', render: 'lazy', cacheDir, log, partGapMs: 250, ...(withFallback ? { fallback: { synth: fallback, voice: 'PV' }, budget: { usage, monthlyCharacterBudget: 9000 } } : {}) });
    return { svc, primary, fallback, usage, cacheDir, lines };
  };
  const A = 'Das ist ein Airbus A dreihundertzwanzig der Lufthansa.';
  const h1 = 'Das Flugzeug fliegt in siebentausend Metern Höhe.'; const h2 = 'Das Flugzeug fliegt in siebentausendfünfhundert Metern Höhe.';

  it('second plane with same airline/type but other altitude renders only the altitude block (partsRendered=1, budget by that block)', async () => {
    const { svc, primary, usage, lines } = mk();
    await svc.get(keyOf(svc.register([A, h1]).audioUrl));
    expect(primary.texts).toEqual([A, h1]);
    expect(usage.characters()).toBe(A.length + h1.length);
    const bytes = await svc.get(keyOf(svc.register([A, h2]).audioUrl));
    expect(primary.texts).toEqual([A, h1, h2]);
    expect(usage.characters()).toBe(A.length + h1.length + h2.length);
    const last = lines.filter((l) => l.msg === 'speech synthesized').slice(-1)[0]!.f!;
    expect(last).toMatchObject({ parts: 2, partsRendered: 1 });
    expect(wavDurationMs(bytes!)).toBe(2000 + 250); // two 1 s clips + gap
  });
  it('same blocks again: same URL, nothing rendered, partsRendered=0 on a fresh composition elsewhere', async () => {
    const { svc, primary } = mk();
    const u1 = svc.register([A, h1]).audioUrl; await svc.get(keyOf(u1));
    const u2 = svc.register([A, h1]).audioUrl; expect(u2).toBe(u1);
    await svc.get(keyOf(u2)); expect(primary.texts).toHaveLength(2);
  });
  it('composed file is rebuilt from cached blocks with partsRendered=0 when only the composed file is missing', async () => {
    const { svc, primary, lines, cacheDir } = mk();
    const u = svc.register([A, h1]).audioUrl; await svc.get(keyOf(u));
    fs.rmSync(path.join(cacheDir, `${keyOf(u)}.wav`)); // composed file gone, blocks stay
    await svc.get(keyOf(u));
    expect(primary.texts).toHaveLength(2);
    expect(lines.filter((l) => l.msg === 'speech synthesized').slice(-1)[0]!.f).toMatchObject({ parts: 2, partsRendered: 0 });
  });
  it('quota-exceeded on block 2: whole Steckbrief from the fallback, no mixing, file under the fallback composed key', async () => {
    const { svc, primary, fallback, cacheDir } = mk(spy('elevenlabs', 22050, (t) => (t === h1 ? 'quota-exceeded' : undefined)));
    const key = keyOf(svc.register([A, h1]).audioUrl);
    const bytes = await svc.get(key);
    expect(bytes).toBeDefined();
    expect(primary.texts).toEqual([A, h1]);
    expect(fallback.texts).toEqual([A, h1]); // both blocks from the fallback
    expect(wavDurationMs(bytes!)).toBe(2250);
    expect(fs.existsSync(path.join(cacheDir, `${key}.wav`))).toBe(false); // primary composed key stays empty
    // the fallback composed file exists under the key an AudioService with the fallback as adapter/voice computes
    const fbKey = new AudioService(fallback, { voice: 'PV', render: 'lazy', cacheDir, log: silentLogger, partGapMs: 250 }).composedKeyFor([A, h1]);
    expect(fbKey).not.toBe(key);
    expect(fs.existsSync(path.join(cacheDir, `${fbKey}.wav`))).toBe(true);
    // AudioService.get returning WAV bytes under the primary key is exactly the /audio/<key>.wav route's 200 condition (app.ts writeHead(200))
    expect(Buffer.from(bytes!.subarray(0, 4)).toString()).toBe('RIFF');
  });
  it('differing sample rates between blocks: the whole Steckbrief comes from the fallback', async () => {
    let n = 0;
    const odd = { name: 'elevenlabs', synthesize: async () => { const rate = n++ === 0 ? 22050 : 24000; return { audio: pcmToWav(new Uint8Array(rate * 2), rate), mimeType: 'audio/wav', durationMs: 1 }; } } as import('../../../src/server/modules/sky-scene/speech').SpeechSynthesizer;
    const { svc, fallback } = mk(odd as never);
    expect(await svc.get(keyOf(svc.register([A, h1]).audioUrl))).toBeDefined();
    expect(fallback.texts).toEqual([A, h1]);
  });
  it('budget counts only blocks that still have to be rendered; too few credits left for them goes to the fallback', async () => {
    const { svc, primary, fallback, usage } = mk();
    usage.add(9000 - A.length - 5);
    await svc.get(keyOf(svc.register([A, h1]).audioUrl)); // A fits, h1 does not: whole steckbrief from fallback, primary untouched
    expect(primary.texts).toEqual([]); expect(fallback.texts).toEqual([A, h1]);
  });
});

describe('concatWav', () => {
  it('joins two 22050 Hz mono clips with 250 ms of silence: duration = sum + 250', () => {
    const a = pcmToWav(new Uint8Array(22050 * 2), 22050); const b = pcmToWav(new Uint8Array(11025 * 2), 22050);
    const out = concatWav([a, b], 250);
    expect(Math.abs(wavDurationMs(out)! - (wavDurationMs(a)! + wavDurationMs(b)! + 250))).toBeLessThanOrEqual(1);
  });
  it('throws on differing sample rates', () => {
    expect(() => concatWav([pcmToWav(new Uint8Array(4), 22050), pcmToWav(new Uint8Array(4), 24000)], 250)).toThrow(/differ/);
  });
});
