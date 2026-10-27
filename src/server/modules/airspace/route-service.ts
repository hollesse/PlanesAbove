// Route enrichment: plausibility rule + in-memory cache (positive TTL hours, negative shorter). ADR 0005 #3/#4.
// The cache is in memory only; the persisted route cache is airspace-p2v6d (ADR 0014). Never persist adsbdb results (ADR 0005).
import type { Clock } from '../../clock';
import { distanceKm } from './selection';
import { angleDiffDeg, bearingDeg, crossTrackKm } from './geo';
import type { Logger } from '../../logger';
import type { LatLon, LookupContext, Route, RouteOrigin, RouteSource } from './model';

export const formatRoute = (r: Route): string => (r.legs && r.legs.length > 2 ? r.legs : [r.from, r.to]).map((a) => a.city).join(' → ');

/** Thresholds of the plausibility check (config `sources.route.plausibility`, airspace-p8w2k). */
export interface PlausibilityConfig {
  corridorBaseKm: number; corridorPercent: number; originZoneKm: number; destinationZoneKm: number; minHeadingCheckAltitudeM: number;
  maxHeadingDeviationDeg: number; maxClimbDistanceKm: number; climbMetersPerKm: number; descentMetersPerKm: number; profileSlackM: number;
}
export const DEFAULT_PLAUSIBILITY: PlausibilityConfig = { corridorBaseKm: 50, corridorPercent: 5, originZoneKm: 60, destinationZoneKm: 80, minHeadingCheckAltitudeM: 3000, maxHeadingDeviationDeg: 65, maxClimbDistanceKm: 250, climbMetersPerKm: 120, descentMetersPerKm: 80, profileSlackM: 600 };
/** Own ADS-B observation of the plane; every field may be missing (e.g. MLAT has no track). */
export interface Observation { trackDeg?: number; verticalRateMs?: number; altitudeM?: number }

const CRUISE_CEILING_M = 12500; // above this the altitude envelope no longer constrains anything
const PHASE_RATE_MS = 2.5; // ~500 ft/min

type Pt = { lat: number; lon: number };

/** One leg a -> b passes every check: corridor (cross-track), altitude profile, flight phase, heading (the last two only far from the airports). */
function legPlausible(a: Pt, b: Pt, position: LatLon, obs: Observation, c: PlausibilityConfig): boolean {
  const len = distanceKm(a, b);
  if (crossTrackKm(a, b, position) > c.corridorBaseKm + (c.corridorPercent / 100) * len) return false;
  const dOrigin = distanceKm(a, position), dDest = distanceKm(position, b);
  const alt = obs.altitudeM;
  if (alt !== undefined) {
    const up = c.climbMetersPerKm * dOrigin + c.profileSlackM, down = c.descentMetersPerKm * dDest + c.profileSlackM;
    if ((up < CRUISE_CEILING_M && alt > up) || (down < CRUISE_CEILING_M && alt > down)) return false;
  }
  const vr = obs.verticalRateMs;
  if (vr !== undefined && ((vr > PHASE_RATE_MS && dOrigin > c.maxClimbDistanceKm) || (vr < -PHASE_RATE_MS && dDest > c.maxClimbDistanceKm))) return false;
  if (obs.trackDeg !== undefined && alt !== undefined && alt > c.minHeadingCheckAltitudeM && dOrigin > c.originZoneKm && dDest > c.destinationZoneKm
    && angleDiffDeg(bearingDeg(position, b), obs.trackDeg) > c.maxHeadingDeviationDeg) return false;
  return true;
}

/** Own check against position and (optionally) own observation: the plane must lie in a cross-track corridor around the great circle of one leg and fit that leg's heading/phase/altitude profile (multi-leg: any leg passing everything). Falls back to the vendor flag when airports lack coordinates. */
export function isPlausibleRoute(route: Route, position: LatLon, obs: Observation = {}, cfg: PlausibilityConfig = DEFAULT_PLAUSIBILITY): boolean {
  const legs = route.legs && route.legs.length >= 2 ? route.legs : [route.from, route.to];
  if (legs.every((l) => typeof l.lat === 'number' && typeof l.lon === 'number')) {
    return legs.slice(1).some((to, i) => legPlausible({ lat: legs[i].lat as number, lon: legs[i].lon as number }, { lat: to.lat as number, lon: to.lon as number }, position, obs, cfg));
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
  constructor(source: RouteSource | RouteSource[], private readonly clock: Clock, private readonly o: { ttlMs: number; negativeTtlMs: number; log?: Logger; /** Ask every source and flag a conflict when two plausible routes differ; the first in order is still chosen. Default false: stop at the first plausible hit. */ compareAll?: boolean; /** Plausibility thresholds; defaults to DEFAULT_PLAUSIBILITY. */ plausibility?: PlausibilityConfig }) {
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
        if (!isPlausibleRoute(r, position, { trackDeg: ctx?.trackDeg, verticalRateMs: ctx?.verticalRateMs, altitudeM: ctx?.altitudeM }, this.o.plausibility)) { attempts.push({ source: src.name, outcome: 'rejected' }); continue; }
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
