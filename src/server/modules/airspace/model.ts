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

export type RouteOrigin = 'vrs' | 'adsbdb';

export interface Airport { name: string; city: string; lat?: number; lon?: number }

/** A known route; "Route unbekannt" is represented by `null` at the port. */
export interface Route { from: Airport; to: Airport; /** All airports in order for multi-leg routes (first = from, last = to). */ legs?: Airport[]; /** A source's own plausibility flag - a weak heuristic, used only when airports lack coordinates (ADR 0005). */ vendorPlausible?: boolean; /** Which source answered; adsbdb results are never persisted (ADR 0016). */ source?: RouteOrigin }

export type SourceErrorClass = 'timeout' | 'network' | 'http-403' | 'http-429' | 'http-4xx' | 'http-5xx' | 'parse' | 'unavailable';

export class SourceError extends Error {
  constructor(public readonly errorClass: SourceErrorClass, message?: string) { super(message ?? errorClass); }
}

export interface FlightSource {
  readonly name: string;
  /** All aircraft within `radiusKm` of `center`. Throws SourceError. */
  fetchAircraft(center: LatLon, radiusKm: number): Promise<Flugzeug[]>;
}

export interface RouteSource {
  readonly name: string;
  /** null = genuinely unknown ("unknown"). Throws SourceError when the source is unavailable (no snapshot, network, 429, ...): unavailable is not unknown (ADR 0016). */
  lookup(callsign: string, position: LatLon): Promise<Route | null>;
}
