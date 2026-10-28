// Flight data as shown on the info bar (display model only - the airspace BC owns the real data).
export type FlightPhase = 'level' | 'climb' | 'descent';

export interface FlightInfo {
  operator: string;
  callsign?: string;
  aircraft: string;
  registration: string;
  /** null = Route unbekannt. */
  route: string | null;
  altitudeM: number;
  speedKmh: number;
  phase: FlightPhase;
}

const PHASE_LABEL: Record<FlightPhase, string> = { level: 'Horizontalflug', climb: 'Steigflug', descent: 'Sinkflug' };

export const phaseLabel = (p: FlightPhase): string => PHASE_LABEL[p];

/** "11 300" - thousands separated by a space, as in the drafts. */
export const formatNumber = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Eyebrow line above the route: "Lufthansa · LH400 · Airbus A320neo · D-AIBI". */
export const formatEyebrow = (f: FlightInfo): string => [f.operator, f.callsign, f.aircraft, f.registration].filter(Boolean).join(' · ');

/** Phase arrow shown before the altitude: climb up, descent down, level straight on (Unicode, IBM Plex Mono has the glyphs). */
const PHASE_ARROW: Record<FlightPhase, string> = { level: '\u2192', climb: '\u2197', descent: '\u2198' };
export const phaseArrow = (p: FlightPhase): string => PHASE_ARROW[p];

/** "↗ 11 300 m" - arrow and number belong together. */
export const formatAltitude = (f: FlightInfo): string => `${phaseArrow(f.phase)} ${formatNumber(f.altitudeM)} m`;
export const formatSpeed = (f: FlightInfo): string => `${formatNumber(f.speedKmh)} km/h`;

/** Single-plane meta line: "→ 11 300 m · 870 km/h". */
export const formatMeta = (f: FlightInfo): string => `${formatAltitude(f)} · ${formatSpeed(f)}`;

/** Two-plane row stats, one line each: ["→ 11 300 m", "870 km/h"]. */
export const formatStats = (f: FlightInfo): [string, string] => [formatAltitude(f), formatSpeed(f)];

export const ROUTE_UNKNOWN = 'Route unbekannt';
export const routeOf = (f: FlightInfo): string => f.route ?? ROUTE_UNKNOWN;
