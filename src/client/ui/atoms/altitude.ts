import { h } from '../dom';
import { formatNumber, phaseArrow, phaseLabel, type FlightInfo } from '../domain/flight';

/** Atom: "↗ 11 300 m" as one non-wrapping element; the arrow carries the phase word as aria-label/title. */
export function renderAltitude(f: FlightInfo): HTMLElement {
  const label = phaseLabel(f.phase);
  return h(
    'span',
    { class: 'pa-alt' },
    h('span', { class: 'pa-phase', text: phaseArrow(f.phase), attrs: { role: 'img', 'aria-label': label, title: label } }),
    ` ${formatNumber(f.altitudeM)} m`,
  );
}
