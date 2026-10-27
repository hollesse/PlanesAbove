// Route enrichment: plausibility rule + in-memory cache (positive TTL hours, negative shorter). ADR 0005 #3/#4.
// The cache is in memory only; the persisted route cache is airspace-p2v6d (ADR 0014). Never persist adsbdb results (ADR 0005).
import type { Clock } from '../../clock';
import { distanceKm } from './selection';
import type { LatLon, Route, RouteSource } from './model';

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

export class RouteService {
  private cache = new Map<string, { until: number; text: string | null }>();
  constructor(private readonly source: RouteSource, private readonly clock: Clock, private readonly o: { ttlMs: number; negativeTtlMs: number }) {}

  /** "Frankfurt → New York" or null (Route unbekannt). Never throws. */
  async routeFor(callsign: string | undefined, position: LatLon): Promise<string | null> {
    if (!callsign) return null;
    const now = this.clock.now();
    const hit = this.cache.get(callsign);
    if (hit && hit.until > now) return hit.text;
    let text: string | null = null;
    try {
      const r = await this.source.lookup(callsign, position);
      text = r && isPlausibleRoute(r, position) ? formatRoute(r) : null;
    } catch {
      return null; // source failure is not cached: ask again at the next Takt
    }
    this.cache.set(callsign, { until: now + (text ? this.o.ttlMs : this.o.negativeTtlMs), text });
    return text;
  }
}
