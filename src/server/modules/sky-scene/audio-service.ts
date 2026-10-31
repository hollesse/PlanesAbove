// Renders and caches speech audio; delivers it by URL so the client never knows which adapter is active (ADR 0012).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Logger } from '../../logger';
import type { SpeechSynthesizer } from './speech';
import type { SpeechUsage } from './speech-usage';
import { concatWav, WavFormatError, wavDurationMs } from './wav';

const SEP = '\u0001';
interface PartAudio { bytes: Buffer; rendered: boolean }

export class AudioService {
  private entries = new Map<string, string[]>();
  private durations = new Map<string, number>();
  private inflight = new Map<string, Promise<Buffer | undefined>>();
  private memParts = new Map<string, Buffer>(); // block cache when there is no cacheDir

  private fallbackNoticed = false;

  /**
   * `fallback`: adapter used when the primary is out of budget, over quota or unavailable; its audio is cached under ITS OWN key
   * (never the primary key), so the primary renders again once the budget is back. `budget`: monthly character cap for the primary.
   * A Steckbrief is a list of sentence blocks: each block is rendered and cached on its own, the composed audio gets a composed key.
   * Blocks of primary and fallback are never mixed: if one block is missing at the primary, the whole Steckbrief comes from the fallback.
   */
  constructor(private readonly synth: SpeechSynthesizer, private readonly o: {
    voice: string; render: 'eager' | 'lazy'; cacheDir?: string; log: Logger; partGapMs?: number;
    fallback?: { synth: SpeechSynthesizer; voice: string };
    budget?: { usage: SpeechUsage; monthlyCharacterBudget: number };
  }) {
    if (o.cacheDir) fs.mkdirSync(o.cacheDir, { recursive: true });
  }

  /** Cache key (adapter, voice, text) so switching adapter or voice never serves stale audio. For a single block text this is also its composed key. */
  keyFor(text: string): string { return this.hash(this.synth.name, this.o.voice, text); }

  /** Composed key (adapter, voice, hash of the block texts); equals `keyFor(text)` for a single block. */
  composedKeyFor(parts: string[]): string { return this.keyFor(parts.join(SEP)); }

  private hash(adapter: string, voice: string, text: string): string {
    return crypto.createHash('sha256').update(`${adapter}\0${voice}\0${text}`).digest('hex').slice(0, 24);
  }

  /** Register a Steckbrief (one text or its sentence blocks); returns its URL (and duration when already rendered). Eager mode starts rendering. */
  register(textOrParts: string | string[]): { audioUrl: string; durationMs?: number } {
    const parts = typeof textOrParts === 'string' ? [textOrParts] : textOrParts;
    const key = this.composedKeyFor(parts);
    this.entries.set(key, parts);
    if (this.o.render === 'eager') void this.get(key);
    return { audioUrl: `/audio/${key}.wav`, durationMs: this.durations.get(key) };
  }

  /** WAV bytes for a registered key, synthesizing on first request; undefined when unknown or synthesis failed. */
  async get(key: string): Promise<Buffer | undefined> {
    const file = this.o.cacheDir && path.join(this.o.cacheDir, `${key}.wav`);
    if (file && fs.existsSync(file)) return fs.readFileSync(file);
    const parts = this.entries.get(key);
    if (parts === undefined) return undefined;
    const running = this.inflight.get(key);
    if (running) return running;
    const p = (async () => {
      try {
        const r = await this.render(key, parts);
        this.durations.set(key, r.durationMs);
        return r.bytes;
      } catch (e) {
        this.o.log.warn('speech synthesis failed', { source: 'tts', errorClass: (e as { kind?: string }).kind ?? 'unavailable' });
        return undefined;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, p);
    return p;
  }

  private async render(key: string, parts: string[]): Promise<{ bytes: Buffer; durationMs: number }> {
    const fb = this.o.fallback;
    const budget = this.o.budget;
    if (!fb) return this.compose(this.synth, this.o.voice, parts, key, true);
    let reason: string; let detail: string | undefined;
    const missing = parts.filter((t) => !this.cachedPart(this.synth, this.o.voice, t));
    const needed = missing.reduce((n, t) => n + t.length, 0);
    if (budget && needed > 0 && budget.usage.characters() + needed > budget.monthlyCharacterBudget) reason = 'budget exhausted';
    else {
      // charged only for delivered audio (inside renderPart) or a timeout after the request went out (the one grey area); HTTP errors cost nothing
      try { return await this.compose(this.synth, this.o.voice, parts, key, true); } catch (e) {
        reason = (e as { kind?: string }).kind ?? 'unavailable';
        detail = (e as Error).message;
        if (e instanceof WavFormatError) this.o.log.warn('speech parts differ in audio format, delivering the whole Steckbrief from the fallback', { source: 'tts', detail });
      }
    }
    const msg = `speech ${reason}${detail && detail !== reason ? ` (${detail})` : ''}, falling back to ${fb.synth.name}`;
    // bad-config / bad-voice were already logged as warn by the adapter on every request; do not repeat as warn
    if (this.fallbackNoticed || reason === 'bad-config' || reason === 'bad-voice') this.o.log.info(msg, { source: 'tts' }); else { this.fallbackNoticed = true; this.o.log.warn(msg, { source: 'tts' }); }
    return this.compose(fb.synth, fb.voice, parts, this.hash(fb.synth.name, fb.voice, parts.join(SEP)), false);
  }

  private partKey(synth: SpeechSynthesizer, voice: string, text: string): string { return this.hash(synth.name, voice, text); }

  private cachedPart(synth: SpeechSynthesizer, voice: string, text: string): Buffer | undefined {
    const k = this.partKey(synth, voice, text);
    const file = this.o.cacheDir && path.join(this.o.cacheDir, `${k}.wav`);
    if (file) return fs.existsSync(file) ? fs.readFileSync(file) : undefined;
    return this.memParts.get(k);
  }

  /** Renders (or takes from cache) every block with ONE adapter and joins them; writes the composed file under `composedKey` (the fallback key for the fallback). */
  private async compose(synth: SpeechSynthesizer, voice: string, parts: string[], composedKey: string, charge: boolean): Promise<{ bytes: Buffer; durationMs: number }> {
    const file = this.o.cacheDir && path.join(this.o.cacheDir, `${composedKey}.wav`);
    if (file && synth !== this.synth && fs.existsSync(file)) {
      const bytes = fs.readFileSync(file);
      return { bytes, durationMs: wavDurationMs(bytes) ?? 0 };
    }
    const audios: PartAudio[] = [];
    for (const t of parts) audios.push(await this.renderPart(synth, voice, t, charge));
    const bytes = audios.length === 1 ? audios[0].bytes : Buffer.from(concatWav(audios.map((a) => a.bytes), this.o.partGapMs ?? 250));
    if (file && audios.length > 1) fs.writeFileSync(file, bytes);
    const durationMs = wavDurationMs(bytes) ?? 0;
    const fields: Record<string, unknown> = { source: 'tts', adapter: synth.name, voice, durationMs, parts: parts.length, partsRendered: audios.filter((a) => a.rendered).length };
    if (this.o.budget) fields.charactersUsedThisMonth = this.o.budget.usage.characters();
    this.o.log.info('speech synthesized', fields);
    return { bytes, durationMs };
  }

  private async renderPart(synth: SpeechSynthesizer, voice: string, text: string, charge: boolean): Promise<PartAudio> {
    const cached = this.cachedPart(synth, voice, text);
    if (cached) return { bytes: cached, rendered: false };
    let r;
    try { r = await synth.synthesize(text, voice); } catch (e) {
      if (charge && this.o.budget && (e as { timedOut?: boolean }).timedOut) this.o.budget.usage.add(text.length);
      throw e;
    }
    if (charge && this.o.budget) this.o.budget.usage.add(text.length);
    const bytes = Buffer.from(r.audio);
    const k = this.partKey(synth, voice, text);
    if (this.o.cacheDir) fs.writeFileSync(path.join(this.o.cacheDir, `${k}.wav`), bytes); else this.memParts.set(k, bytes);
    return { bytes, rendered: true };
  }
}
