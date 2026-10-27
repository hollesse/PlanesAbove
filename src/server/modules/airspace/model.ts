// Airspace BC: the normalised internal model. Vendor fields never leave the adapters (ADR 0005).
export interface LatLon { lat: number; lon: number }

export type FlightPhase = 'level' | 'climb' | 'descent';

/** A Flugzeug as the domain sees it. */
export interface Flugzeug {
  icao24: string;
  callsign?: string;
  /** ICAO type designator, e.g. A20N. */
  typeCode?: string;
  registration?: string;
  /** ADS-B emitter category A1..A7 (often absent). */
  emitterCategory?: string;
  lat: number;
  lon: number;
  onGround: boolean;
  altitudeM?: number;
  speedKmh?: number;
  /** m/s, positive = climbing. */
  verticalRateMs?: number;
  trackDeg?: number;
}

export type RouteOrigin = 'vrs' | 'adsbdb' | 'flightaware';

/** Facts about the aircraft that a paid last-resort source needs before it may be asked (ADR 0018). Passed in by the caller; the chain itself only knows callsign + position. */
/** Per-plane context for a route lookup. The observation fields (own ADS-B data) let the plausibility check use heading and flight phase as arbiter (airspace-p8w2k). */
export interface LookupContext { typklasse: string; airlineKnown: boolean; altitudeM?: number; verticalRateMs?: number; trackDeg?: number }

export interface Airport { name: string; city: string; lat?: number; lon?: number }

/** A known route; "Route unbekannt" is represented by `null` at the port. */
export interface Route { from: Airport; to: Airport; /** All airports in order for multi-leg routes (first = from, last = to). */ legs?: Airport[]; /** A source's own plausibility flag - a weak heuristic, used only when airports lack coordinates (ADR 0005). */ vendorPlausible?: boolean; /** Which source answered; adsbdb results are never persisted (ADR 0016); vrs and flightaware may be. */ source?: RouteOrigin }

export type SourceErrorClass = 'timeout' | 'network' | 'http-403' | 'http-429' | 'http-4xx' | 'http-5xx' | 'parse' | 'unavailable';

export class SourceError extends Error {
  /** `retryAfterMs`: the source asked (or is known to need) a pause of at least this long; the FlightSourceChain blocks the source for it (ADR 0019). */
  constructor(public readonly errorClass: SourceErrorClass, message?: string, public readonly retryAfterMs?: number) { super(message ?? errorClass); }
}

export interface FlightSource {
  readonly name: string;
  /** All aircraft within `radiusKm` of `center`. Throws SourceError. */
  fetchAircraft(center: LatLon, radiusKm: number): Promise<Flugzeug[]>;
}

export interface RouteSource {
  readonly name: string;
  /** null = genuinely unknown ("unknown"). Throws SourceError when the source is unavailable (no snapshot, network, 429, ...): unavailable is not unknown (ADR 0016). */
  lookup(callsign: string, position: LatLon, ctx?: LookupContext): Promise<Route | null>;
  /** Paid last-resort source (ADR 0018): only asked when no earlier source produced a plausible route, and always ordered after the free ones. */
  readonly lastResort?: boolean;
  /** When defined and false, the chain does not ask this source at all (no attempt recorded) - filter, budget or disabled state. */
  eligible?(ctx?: LookupContext): boolean;
}
