import { renderBadge } from '../atoms/badge';
import { h } from '../dom';
import { renderAltitude } from '../atoms/altitude';
import { formatEyebrow, formatSpeed, routeOf, type FlightInfo } from '../domain/flight';

/** Molecule: one info line (badge, route + operator line, stats) as used when two planes share the bar. */
export function renderInfoRow({ n, flight }: { n: number; flight: FlightInfo }): HTMLElement {
  return h(
    'div',
    { class: 'pa-info-row' },
    renderBadge({ n }),
    h('div', { class: 'pa-info-row-text' }, h('div', { class: 'pa-route-large', text: routeOf(flight) }), h('div', { class: 'pa-eyebrow', text: formatEyebrow(flight) })),
    h('div', { class: 'pa-info-row-stats' }, renderAltitude(flight), h('span', { class: 'pa-speed', text: formatSpeed(flight) })),
  );
}
