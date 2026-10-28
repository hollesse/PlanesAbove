// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PiperSpeechSynthesizer } from '../../../src/server/modules/sky-scene/piper-speech';
import { FakeSpeechSynthesizer } from '../../../src/server/modules/sky-scene/fake-speech';
import { AudioService } from '../../../src/server/modules/sky-scene/audio-service';
import { SpeechError } from '../../../src/server/modules/sky-scene/speech';
import { makeSilentWav, wavDurationMs } from '../../../src/server/modules/sky-scene/wav';
import { silentLogger } from '../../../src/server/logger';
import type { Fetch } from '../../../src/server/modules/airspace/adapters/http';

// Fixture recorded from the running Piper sidecar (piper-tts 1.8.0, de_DE-thorsten-medium) - see tests/fixtures/piper-sample.wav.origin.txt
const wavFixture = new Uint8Array(fs.readFileSync(new URL('../../fixtures/piper-sample.wav', import.meta.url)));
const reply = (status: number, bytes: Uint8Array): Fetch => async () => ({ ok: status < 300, status, text: async () => '', arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer });
const piper = (f: Fetch, t = 1000) => new PiperSpeechSynthesizer({ fetch: f, endpoint: 'http://tts:5000', timeoutMs: t });
const kind = (p: Promise<unknown>) => p.catch((e: SpeechError) => e.kind);

describe('wav helpers', () => {
  it('round-trips the duration of a silent clip', () => { expect(wavDurationMs(makeSilentWav(1500))).toBe(1500); });
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
