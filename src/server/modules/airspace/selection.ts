import type { Flugzeug, LatLon } from './model';

const R_KM = 6371.0088;
const rad = (d: number): number => (d * Math.PI) / 180;

/** Great-circle (haversine) distance in km. */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface Candidate { aircraft: Flugzeug; distanceKm: number }

/**
 * Auswahl: the `count` (default 2) nearest airborne planes within the radius, nearest first.
 * Computed from the normalised model, never from vendor distance (ADR 0005).
 */
export function selectNearest(aircraft: Flugzeug[], home: LatLon, radiusKm: number, count = 2): Candidate[] {
  return aircraft
    .filter((a) => !a.onGround)
    .map((a) => ({ aircraft: a, distanceKm: distanceKm(home, a) }))
    .filter((c) => c.distanceKm <= radiusKm)
    .sort((x, y) => x.distanceKm - y.distanceKm || (x.aircraft.icao24 < y.aircraft.icao24 ? -1 : 1))
    .slice(0, count);
}
