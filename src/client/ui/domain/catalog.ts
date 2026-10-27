// Domain vocabulary of the design system (see design-system BC README): Typklasse, Tageszeit, Wetterlage, Himmel.

export const PLANE_TYPES = [
  { id: 'narrowbody', label: 'Narrowbody' },
  { id: 'widebody', label: 'Widebody' },
  { id: 'jumbo-hump', label: 'Jumbo (Hump)' },
  { id: 'double-decker', label: 'Double-Decker' },
  { id: 'regional-jet', label: 'Regional-Jet' },
  { id: 'turboprop', label: 'Turboprop' },
  { id: 'business-jet', label: 'Business-Jet' },
  { id: 'light-aircraft', label: 'Light Aircraft' },
  { id: 'glider', label: 'Glider' },
  { id: 'helicopter', label: 'Helicopter' },
] as const;
export type PlaneType = (typeof PLANE_TYPES)[number]['id'];
export const PLANE_TYPE_IDS: readonly PlaneType[] = PLANE_TYPES.map((t) => t.id);

/** Typklassen without airline liveries: only the unpainted default exists (as in the drafts). */
export const NO_LIVERY_TYPES: readonly PlaneType[] = ['light-aircraft', 'glider'];

export const SKY_TIMES = [
  { id: 'dawn', label: 'Morgendämmerung' },
  { id: 'day', label: 'Tag' },
  { id: 'dusk', label: 'Abenddämmerung' },
  { id: 'night', label: 'Nacht' },
] as const;
export type SkyTime = (typeof SKY_TIMES)[number]['id'];

export const SKY_WEATHERS = [
  { id: 'clear', label: 'Klar' },
  { id: 'light', label: 'Leicht bewölkt' },
  { id: 'overcast', label: 'Bedeckt' },
  { id: 'fog', label: 'Nebel' },
  { id: 'rain', label: 'Regen' },
  { id: 'snow', label: 'Schnee' },
  { id: 'storm', label: 'Gewitter' },
] as const;
export type SkyWeather = (typeof SKY_WEATHERS)[number]['id'];

export interface SkyKey { time: SkyTime; weather: SkyWeather }

export const skyId = ({ time, weather }: SkyKey): string => `${time}-${weather}`;

/** All 28 Himmel (Tageszeit x Wetterlage). */
export const ALL_SKIES: readonly SkyKey[] = SKY_TIMES.flatMap((t) => SKY_WEATHERS.map((w) => ({ time: t.id, weather: w.id })));

export type Ink = 'dark' | 'light';

/**
 * Himmel-Tinte: colour of the text laid over a sky. Light ink on dusk, night, rain and storm skies
 * (as in the Screens drafts), dark ink otherwise.
 */
export function skyInk({ time, weather }: SkyKey): Ink {
  if (time === 'dusk' || time === 'night') return 'light';
  if (weather === 'rain' || weather === 'storm') return 'light';
  return 'dark';
}
