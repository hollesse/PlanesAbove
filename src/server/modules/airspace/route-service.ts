// Route enrichment: plausibility rule + in-memory cache (positive TTL hours, negative shorter). ADR 0005 #3/#4.
// The cache is in memory only; the persisted route cache is airspace-p2v6d (ADR 0014). Never persist adsbdb results (ADR 0005).
import type { Clock } from '../../clock';
import { distanceKm } from './selection';
import type { Logger } from '../../logger';
import type { LatLon, Route, RouteOrigin, RouteSource } from './model';

export const formatRoute = (r: Route): string => (r.legs && r.legs.length > 2 ? r.legs : [r.from, r.to]).map((a) => a.city).join(' → ');

/** Own check against position: the plane must lie in an ellipse-like corridor around the great circle of one leg (multi-leg: any leg). */
export function isPlausibleRoute(route: Route, position: LatLon): boolean {
  const legs = route.legs && route.legs.length >= 2 ? route.legs : [route.from, route.to];
  if (legs.every((l) => typeof l.lat === 'number' && typeof l.lon === 'number')) {
    return legs.slice(1).some((to, i) => {
      const a = { lat: legs[i].lat as number, lon: legs[i].lon as number };
      const b = { lat: to.lat as number, lon: to.lon as number };
      return distanceKm(a, position) + distanceKm(position, b) <= distanceKm(a, b) * 1.25 + 150;
    });
  }
  return route.vendorPlausible !== false;
}

export interface RouteInfo { text: string; source: RouteOrigin }

export class RouteService {
  private cache = new Map<string, { until: number; info: RouteInfo | null }>();
  private readonly sources: RouteSource[];
  constructor(source: RouteSource | RouteSource[], private readonly clock: Clock, private readonly o: { ttlMs: number; negativeTtlMs: number; log?: Logger }) {
    this.sources = Array.isArray(source) ? source : [source];
  }

  /** "Frankfurt → New York" or null (Route unbekannt). Never throws. */
  async routeFor(callsign: string | undefined, position: LatLon): Promise<string | null> {
    return (await this.routeInfoFor(callsign, position))?.text ?? null;
  }

  /** Route text plus the answering source, asking the chain in order. Every route must pass `isPlausibleRoute`. Never throws. */
  async routeInfoFor(callsign: string | undefined, position: LatLon): Promise<RouteInfo | null> {
    if (!callsign) return null;
    const now = this.clock.now();
    const hit = this.cache.get(callsign);
    if (hit && hit.until > now) return hit.info;
    let info: RouteInfo | null = null;
    let unavailable = false;
    for (const src of this.sources) {
      try {
        const r = await src.lookup(callsign, position);
        if (r && isPlausibleRoute(r, position)) { info = { text: formatRoute(r), source: r.source ?? (src.name === 'adsbdb' ? 'adsbdb' : 'vrs') }; break; }
      } catch {
        unavailable = true; // unavailable is not unknown: try the next source, and do not cache a miss
      }
    }
    if (!info && unavailable) return null;
    this.cache.set(callsign, { until: now + (info ? this.o.ttlMs : this.o.negativeTtlMs), info });
    this.o.log?.info('route lookup', { callsign, source: info?.source ?? 'none' });
    return info;
  }
}
