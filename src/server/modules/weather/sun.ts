// Tageszeit from the locally computed sun position (ADR 0006): no network, works offline.
import type { SkyTime } from '../../../client/ui/domain/catalog';

const RAD = Math.PI / 180;
const norm360 = (deg: number): number => ((deg % 360) + 360) % 360;

export interface SunPosition {
  /** Solar elevation above the horizon in degrees (no refraction correction). */
  elevationDeg: number;
  /** Local hour angle in degrees, -180..180: negative before solar noon (sun rising), positive after (sun falling). */
  hourAngleDeg: number;
}

/** Low-precision solar position (Astronomical Almanac / NOAA style, about 0.01 deg between 1950 and 2050); plenty for picking a sky. */
export function sunPosition(ms: number, lat: number, lon: number): SunPosition {
  const n = ms / 86_400_000 + 2440587.5 - 2451545.0; // days since J2000.0
  const meanLon = norm360(280.46 + 0.9856474 * n);
  const g = norm360(357.528 + 0.9856003 * n) * RAD;
  const eclLon = (meanLon + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const obliquity = (23.439 - 0.0000004 * n) * RAD;
  const ra = Math.atan2(Math.cos(obliquity) * Math.sin(eclLon), Math.cos(eclLon)) / RAD;
  const dec = Math.asin(Math.sin(obliquity) * Math.sin(eclLon));
  const gmst = norm360(280.46061837 + 360.98564736629 * n);
  const hourAngleDeg = norm360(gmst + lon - ra + 180) - 180;
  const phi = lat * RAD;
  const elevationDeg = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngleDeg * RAD)) / RAD;
  return { elevationDeg, hourAngleDeg };
}

export interface SunThresholds {
  /** Below this elevation it is Nacht (default -6 deg, end of civil twilight). */
  nightBelowDeg: number;
  /** Above this elevation it is Tag (default +4 deg); in between Morgen- or Abenddämmerung. */
  dayAboveDeg: number;
}

export const DEFAULT_SUN_THRESHOLDS: SunThresholds = { nightBelowDeg: -6, dayAboveDeg: 4 };

/** Tageszeit at `ms` for the location: Nacht / Tag by elevation, Dämmerung split by direction (before solar noon = Morgen, after = Abend). */
export function skyTimeAt(ms: number, location: { lat: number; lon: number }, t: SunThresholds = DEFAULT_SUN_THRESHOLDS): SkyTime {
  const { elevationDeg, hourAngleDeg } = sunPosition(ms, location.lat, location.lon);
  if (elevationDeg < t.nightBelowDeg) return 'night';
  if (elevationDeg > t.dayAboveDeg) return 'day';
  return hourAngleDeg < 0 ? 'dawn' : 'dusk';
}
