// PhotoSource chain (ADR 0029): asks the configured sources in order, merges (dedup, maxPhotos), keeps per-source backoff state for /healthz.
// "Kein Foto" (every asked source answered empty) is told apart from "nicht verfügbar" (a source failed and nothing was found).
import type { Clock } from '../../clock';
import type { Logger } from '../../logger';
import type { Photo, PhotoQuery, PhotoSource } from './photo-source';

export type PhotoStatus = 'ok' | 'none' | 'unavailable';
export interface PhotoResult { photos: Photo[]; status: PhotoStatus; /** A source was unavailable/blocked: the answer may be incomplete and must not be cached. */ partial: boolean }
export interface PhotoSourceState { name: string; state: 'ok' | 'backoff' | 'blocked'; until: number | null; consecutiveFailures: number; lastErrorClass: string | null }

export const PHOTO_BREAKER_THRESHOLD = 3;
export const PHOTO_BREAKER_MS = 60_000;

interface Entry { source: PhotoSource; failures: number; blockedUntil: number; kind: 'backoff' | 'blocked'; lastErrorClass: string | null }

export class PhotoSourceChain {
  private readonly entries: Entry[];
  constructor(sources: PhotoSource[], private readonly d: { clock: Clock; log: Logger; maxPhotos: number; /** Pause after a 429 that names no Retry-After. */ backoffMs: number }) {
    this.entries = sources.map((source) => ({ source, failures: 0, blockedUntil: 0, kind: 'backoff', lastErrorClass: null }));
  }

  status(): { sources: PhotoSourceState[] } {
    const now = this.d.clock.now();
    return { sources: this.entries.map((e) => { const blocked = e.blockedUntil > now; return { name: e.source.name, state: blocked ? e.kind : 'ok', until: blocked ? e.blockedUntil : null, consecutiveFailures: e.failures, lastErrorClass: e.lastErrorClass }; }) };
  }

  async lookup(q: PhotoQuery): Promise<PhotoResult> {
    const { clock, log, maxPhotos } = this.d;
    const photos: Photo[] = [];
    const seen = new Set<string>();
    let asked = 0;
    let unavailable = 0;
    for (const e of this.entries) {
      if (photos.length >= maxPhotos) break; // enough: spare the remaining sources
      if (e.blockedUntil > clock.now()) { unavailable++; continue; }
      asked++;
      const r = await e.source.lookup(q);
      if ('unavailable' in r) {
        unavailable++;
        this.recordFailure(e, r.errorClass ?? 'network', r.retryAfterMs);
        continue;
      }
      e.failures = 0; e.lastErrorClass = null;
      for (const p of r.photos) {
        const keys = [`${p.source}:${p.id}`, `${p.source}:${p.imageUrl}`];
        if (keys.some((k) => seen.has(k))) continue;
        keys.forEach((k) => seen.add(k));
        photos.push(p);
        if (photos.length >= maxPhotos) break;
      }
    }
    const partial = unavailable > 0;
    const status: PhotoStatus = photos.length > 0 ? 'ok' : partial ? 'unavailable' : 'none';
    log.log('debug', 'photo lookup', { hex: q.icao24, status, photos: photos.length, asked, unavailable });
    return { photos, status, partial };
  }

  private recordFailure(e: Entry, errorClass: string, retryAfterMs: number | undefined): void {
    const now = this.d.clock.now();
    e.failures++;
    e.lastErrorClass = errorClass;
    if (errorClass === 'http-429' || errorClass === 'http-403') {
      const pause = retryAfterMs ?? this.d.backoffMs;
      e.blockedUntil = Math.max(e.blockedUntil, now + pause); e.kind = errorClass === 'http-403' ? 'blocked' : 'backoff';
      this.d.log.warn('photo source paused', { source: e.source.name, errorClass, pauseSeconds: Math.round(pause / 1000) });
    } else if (e.failures >= PHOTO_BREAKER_THRESHOLD) {
      e.blockedUntil = Math.max(e.blockedUntil, now + PHOTO_BREAKER_MS); e.kind = 'backoff';
      this.d.log.warn('photo source paused', { source: e.source.name, errorClass, pauseSeconds: PHOTO_BREAKER_MS / 1000, failures: e.failures });
    } else this.d.log.log('debug', 'photo source failed', { source: e.source.name, errorClass, failures: e.failures });
  }
}
