// Closed airspaces as coarse polygons (airspace-v4kqz): a leg whose great circle crosses one is "detoured" (Umgeleitete Route).
// Operator-maintained configuration, no live NOTAM source (ADR 0001).
import type { LatLon } from './model';

export interface ClosedAirspace { name: string; since: string; note?: string; /** Corners as [lat, lon]. */ polygon: [number, number][] }

const rad = (d: number): number => (d * Math.PI) / 180;
const deg = (r: number): number => (r * 180) / Math.PI;
const R_KM = 6371.0088;

/** Great-circle points a -> b every `stepKm` (spherical interpolation), endpoints included. Longitudes normalised to -180..180. */
export function sampleGreatCircle(a: LatLon, b: LatLon, stepKm: number): LatLon[] {
  const p1 = rad(a.lat), l1 = rad(a.lon), p2 = rad(b.lat), l2 = rad(b.lon);
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2;
  const d = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  const total = d * R_KM;
  const n = Math.max(1, Math.ceil(total / stepKm));
  if (d < 1e-9) return [{ lat: a.lat, lon: a.lon }];
  const pts: LatLon[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    pts.push({ lat: deg(Math.atan2(z, Math.hypot(x, y))), lon: deg(Math.atan2(y, x)) }); // atan2 yields -180..180 already
  }
  return pts;
}

/** Ray casting on lat/lon (planar; polygons are small and stop at +-180). */
export function pointInPolygon(p: LatLon, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i], [yj, xj] = polygon[j];
    if ((yi > p.lat) !== (yj > p.lat) && p.lon < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Name of the first closed airspace the great circle a -> b touches (sampled every `sampleKm`), or null. */
export function closedAirspaceHit(a: LatLon, b: LatLon, airspaces: readonly ClosedAirspace[], sampleKm: number): string | null {
  if (airspaces.length === 0) return null;
  const pts = sampleGreatCircle(a, b, sampleKm);
  for (const z of airspaces) if (pts.some((p) => pointInPolygon(p, z.polygon))) return z.name;
  return null;
}

/** Default list (state 2026-10-27; EASA active CZIBs + safeairspace.net). Corners are deliberately coarse. A config value replaces this list entirely. */
export const DEFAULT_CLOSED_AIRSPACES: ClosedAirspace[] = [
  { name: 'Russland', since: '2022-02-28', note: 'EU/UK/CA/US-Carrier gesperrt (gegenseitig); EASA CZIB 2025-01 R3 (westlich 60° E meiden); Korean Air und JAL meiden freiwillig. Kaliningrad bewusst nicht enthalten.', polygon: [[69.5, 28.5], [82, 60], [82, 180], [64, 180], [43, 135], [50, 120], [50, 87], [42, 48], [46, 38], [52, 31], [56, 28], [60, 28]] },
  { name: 'Belarus', since: '2021-06-04', note: 'EU-Überflugverbot seit Ryanair-Zwangslandung 2021, verschärft 2022.', polygon: [[56, 23], [56, 32], [51.3, 31], [51.5, 24], [52.5, 23]] },
  { name: 'Ukraine', since: '2022-02-24', note: 'Luftraum vollständig geschlossen.', polygon: [[52.3, 24], [52, 34], [50, 40], [47, 39], [45, 33], [44, 33], [45.5, 29], [48, 22], [50, 22.5]] },
  { name: 'Iran', since: '2026-02-28', note: 'EASA CZIB 2026-04-R2 (alle Höhen meiden, gültig bis 2026-11-16); FAA-Verbot für US-Carrier.', polygon: [[39.5, 44.5], [38, 48.5], [37, 54], [37, 61], [25, 61], [25, 56], [30, 48], [33, 45]] },
  { name: 'Irak', since: '2026-02-28', note: 'EASA CZIB 2026-05-R2 (alle Höhen meiden, bis 2026-11-16); europäische Carrier umfliegen.', polygon: [[37.3, 42], [36.5, 45], [30, 48], [29, 44], [33, 38.8]] },
  { name: 'Libanon', since: '2026-02-28', note: 'EASA CZIB 2026-06-R2 (bis 2026-11-16).', polygon: [[34.7, 35.9], [34.6, 36.6], [33.1, 35.9], [33.1, 35.1]] },
  { name: 'Jordanien', since: '2026-02-28', note: 'EASA CZIB 2026-08-R3; situativ (Nahost-Eskalation 2026).', polygon: [[33.4, 35.6], [33.4, 39.3], [29.2, 36.5], [29.2, 34.9], [32.5, 35.5]] },
  { name: 'Persischer Golf und Golf von Oman', since: '2026-02-28', note: 'EASA CZIB 2026-07-R3; situativ. Nur die Gewässer, nicht VAE/Katar/Oman an Land.', polygon: [[30, 48.5], [27, 51], [26.5, 56.5], [25, 60], [23.5, 59], [25, 56], [26, 53.5], [28.5, 49.5]] },
  { name: 'Syrien', since: '2012-01-01', note: 'EASA: westlicher Teil der FIR Damaskus meiden, sonst unter FL260 verboten; einige Nahost-Airlines nutzen den Luftraum wieder, europäische Carrier meiden ihn.', polygon: [[37.3, 36], [37.3, 42], [32.5, 38.8], [33, 35.6]] },
  { name: 'Sudan', since: '2023-04-15', note: 'EASA: alle Höhen meiden; safeairspace Level 1.', polygon: [[22, 25], [22, 37], [9, 34], [9, 25]] },
  { name: 'Jemen', since: '2015-03-26', note: 'Fast gesamter Luftraum meiden; nur Küstenrouten (UT702/M999) in Nutzung.', polygon: [[19, 42], [16.5, 52.5], [12.5, 54], [12.5, 43]] },
  { name: 'Nordkorea', since: '1997-01-01', note: 'Keine Überflüge westlicher Airlines.', polygon: [[43, 124], [43, 131], [38, 130], [38, 124]] },
];
