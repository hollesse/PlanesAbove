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

/** Single-plane meta line: "11 300 m hoch · 870 km/h · im Horizontalflug". */
export const formatMeta = (f: FlightInfo): string => `${formatNumber(f.altitudeM)} m hoch · ${formatNumber(f.speedKmh)} km/h · im ${phaseLabel(f.phase)}`;

/** Two-plane row stats: ["11 300 m · 870 km/h", "Horizontalflug"]. */
export const formatStats = (f: FlightInfo): [string, string] => [`${formatNumber(f.altitudeM)} m · ${formatNumber(f.speedKmh)} km/h`, phaseLabel(f.phase)];

export const ROUTE_UNKNOWN = 'Route unbekannt';
export const routeOf = (f: FlightInfo): string => f.route ?? ROUTE_UNKNOWN;
