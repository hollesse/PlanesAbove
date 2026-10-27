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
