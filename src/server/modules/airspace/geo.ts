import type { LatLon } from './model';

const rad = (d: number): number => (d * Math.PI) / 180;
const deg = (r: number): number => (r * 180) / Math.PI;

/** Point `km` away from `from` on initial bearing `bearingDeg` (spherical earth). */
export function destinationPoint(from: LatLon, km: number, bearingDeg: number): LatLon {
  const d = km / 6371.0088;
  const b = rad(bearingDeg);
  const lat1 = rad(from.lat);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lon2 = rad(from.lon) + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: deg(lat2), lon: deg(lon2) };
}

/** Initial great-circle bearing from `from` to `to`, degrees 0..360. */
export function bearingDeg(from: LatLon, to: LatLon): number {
  const p1 = rad(from.lat), p2 = rad(to.lat), dl = rad(to.lon - from.lon);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** Smallest absolute angle between two bearings, 0..180. */
export const angleDiffDeg = (a: number, b: number): number => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

const R_KM = 6371.0088;
const haversineKm = (a: LatLon, b: LatLon): number => {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** Distance of `p` from the great-circle segment a-b (cross-track; beyond an end the distance to that end). */
export function crossTrackKm(a: LatLon, b: LatLon, p: LatLon): number {
  const d13 = haversineKm(a, p) / R_KM;
  const xt = Math.asin(Math.max(-1, Math.min(1, Math.sin(d13) * Math.sin(rad(bearingDeg(a, p) - bearingDeg(a, b)))))) * R_KM;
  const along = Math.acos(Math.max(-1, Math.min(1, Math.cos(d13) / Math.cos(xt / R_KM)))) * R_KM;
  const len = haversineKm(a, b);
  const behind = Math.abs(angleDiffDeg(bearingDeg(a, p), bearingDeg(a, b))) > 90;
  if (behind) return haversineKm(a, p);
  if (along > len) return haversineKm(b, p);
  return Math.abs(xt);
}
