// In-memory cache in front of the PhotoSourceChain (ADR 0029): per hex, TTL <= 24 h (Planespotters terms), "Kein Foto" is cached too,
// "nicht verfügbar" and partial answers are not. Never persisted (no SQLite). One request per hex at a time.
import type { Clock } from '../../clock';
import type { PhotoQuery } from './photo-source';
import type { PhotoResult, PhotoSourceChain } from './photo-source-chain';

export class PhotoService {
  private readonly cache = new Map<string, { result: PhotoResult; at: number }>();
  private readonly inflight = new Map<string, Promise<PhotoResult>>();
  private readonly maxEntries: number;
  constructor(private readonly chain: PhotoSourceChain, private readonly o: { clock: Clock; ttlMs: number; maxEntries?: number }) { this.maxEntries = o.maxEntries ?? 500; }

  status(): ReturnType<PhotoSourceChain['status']> { return this.chain.status(); }

  async get(q: PhotoQuery): Promise<PhotoResult> {
    const key = q.icao24.toLowerCase();
    const hit = this.cache.get(key);
    if (hit && this.o.clock.now() - hit.at < this.o.ttlMs) return hit.result;
    let p = this.inflight.get(key);
    if (!p) {
      p = this.chain.lookup(q).then((result) => {
        if (result.status !== 'unavailable' && !result.partial) {
          this.cache.delete(key);
          this.cache.set(key, { result, at: this.o.clock.now() });
          if (this.cache.size > this.maxEntries) this.cache.delete(this.cache.keys().next().value as string);
        } else this.cache.delete(key);
        return result;
      }).finally(() => this.inflight.delete(key));
      this.inflight.set(key, p);
    }
    return p;
  }
}
