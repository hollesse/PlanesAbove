// AircraftTypeSource over hexdb.io: GET /api/v1/aircraft/{hex}, keyless. Like the hexdb routes (ADR 0016 amendment) the result lives only in
// memory (AircraftTypeResolver's cache) and is never persisted.
import type { Clock } from '../../../clock';
import type { Logger } from '../../../logger';
import { SourceError, type AircraftTypeSource } from '../model';
import { HexdbBackoff } from './hexdb-backoff';
import { guardedFetch, type Fetch } from './http';

const BASE = 'https://hexdb.io/api/v1/aircraft/';

export class HexdbAircraftTypeSource implements AircraftTypeSource {
  readonly name = 'hexdb';
  private readonly backoff: HexdbBackoff;
  constructor(private readonly o: { fetch: Fetch; userAgent: string; timeoutMs: number; backoffMs: number; clock: Clock; log: Logger; baseUrl?: string; /** Shared with the route adapter: same host, one 429 window. */ backoff?: HexdbBackoff }) { this.backoff = o.backoff ?? new HexdbBackoff(); }

  /** The ICAO type code hexdb knows for this hex, or null (unknown hex / no type). Throws SourceError on timeout, network error, 429, 5xx. */
  async lookup(hex: string): Promise<string | null> {
    const now = this.o.clock.now();
    if (this.backoff.blocked(now)) throw new SourceError('unavailable', 'hexdb backoff after HTTP 429');
    let res: Awaited<ReturnType<Fetch>>;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // Hard deadline independent of the fetch implementation: a hanging connection must never hold up the Takt.
      const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new SourceError('timeout', 'hexdb aircraft lookup timed out')), this.o.timeoutMs); });
      res = await Promise.race([guardedFetch(this.o.fetch, BASE + encodeURIComponent(hex.trim()), { headers: { 'User-Agent': this.o.userAgent, Accept: 'application/json' } }, this.o.timeoutMs), deadline]);
    } catch (e) {
      if (e instanceof SourceError && e.errorClass === 'http-4xx' && e.message === 'HTTP 404') return null;
      if (e instanceof SourceError && e.errorClass === 'http-429') {
        this.backoff.block(now, this.o.backoffMs);
        this.o.log.warn('hexdb rate limited (429), skipping hexdb aircraft lookups for the backoff window', { backoffMinutes: this.o.backoffMs / 60_000 });
      }
      throw e;
    } finally { clearTimeout(timer); }
    let body: unknown;
    try { body = JSON.parse(await res.text()); } catch { throw new SourceError('parse', 'hexdb: invalid JSON'); }
    const code = body && typeof body === 'object' ? (body as Record<string, unknown>).ICAOTypeCode : undefined;
    const t = typeof code === 'string' ? code.trim().toUpperCase() : '';
    return t && t !== 'ZZZZ' ? t : null;
  }
}

/** Wiring switch: the hexdb type cross-check exists only in live mode and when `sources.aircraftType.hexdb.enabled` is true (the override table applies regardless). */
export function buildAircraftTypeSource(o: { mock: boolean; enabled: boolean; fetch: Fetch; userAgent: string; timeoutMs: number; backoffMs: number; clock: Clock; log: Logger; backoff?: HexdbBackoff }): AircraftTypeSource | undefined {
  if (o.mock || !o.enabled) return undefined;
  return new HexdbAircraftTypeSource(o);
}
