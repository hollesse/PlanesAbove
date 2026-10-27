// Renders and caches speech audio; delivers it by URL so the client never knows which adapter is active (ADR 0012).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Logger } from '../../logger';
import type { SpeechSynthesizer } from './speech';

export class AudioService {
  private texts = new Map<string, string>();
  private durations = new Map<string, number>();
  private inflight = new Map<string, Promise<Buffer | undefined>>();

  constructor(private readonly synth: SpeechSynthesizer, private readonly o: { voice: string; render: 'eager' | 'lazy'; cacheDir?: string; log: Logger }) {
    if (o.cacheDir) fs.mkdirSync(o.cacheDir, { recursive: true });
  }

  /** Cache key (adapter, voice, text) so switching adapter or voice never serves stale audio. */
  keyFor(text: string): string {
    return crypto.createHash('sha256').update(`${this.synth.name}\0${this.o.voice}\0${text}`).digest('hex').slice(0, 24);
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
        const r = await this.synth.synthesize(text, this.o.voice);
        const bytes = Buffer.from(r.audio);
        this.durations.set(key, r.durationMs);
        if (file) fs.writeFileSync(file, bytes);
        return bytes;
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
}
