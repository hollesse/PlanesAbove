// Route enrichment: plausibility rule + in-memory cache (positive TTL hours, negative shorter). ADR 0005 #3/#4.
// The cache is in memory only; the persisted route cache is airspace-p2v6d (ADR 0014). Never persist adsbdb results (ADR 0005).
import type { Clock } from '../../clock';
import { distanceKm } from './selection';
import type { Logger } from '../../logger';
import type { LatLon, LookupContext, Route, RouteOrigin, RouteSource } from './model';

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

/** What one source said in one lookup: hit (plausible route), unknown (null), unavailable (threw), rejected (implausible). Findings only, no route data. */
export type LookupOutcome = 'hit' | 'unknown' | 'unavailable' | 'rejected';
export interface RouteAttempt { source: string; outcome: LookupOutcome }
/** Result of one `lookupFor`. `fresh` is false for cache hits (no sources were asked, nothing to record). `chosen` is the name of the source whose route was taken. */
export interface RouteLookup { info: RouteInfo | null; attempts: RouteAttempt[]; conflict: boolean; chosen: string | null; fresh: boolean }

export class RouteService {
  private cache = new Map<string, { until: number; info: RouteInfo | null }>();
  private readonly sources: RouteSource[];
  constructor(source: RouteSource | RouteSource[], private readonly clock: Clock, private readonly o: { ttlMs: number; negativeTtlMs: number; log?: Logger; /** Ask every source and flag a conflict when two plausible routes differ; the first in order is still chosen. Default false: stop at the first plausible hit. */ compareAll?: boolean }) {
    const all = Array.isArray(source) ? source : [source];
    this.sources = [...all.filter((s) => !s.lastResort), ...all.filter((s) => s.lastResort)]; // paid last-resort sources always come last (ADR 0018)
  }

  /** "Frankfurt → New York" or null (Route unbekannt). Never throws. */
  async routeFor(callsign: string | undefined, position: LatLon, ctx?: LookupContext): Promise<string | null> {
    return (await this.routeInfoFor(callsign, position, ctx))?.text ?? null;
  }

  /** Route text plus the answering source, asking the chain in order. Every route must pass `isPlausibleRoute`. Never throws. */
  async routeInfoFor(callsign: string | undefined, position: LatLon, ctx?: LookupContext): Promise<RouteInfo | null> {
    return (await this.lookupFor(callsign, position, ctx))?.info ?? null;
  }

  /** Like `routeInfoFor`, plus the per-source findings of this lookup (for the sighting log). null when there is no callsign. Never throws. */
  async lookupFor(callsign: string | undefined, position: LatLon, ctx?: LookupContext): Promise<RouteLookup | null> {
    if (!callsign) return null;
    const now = this.clock.now();
    const hit = this.cache.get(callsign);
    if (hit && hit.until > now) return { info: hit.info, attempts: [], conflict: false, chosen: hit.info?.source ?? null, fresh: false };
    let info: RouteInfo | null = null;
    let chosen: string | null = null;
    const attempts: RouteAttempt[] = [];
    const texts = new Set<string>();
    let unavailable = false;
    for (const src of this.sources) {
      if (src.lastResort && info) continue; // never pay when a free source already answered (also with compareAll)
      if (src.eligible && !src.eligible(ctx)) continue; // filtered/budget-stopped/disabled: not asked, nothing recorded
      try {
        const r = await src.lookup(callsign, position, ctx);
        if (!r) { attempts.push({ source: src.name, outcome: 'unknown' }); continue; }
        if (!isPlausibleRoute(r, position)) { attempts.push({ source: src.name, outcome: 'rejected' }); continue; }
        attempts.push({ source: src.name, outcome: 'hit' });
        texts.add(formatRoute(r));
        if (!info) { info = { text: formatRoute(r), source: r.source ?? (src.name === 'adsbdb' ? 'adsbdb' : src.name === 'flightaware' ? 'flightaware' : 'vrs') }; chosen = src.name; }
        if (!this.o.compareAll) break;
      } catch {
        attempts.push({ source: src.name, outcome: 'unavailable' });
        unavailable = true; // unavailable is not unknown: try the next source, and do not cache a miss
      }
    }
    const conflict = texts.size > 1;
    if (!info && unavailable) return { info: null, attempts, conflict: false, chosen: null, fresh: true };
    this.cache.set(callsign, { until: now + (info ? this.o.ttlMs : this.o.negativeTtlMs), info });
    this.o.log?.info('route lookup', { callsign, source: info?.source ?? 'none' });
    return { info, attempts, conflict, chosen, fresh: true };
  }
}
