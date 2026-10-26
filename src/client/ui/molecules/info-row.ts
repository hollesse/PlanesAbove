import { renderBadge } from '../atoms/badge';
import { h } from '../dom';
import { formatEyebrow, formatStats, routeOf, type FlightInfo } from '../domain/flight';

/** Molecule: one info line (badge, route + operator line, stats) as used when two planes share the bar. */
export function renderInfoRow({ n, flight }: { n: number; flight: FlightInfo }): HTMLElement {
  const [alt, phase] = formatStats(flight);
  return h(
    'div',
    { class: 'pa-info-row' },
    renderBadge({ n }),
    h('div', { class: 'pa-info-row-text' }, h('div', { class: 'pa-route-large', text: routeOf(flight) }), h('div', { class: 'pa-eyebrow', text: formatEyebrow(flight) })),
    h('div', { class: 'pa-info-row-stats' }, h('span', { text: alt }), h('span', { text: phase })),
  );
}
