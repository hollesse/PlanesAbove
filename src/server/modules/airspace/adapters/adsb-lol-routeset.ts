// RouteSource adapter for adsb.lol POST /api/0/routeset (ADR 0005). The response schema is not officially documented; this
// adapter is built against recorded/constructed fixtures. A live probe returned HTTP 201 with an empty body -> Route unbekannt.
import { SourceError, type LatLon, type Route, type RouteSource } from '../model';
import { guardedFetch, type Fetch } from './http';

interface RoutesetEntry { callsign?: string; plausible?: boolean; _airports?: { name?: string; location?: string; lat?: number; lon?: number }[] }

export class AdsbLolRouteSource implements RouteSource {
  readonly name = 'adsb-lol-routeset';
  constructor(private readonly o: { fetch: Fetch; baseUrl?: string; userAgent: string; timeoutMs: number }) {}

  async lookup(callsign: string, position: LatLon): Promise<Route | null> {
    const url = `${this.o.baseUrl ?? 'https://api.adsb.lol'}/api/0/routeset`;
    const body = JSON.stringify({ planes: [{ callsign, lat: position.lat, lng: position.lon }] });
    const res = await guardedFetch(this.o.fetch, url, { method: 'POST', headers: { 'user-agent': this.o.userAgent, 'content-type': 'application/json' }, body }, this.o.timeoutMs);
    const text = (await res.text()).trim();
    if (!text) return null;
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { throw new SourceError('parse', 'response is not JSON'); }
    if (!Array.isArray(parsed)) return null;
    const entry = (parsed as RoutesetEntry[]).find((e) => e.callsign === callsign);
    const airports = entry?._airports;
    if (!entry || !Array.isArray(airports) || airports.length < 2) return null;
    const conv = (a: (typeof airports)[number]) => ({ name: a.name ?? a.location ?? '', city: a.location ?? a.name ?? '', lat: a.lat, lon: a.lon });
    return { from: conv(airports[0]), to: conv(airports[airports.length - 1]), vendorPlausible: entry.plausible };
  }
}
