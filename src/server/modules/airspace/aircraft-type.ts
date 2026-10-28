// Type code per hex: own correction table > hexdb > flight source (airspace-t4x9k, ADR 0010 / 0016 amendments).
// hexdb answers live only in this in-memory cache and are never persisted; callers persist only `source` and their own derived Typklasse.
import type { Clock } from '../../clock';
import type { Logger } from '../../logger';
import { SourceError, type AircraftTypeSource } from './model';

export type TypeSourceName = 'flight' | 'override' | 'hexdb';
export interface CorrectedType { typeCode: string | undefined; source: TypeSourceName }

const upper = (s: string | undefined): string | undefined => (s ? s.trim().toUpperCase() || undefined : undefined);

export class AircraftTypeResolver {
  private readonly cache = new Map<string, { type: string | null; at: number }>();
  private readonly inflight = new Map<string, Promise<void>>();
  private readonly logged = new Set<string>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  constructor(private readonly o: { overrides: Record<string, string>; source?: AircraftTypeSource; clock: Clock; log: Logger; ttlMs?: number; maxEntries?: number }) {
    this.ttlMs = o.ttlMs ?? 24 * 3_600_000;
    this.maxEntries = o.maxEntries ?? 5000;
  }

  /** Decision from overrides and the cache only; never asks hexdb. */
  peek(hex: string, flightType: string | undefined): CorrectedType {
    const h = hex.toLowerCase();
    const flight = upper(flightType);
    const override = this.o.overrides[h];
    if (override) return this.note(h, flight, { typeCode: override, source: 'override' });
    const e = this.cache.get(h);
    if (e && this.o.clock.now() - e.at < this.ttlMs && e.type && e.type !== flight) return this.note(h, flight, { typeCode: e.type, source: 'hexdb' });
    return { typeCode: flightType, source: 'flight' };
  }

  /** Like peek, but asks hexdb first when the hex has no override and no fresh cache entry. Never throws; a failed lookup falls back to the flight source's type and is retried next Takt. */
  async resolve(hex: string, flightType: string | undefined): Promise<CorrectedType> {
    const h = hex.toLowerCase();
    const src = this.o.source;
    if (src && !this.o.overrides[h]) {
      const e = this.cache.get(h);
      if (!e || this.o.clock.now() - e.at >= this.ttlMs) {
        let p = this.inflight.get(h);
        if (!p) {
          p = this.fetch(src, h).finally(() => this.inflight.delete(h));
          this.inflight.set(h, p);
        }
        await p;
      }
    }
    return this.peek(h, flightType);
  }

  private async fetch(src: AircraftTypeSource, h: string): Promise<void> {
    try {
      const type = await src.lookup(h);
      // A 404 / no type is cached too; failures below are not (no negative caching on unavailability, ADR 0016).
      this.cache.delete(h);
      this.cache.set(h, { type, at: this.o.clock.now() });
      if (this.cache.size > this.maxEntries) this.cache.delete(this.cache.keys().next().value as string);
    } catch (e) {
      if (!(e instanceof SourceError) || e.errorClass !== 'unavailable') this.o.log.log('debug', 'hexdb aircraft lookup failed', { hex: h, errorClass: e instanceof SourceError ? e.errorClass : 'network' });
    }
  }

  private note(hex: string, flight: string | undefined, c: CorrectedType): CorrectedType {
    if (c.typeCode !== flight) {
      const key = `${hex}:${flight ?? ''}:${c.typeCode}`;
      if (!this.logged.has(key)) {
        if (this.logged.size > 5000) this.logged.clear();
        this.logged.add(key);
        this.o.log.info('aircraft type corrected', { hex, flightType: flight ?? null, correctedType: c.typeCode, source: c.source });
      }
    }
    return c;
  }
}
