// Route enrichment: plausibility rule + in-memory cache (positive TTL hours, negative shorter). ADR 0005 #3/#4.
// Skeleton scope cut: the cache is in memory only (ADR 0007 asks for a table in the SQLite file; that comes with the
// VRS snapshot follow-up airspace-m3w9c, see ADR 0013). Never persist adsbdb results when a persisted cache is added (ADR 0005).
import type { Clock } from '../../clock';
import { distanceKm } from './selection';
import type { LatLon, Route, RouteSource } from './model';

export const formatRoute = (r: Route): string => `${r.from.city} → ${r.to.city}`;

/** Own check against position: the plane must lie in an ellipse-like corridor around the great circle between the airports. */
export function isPlausibleRoute(route: Route, position: LatLon): boolean {
  const { from, to } = route;
  if (typeof from.lat === 'number' && typeof from.lon === 'number' && typeof to.lat === 'number' && typeof to.lon === 'number') {
    const a = { lat: from.lat, lon: from.lon };
    const b = { lat: to.lat, lon: to.lon };
    const len = distanceKm(a, b);
    return distanceKm(a, position) + distanceKm(position, b) <= len * 1.25 + 150;
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
