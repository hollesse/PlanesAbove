// Renders and caches speech audio; delivers it by URL so the client never knows which adapter is active (ADR 0012).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Logger } from '../../logger';
import type { SpeechSynthesizer } from './speech';
import type { SpeechUsage } from './speech-usage';
import { wavDurationMs } from './wav';

export class AudioService {
  private texts = new Map<string, string>();
  private durations = new Map<string, number>();
  private inflight = new Map<string, Promise<Buffer | undefined>>();

  private fallbackNoticed = false;

  /**
   * `fallback`: adapter used when the primary is out of budget, over quota or unavailable; its audio is cached under ITS OWN key
   * (never the primary key), so the primary renders again once the budget is back. `budget`: monthly character cap for the primary.
   */
  constructor(private readonly synth: SpeechSynthesizer, private readonly o: {
    voice: string; render: 'eager' | 'lazy'; cacheDir?: string; log: Logger;
    fallback?: { synth: SpeechSynthesizer; voice: string };
    budget?: { usage: SpeechUsage; monthlyCharacterBudget: number };
  }) {
    if (o.cacheDir) fs.mkdirSync(o.cacheDir, { recursive: true });
  }

  /** Cache key (adapter, voice, text) so switching adapter or voice never serves stale audio. */
  keyFor(text: string): string { return this.hash(this.synth.name, this.o.voice, text); }

  private hash(adapter: string, voice: string, text: string): string {
    return crypto.createHash('sha256').update(`${adapter}\0${voice}\0${text}`).digest('hex').slice(0, 24);
  }

  /** Register a Steckbrief text; returns its URL (and duration when already rendered). Eager mode starts rendering. */
  register(text: string): { audioUrl: string; durationMs?: number } {
    const key = this.keyFor(text);
    this.texts.set(key, text);
    if (this.o.render === 'eager') void this.get(key);
    return { audioUrl: `/audio/${key}.wav`, durationMs: this.durations.get(key) };
  }

  /** WAV bytes for a registered key, synthesizing on first request; undefined when unknown or synthesis failed. */
  async get(key: string): Promise<Buffer | undefined> {
    const file = this.o.cacheDir && path.join(this.o.cacheDir, `${key}.wav`);
    if (file && fs.existsSync(file)) return fs.readFileSync(file);
    const text = this.texts.get(key);
    if (text === undefined) return undefined;
    const running = this.inflight.get(key);
    if (running) return running;
    const p = (async () => {
      try {
        const r = await this.render(key, text);
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

  private async render(key: string, text: string): Promise<{ bytes: Buffer; durationMs: number }> {
    const fb = this.o.fallback;
    const budget = this.o.budget;
    if (!fb) return this.synthesizeWith(this.synth, this.o.voice, text, key);
    let reason: string; let detail: string | undefined;
    if (budget && budget.usage.characters() + text.length > budget.monthlyCharacterBudget) reason = 'budget exhausted';
    else {
      // charged only for delivered audio (inside synthesizeWith) or a timeout after the request went out (the one grey area); HTTP errors cost nothing
      try { return await this.synthesizeWith(this.synth, this.o.voice, text, key, true); } catch (e) {
        reason = (e as { kind?: string }).kind ?? 'unavailable';
        if (budget && (e as { timedOut?: boolean }).timedOut) budget.usage.add(text.length);
        detail = (e as Error).message;
      }
    }
    const msg = `speech ${reason}${detail && detail !== reason ? ` (${detail})` : ''}, falling back to ${fb.synth.name}`;
    // bad-config / bad-voice were already logged as warn by the adapter on every request; do not repeat as warn
    if (this.fallbackNoticed || reason === 'bad-config' || reason === 'bad-voice') this.o.log.info(msg, { source: 'tts' }); else { this.fallbackNoticed = true; this.o.log.warn(msg, { source: 'tts' }); }
    return this.synthesizeWith(fb.synth, fb.voice, text, this.hash(fb.synth.name, fb.voice, text));
  }

  private async synthesizeWith(synth: SpeechSynthesizer, voice: string, text: string, key: string, charge = false): Promise<{ bytes: Buffer; durationMs: number }> {
    const file = this.o.cacheDir && path.join(this.o.cacheDir, `${key}.wav`);
    if (file && synth !== this.synth && fs.existsSync(file)) {
      const bytes = fs.readFileSync(file);
      return { bytes, durationMs: wavDurationMs(bytes) ?? 0 };
    }
    const r = await synth.synthesize(text, voice);
    if (charge && this.o.budget) this.o.budget.usage.add(text.length);
    const bytes = Buffer.from(r.audio);
    if (file) fs.writeFileSync(file, bytes);
    const fields: Record<string, unknown> = { source: 'tts', adapter: synth.name, voice, durationMs: r.durationMs };
    if (this.o.budget) fields.charactersUsedThisMonth = this.o.budget.usage.characters();
    this.o.log.info('speech synthesized', fields);
    return { bytes, durationMs: r.durationMs };
  }
}
