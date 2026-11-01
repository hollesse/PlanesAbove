// Groessenfaktor je Typklasse (design-system-q7mxe, Betreiber-Entscheidung 2026-11-01, Variante "Deutlich").
// Rein ueber Skalierung der fertigen Silhouette im Slot; die Typklassen-SVGs selbst bleiben unveraendert.
//
// Herleitung: Ziel ist die sichtbare Rumpflaenge relativ zur Narrowbody (`length`). Die Narrowbody fuellt NARROWBODY_FILL der
// Slotbreite (65 %, damit der Double-Decker mit 130 % ohne Beschnitt hineinpasst). Weil die SVGs unterschiedlich breit gezeichnet
// sind (`drawn`, gemessen per getBBox in einer viewBox der Breite `vbW`), ergibt sich die Breite des Silhouetten-Elements als
//   Zielbreite / (drawn / vbW)   mit   Zielbreite = NARROWBODY_FILL * length   (Anteile der Slotbreite).
// `x` ist der linke Rand der gezeichneten Flaeche, `vbX` der der viewBox; daraus folgt der Versatz, der die gezeichnete Flaeche mittig im Slot haelt.
import type { PlaneType } from './catalog';

export const NARROWBODY_FILL = 0.65;

export interface PlaneSize { length: number; drawn: number; x: number; vbX: number; vbW: number }

export const PLANE_SIZE: Record<PlaneType, PlaneSize> = {
  'double-decker': { length: 1.3, drawn: 991, x: 9, vbX: 0, vbW: 1000 },
  'jumbo-hump': { length: 1.25, drawn: 985, x: 15, vbX: 0, vbW: 1000 },
  widebody: { length: 1.2, drawn: 973, x: 27, vbX: 0, vbW: 1000 },
  narrowbody: { length: 1, drawn: 938, x: 62, vbX: 0, vbW: 1000 },
  'regional-jet': { length: 0.85, drawn: 850, x: 150, vbX: 0, vbW: 1000 },
  turboprop: { length: 0.8, drawn: 860, x: 140, vbX: 0, vbW: 1000 },
  helicopter: { length: 0.75, drawn: 914, x: 66, vbX: -310, vbW: 1620 },
  'business-jet': { length: 0.65, drawn: 564, x: 304, vbX: 0, vbW: 1000 },
  'light-aircraft': { length: 0.5, drawn: 306, x: 365, vbX: 0, vbW: 1000 },
  glider: { length: 0.5, drawn: 350, x: 340, vbX: 0, vbW: 1000 },
};

/** Width of the silhouette element and its left margin, both as a fraction of the slot width (drawn area centred in the slot). */
export function planeBox(type: PlaneType): { width: number; marginLeft: number } {
  const s = PLANE_SIZE[type];
  const visible = s.drawn / s.vbW;
  const width = (NARROWBODY_FILL * s.length) / visible;
  const centre = (s.x + s.drawn / 2 - s.vbX) / s.vbW;
  return { width, marginLeft: 0.5 - centre * width };
}
