// Renders and caches speech audio; delivers it by URL so the client never knows which adapter is active (ADR 0012).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Logger } from '../../logger';
import type { SpeechSynthesizer } from './speech';
import type { SpeechUsage } from './speech-usage';
import { slug, type SpeechPart } from './steckbrief';
import { concatWav, WavFormatError, wavDurationMs } from './wav';

const SEP = '\u0001';
interface PartAudio { bytes: Buffer; rendered: boolean }

export class AudioService {
  private entries = new Map<string, SpeechPart[]>();
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
  composedKeyFor(parts: PartInput[]): string { return this.keyFor(toParts(parts).map((p) => p.text).join(SEP)); }

  private hash(adapter: string, voice: string, text: string): string {
    return crypto.createHash('sha256').update(`${adapter}\0${voice}\0${text}`).digest('hex').slice(0, 24);
  }

  /** Register a Steckbrief (one text or its sentence blocks); returns its URL (and duration when already rendered). Eager mode starts rendering. */
  register(textOrParts: PartInput | PartInput[]): { audioUrl: string; durationMs?: number } {
    const parts = toParts(Array.isArray(textOrParts) ? textOrParts : [textOrParts]);
    const key = this.composedKeyFor(parts);
    this.entries.set(key, parts);
    if (this.o.render === 'eager') void this.get(key);
    return { audioUrl: `/audio/${key}.wav`, durationMs: this.durations.get(key) };
  }

  /** WAV bytes for a registered key, synthesizing on first request; undefined when unknown or synthesis failed. */
  async get(key: string): Promise<Buffer | undefined> {
    const parts = this.entries.get(key); // the composed Steckbrief is never stored as a file, it is joined from its blocks on every request
    if (parts === undefined) return undefined;
    const running = this.inflight.get(key);
    if (running) return running;
    const p = (async () => {
      try {
        const r = await this.render(parts);
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

  private async render(parts: SpeechPart[]): Promise<{ bytes: Buffer; durationMs: number }> {
    const fb = this.o.fallback;
    const budget = this.o.budget;
    if (!fb) return this.compose(this.synth, this.o.voice, parts, true);
    let reason: string; let detail: string | undefined;
    const missing = parts.filter((t) => !this.cachedPart(this.synth, this.o.voice, t));
    const needed = missing.reduce((n, t) => n + t.text.length, 0);
    if (budget && needed > 0 && budget.usage.characters() + needed > budget.monthlyCharacterBudget) reason = 'budget exhausted';
    else {
      // charged only for delivered audio (inside renderPart) or a timeout after the request went out (the one grey area); HTTP errors cost nothing
      try { return await this.compose(this.synth, this.o.voice, parts, true); } catch (e) {
        reason = (e as { kind?: string }).kind ?? 'unavailable';
        detail = (e as Error).message;
        if (e instanceof WavFormatError) this.o.log.warn('speech parts differ in audio format, delivering the whole Steckbrief from the fallback', { source: 'tts', detail });
      }
    }
    const msg = `speech ${reason}${detail && detail !== reason ? ` (${detail})` : ''}, falling back to ${fb.synth.name}`;
    // bad-config / bad-voice were already logged as warn by the adapter on every request; do not repeat as warn
    if (this.fallbackNoticed || reason === 'bad-config' || reason === 'bad-voice') this.o.log.info(msg, { source: 'tts' }); else { this.fallbackNoticed = true; this.o.log.warn(msg, { source: 'tts' }); }
    return this.compose(fb.synth, fb.voice, parts, false);
  }

  private partKey(synth: SpeechSynthesizer, voice: string, text: string): string { return this.hash(synth.name, voice, text); }

  /** data/audio/<adapter>/<voice>/<kategorie>/<schluessel>-<texthash>.wav; the 6-hex text hash changes with the wording so a stale file is never replayed. */
  private partFile(synth: SpeechSynthesizer, voice: string, p: SpeechPart): string | undefined {
    if (!this.o.cacheDir) return undefined;
    const h = crypto.createHash('sha256').update(p.text).digest('hex').slice(0, 6);
    return path.join(this.o.cacheDir, slug(synth.name), slug(voice), slug(p.kategorie), `${slug(p.schluessel)}-${h}.wav`);
  }

  private cachedPart(synth: SpeechSynthesizer, voice: string, p: SpeechPart): Buffer | undefined {
    const file = this.partFile(synth, voice, p);
    if (!file) return this.memParts.get(this.partKey(synth, voice, p.text));
    if (fs.existsSync(file)) return fs.readFileSync(file);
    // lazy migration: the old flat file data/audio/<hash24>.wav moves to the new path instead of being rendered again
    const old = path.join(this.o.cacheDir!, `${this.partKey(synth, voice, p.text)}.wav`);
    if (fs.existsSync(old)) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.renameSync(old, file); return fs.readFileSync(file); }
    return undefined;
  }

  /** Renders (or takes from cache) every block with ONE adapter and joins them; the joined audio is not stored. */
  private async compose(synth: SpeechSynthesizer, voice: string, parts: SpeechPart[], charge: boolean): Promise<{ bytes: Buffer; durationMs: number }> {
    const audios: PartAudio[] = [];
    for (const t of parts) audios.push(await this.renderPart(synth, voice, t, charge));
    const bytes = audios.length === 1 ? audios[0].bytes : Buffer.from(concatWav(audios.map((a) => a.bytes), this.o.partGapMs ?? 250));
    const durationMs = wavDurationMs(bytes) ?? 0;
    const fields: Record<string, unknown> = { source: 'tts', adapter: synth.name, voice, durationMs, parts: parts.length, partsRendered: audios.filter((a) => a.rendered).length };
    if (this.o.budget) fields.charactersUsedThisMonth = this.o.budget.usage.characters();
    this.o.log.info('speech synthesized', fields);
    return { bytes, durationMs };
  }

  private async renderPart(synth: SpeechSynthesizer, voice: string, p: SpeechPart, charge: boolean): Promise<PartAudio> {
    const cached = this.cachedPart(synth, voice, p);
    if (cached) return { bytes: cached, rendered: false };
    const text = p.text;
    let r;
    try { r = await synth.synthesize(text, voice); } catch (e) {
      if (charge && this.o.budget && (e as { timedOut?: boolean }).timedOut) this.o.budget.usage.add(text.length);
      throw e;
    }
    if (charge && this.o.budget) this.o.budget.usage.add(text.length);
    const bytes = Buffer.from(r.audio);
    const file = this.partFile(synth, voice, p);
    if (file) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); } else this.memParts.set(this.partKey(synth, voice, text), bytes);
    return { bytes, rendered: true };
  }
}

/** A block as plain text (tests, ad-hoc speech) or a categorised SpeechPart. */
export type PartInput = string | SpeechPart;
const toParts = (xs: PartInput[]): SpeechPart[] => xs.map((x) => (typeof x === 'string' ? { kategorie: 'sonstiges', schluessel: 'text', text: x } : x));
