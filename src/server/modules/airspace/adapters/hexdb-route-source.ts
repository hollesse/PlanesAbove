// RouteSource over the hexdb.io live lookup: GET /api/v2/routes/{callsign}, keyless. No licence stated, so treated like adsbdb:
// results live only in the in-memory cache and are never persisted (ADR 0016, amendment 2026-10-27).
import type { Clock } from '../../../clock';
import type { Logger } from '../../../logger';
import { SourceError, type Airport, type Route, type RouteSource } from '../model';
import { guardedFetch, type Fetch } from './http';

const BASE = 'https://hexdb.io/api/v2/routes/';

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null);

function toAirport(v: unknown): Airport {
  const a = obj(v);
  const lat = a?.latitude;
  const lon = a?.longitude;
  if (!a || typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) throw new SourceError('parse', 'airport without coordinates');
  const name = typeof a.name === 'string' ? a.name.trim() : '';
  // hexdb has no municipality: the city is the airport name without its "(International) Airport" suffix.
  const city = [name.replace(/\s+(International\s+)?Airport$/i, '').trim(), name, a.icao].find((x): x is string => typeof x === 'string' && x !== '');
  if (!city) throw new SourceError('parse', 'airport without name');
  return { name: name || city, city, lat, lon };
}

export class HexdbRouteSource implements RouteSource {
  readonly name = 'hexdb';
  private blockedUntil = 0;
  constructor(private readonly o: { fetch: Fetch; userAgent: string; timeoutMs: number; backoffMs: number; clock: Clock; log: Logger; baseUrl?: string }) {}

  async lookup(callsign: string): Promise<Route | null> {
    const now = this.o.clock.now();
    if (now < this.blockedUntil) throw new SourceError('unavailable', 'hexdb backoff after HTTP 429');
    let res: Awaited<ReturnType<Fetch>>;
    try {
      res = await guardedFetch(this.o.fetch, (this.o.baseUrl ?? BASE) + encodeURIComponent(callsign.trim()), { headers: { 'User-Agent': this.o.userAgent, Accept: 'application/json' } }, this.o.timeoutMs);
    } catch (e) {
      if (e instanceof SourceError && e.errorClass === 'http-4xx' && e.message === 'HTTP 404') return null; // {"error":{"code":"route_not_found"}}
      if (e instanceof SourceError && e.errorClass === 'http-429') {
        this.blockedUntil = now + this.o.backoffMs;
        this.o.log.warn('hexdb rate limited (429), skipping hexdb for the backoff window', { backoffMinutes: this.o.backoffMs / 60_000 });
      }
      throw e;
    }
    let body: unknown;
    try { body = JSON.parse(await res.text()); } catch { throw new SourceError('parse', 'hexdb: invalid JSON'); }
    const b = obj(body);
    const list = Array.isArray(b?.airports) && b.airports.length >= 2 ? b.airports : [b?.origin, b?.destination];
    if (!b || !b.origin || !b.destination) throw new SourceError('parse', 'hexdb: no origin/destination');
    const legs = list.map(toAirport);
    return { from: legs[0], to: legs[legs.length - 1], legs, source: 'hexdb' };
  }
}
