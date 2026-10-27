// Route enrichment: plausibility rule + in-memory cache (positive TTL hours, negative shorter). ADR 0005 #3/#4.
// The cache is in memory only; the persisted route cache is airspace-p2v6d (ADR 0014). Never persist adsbdb/hexdb results (ADR 0005).
import type { Clock } from '../../clock';
import { distanceKm } from './selection';
import { angleDiffDeg, bearingDeg, crossTrackKm } from './geo';
import { closedAirspaceHit, DEFAULT_CLOSED_AIRSPACES, type ClosedAirspace } from './closed-airspace';
import type { Logger } from '../../logger';
import type { AirportEntry } from './typeclass';
import type { Airport, LatLon, LookupContext, Route, RouteOrigin, RouteSource } from './model';

/** "Frankfurt (FRA)" from the own airport table; no IATA -> city only; no entry (or no ICAO / no table) -> the source's city, `onMissing(icao)` told about the gap. */
const airportLabel = (a: Airport, table?: Record<string, AirportEntry>, onMissing?: (icao: string) => void): string => {
  const e = table && a.icao ? table[a.icao.toUpperCase()] : undefined;
  if (!e) { if (table && a.icao) onMissing?.(a.icao.toUpperCase()); return a.city; }
  return e.iata ? `${e.city} (${e.iata})` : e.city;
};
export const formatRoute = (r: Route, airports?: Record<string, AirportEntry>, onMissing?: (icao: string) => void): string => (r.legs && r.legs.length > 2 ? r.legs : [r.from, r.to]).map((a) => airportLabel(a, airports, onMissing)).join(' → ');

/** Thresholds of the plausibility check (config `sources.route.plausibility`, airspace-p8w2k). */
export interface PlausibilityConfig {
  corridorBaseKm: number; corridorPercent: number; corridorMaxKm: number; originZoneKm: number; destinationZoneKm: number; minHeadingCheckAltitudeM: number;
  maxHeadingDeviationDeg: number; maxClimbDistanceKm: number; climbMetersPerKm: number; descentMetersPerKm: number; profileSlackM: number; phaseMaxAltitudeM: number; phaseMinRateMs: number;
  /** Allowed heading deviation on a detoured leg (great circle crosses a closed airspace; replaces maxHeadingDeviationDeg, corridor is skipped). */
  detourHeadingDeviationDeg: number; closedAirspaceSampleKm: number; closedAirspaces: ClosedAirspace[];
}
export const DEFAULT_PLAUSIBILITY: PlausibilityConfig = { corridorBaseKm: 50, corridorPercent: 8, corridorMaxKm: 150, originZoneKm: 60, destinationZoneKm: 80, minHeadingCheckAltitudeM: 3000, maxHeadingDeviationDeg: 65, maxClimbDistanceKm: 400, climbMetersPerKm: 150, descentMetersPerKm: 80, profileSlackM: 1500, phaseMaxAltitudeM: 8000, phaseMinRateMs: 5, detourHeadingDeviationDeg: 90, closedAirspaceSampleKm: 100, closedAirspaces: DEFAULT_CLOSED_AIRSPACES };
/** Own ADS-B observation of the plane; every field may be missing (e.g. MLAT has no track). */
export interface Observation { trackDeg?: number; verticalRateMs?: number; altitudeM?: number }

const CRUISE_CEILING_M = 12500; // above this the altitude envelope no longer constrains anything

type Pt = { lat: number; lon: number };

/** One leg a -> b passes every check: corridor (cross-track), altitude profile, flight phase, heading (the last two only far from the airports). */
function legPlausible(a: Pt, b: Pt, position: LatLon, obs: Observation, c: PlausibilityConfig, log?: Logger): boolean {
  const len = distanceKm(a, b);
  // A leg whose great circle crosses a closed airspace is flown around it: no corridor, wider heading tolerance (airspace-v4kqz).
  const detour = closedAirspaceHit(a, b, c.closedAirspaces, c.closedAirspaceSampleKm);
  if (detour) log?.log('debug', 'route plausibility', { detoured: true, airspace: detour });
  else if (crossTrackKm(a, b, position) > Math.min(c.corridorBaseKm + (c.corridorPercent / 100) * len, c.corridorMaxKm)) return false;
  const dOrigin = distanceKm(a, position), dDest = distanceKm(position, b);
  const alt = obs.altitudeM;
  if (alt !== undefined) {
    const up = c.climbMetersPerKm * dOrigin + c.profileSlackM, down = c.descentMetersPerKm * dDest + c.profileSlackM;
    if ((up < CRUISE_CEILING_M && alt > up) || (down < CRUISE_CEILING_M && alt > down)) return false;
  }
  const vr = obs.verticalRateMs;
  // A climb/descent only counts below phaseMaxAltitudeM (above it vertical rates are cruise noise / step descents), above phaseMinRateMs and beyond maxClimbDistanceKm of the airport.
  if (vr !== undefined && alt !== undefined && alt < c.phaseMaxAltitudeM && ((vr > c.phaseMinRateMs && dOrigin > c.maxClimbDistanceKm) || (vr < -c.phaseMinRateMs && dDest > c.maxClimbDistanceKm))) return false;
  if (obs.trackDeg !== undefined && alt !== undefined && alt > c.minHeadingCheckAltitudeM && dOrigin > c.originZoneKm && dDest > c.destinationZoneKm
    && angleDiffDeg(bearingDeg(position, b), obs.trackDeg) > (detour ? c.detourHeadingDeviationDeg : c.maxHeadingDeviationDeg)) return false;
  return true;
}

/** Own check against position and (optionally) own observation: the plane must lie in a cross-track corridor around the great circle of one leg and fit that leg's heading/phase/altitude profile (multi-leg: any leg passing everything). Falls back to the vendor flag when airports lack coordinates. */
export function isPlausibleRoute(route: Route, position: LatLon, obs: Observation = {}, cfg: PlausibilityConfig = DEFAULT_PLAUSIBILITY, log?: Logger): boolean {
  const legs = route.legs && route.legs.length >= 2 ? route.legs : [route.from, route.to];
  if (legs.every((l) => typeof l.lat === 'number' && typeof l.lon === 'number')) {
    return legs.slice(1).some((to, i) => legPlausible({ lat: legs[i].lat as number, lon: legs[i].lon as number }, { lat: to.lat as number, lon: to.lon as number }, position, obs, cfg, log));
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
  /** `rejected`: routes a source delivered that failed plausibility at the time; re-judged each tick against the current position, never re-asked (airspace-prwpv). */
  private cache = new Map<string, { until: number; info: RouteInfo | null; rejected?: { route: Route; source: string; origin: RouteOrigin }[] }>();
  private readonly sources: RouteSource[];
  constructor(source: RouteSource | RouteSource[], private readonly clock: Clock, private readonly o: { ttlMs: number; negativeTtlMs: number; log?: Logger; /** Ask every source and flag a conflict when two plausible routes differ; the first in order is still chosen. Default false: stop at the first plausible hit. */ compareAll?: boolean; /** Plausibility thresholds; defaults to DEFAULT_PLAUSIBILITY. */ plausibility?: PlausibilityConfig; /** Own airport table for the uniform display text; an ICAO missing from it is warned about once per process. */ airports?: Record<string, AirportEntry> }) {
    const all = Array.isArray(source) ? source : [source];
    this.sources = [...all.filter((s) => !s.lastResort), ...all.filter((s) => s.lastResort)]; // paid last-resort sources always come last (ADR 0018)
  }

  private readonly warnedIcao = new Set<string>();
  private format(r: Route): string {
    return formatRoute(r, this.o.airports, (icao) => { if (this.warnedIcao.has(icao)) return; this.warnedIcao.add(icao); this.o.log?.warn('airport missing in tables/airports.json, showing the source name', { icao }); });
  }

  /** "Frankfurt (FRA) → New York (JFK)" or null (Route unbekannt). Never throws. */
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
    if (hit && hit.until > now) {
      if (!hit.info && hit.rejected?.length) {
        const obs = { trackDeg: ctx?.trackDeg, verticalRateMs: ctx?.verticalRateMs, altitudeM: ctx?.altitudeM };
        const ok = hit.rejected.find((x) => isPlausibleRoute(x.route, position, obs, this.o.plausibility, this.o.log));
        if (ok) { // became plausible with the plane's new position: show it, no source is asked again
          const info: RouteInfo = { text: this.format(ok.route), source: ok.origin };
          this.cache.set(callsign, { until: hit.until, info });
          this.o.log?.info('route lookup', { callsign, source: info.source });
          return { info, attempts: [{ source: ok.source, outcome: 'hit' }], conflict: false, chosen: ok.source, fresh: true };
        }
      }
      return { info: hit.info, attempts: [], conflict: false, chosen: hit.info?.source ?? null, fresh: false };
    }
    let info: RouteInfo | null = null;
    let chosen: string | null = null;
    const attempts: RouteAttempt[] = [];
    const texts = new Set<string>();
    let unavailable = false;
    const rejected: { route: Route; source: string; origin: RouteOrigin }[] = [];
    const originOf = (r: Route, src: RouteSource): RouteOrigin => r.source ?? (src.name === 'hexdb' ? 'hexdb' : src.name === 'adsbdb' ? 'adsbdb' : src.name === 'flightaware' ? 'flightaware' : 'vrs');
    for (const src of this.sources) {
      if (src.lastResort && info) continue; // never pay when a free source already answered (also with compareAll)
      if (src.eligible && !src.eligible(ctx)) continue; // filtered/budget-stopped/disabled: not asked, nothing recorded
      try {
        const r = await src.lookup(callsign, position, ctx);
        if (!r) { attempts.push({ source: src.name, outcome: 'unknown' }); continue; }
        if (!isPlausibleRoute(r, position, { trackDeg: ctx?.trackDeg, verticalRateMs: ctx?.verticalRateMs, altitudeM: ctx?.altitudeM }, this.o.plausibility, this.o.log)) { attempts.push({ source: src.name, outcome: 'rejected' }); rejected.push({ route: r, source: src.name, origin: originOf(r, src) }); continue; }
        attempts.push({ source: src.name, outcome: 'hit' });
        texts.add(this.format(r));
        if (!info) { info = { text: this.format(r), source: originOf(r, src) }; chosen = src.name; }
        if (!this.o.compareAll) break;
      } catch {
        attempts.push({ source: src.name, outcome: 'unavailable' });
        unavailable = true; // unavailable is not unknown: try the next source, and do not cache a miss
      }
    }
    const conflict = texts.size > 1;
    if (!info && unavailable) return { info: null, attempts, conflict: false, chosen: null, fresh: true };
    // only a genuine "no source knows it" is cached short; a rejected route is remembered for the positive TTL and re-judged per tick
    this.cache.set(callsign, { until: now + (info || rejected.length ? this.o.ttlMs : this.o.negativeTtlMs), info, rejected: info ? undefined : rejected });
    this.o.log?.info('route lookup', { callsign, source: info?.source ?? 'none' });
    return { info, attempts, conflict, chosen, fresh: true };
  }
}
