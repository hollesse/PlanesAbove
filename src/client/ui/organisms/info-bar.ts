import { renderAltitude } from '../atoms/altitude';
import { h } from '../dom';
import { formatEyebrow, formatSpeed, ROUTE_UNKNOWN, type FlightInfo } from '../domain/flight';
import { renderInfoRow } from '../molecules/info-row';

/** The four Info-Leisten-Zustände. */
export type InfoBarProps =
  | { variant: 'single'; flight: FlightInfo } // one plane; route known or unknown (flight.route === null)
  | { variant: 'double'; flights: [FlightInfo, FlightInfo] }
  | { variant: 'recent'; text: string }; // slim "Zuletzt" bar when no plane is up

export type InfoBarState = 'single-known' | 'single-unknown' | 'double' | 'recent';

export const infoBarState = (p: InfoBarProps): InfoBarState => (p.variant === 'single' ? (p.flight.route ? 'single-known' : 'single-unknown') : p.variant);

/** Organism: the info bar at the bottom of a screen. Absolutely positioned inside a `.pa-screen`. */
export function renderInfoBar(props: InfoBarProps): HTMLElement {
  const state = infoBarState(props);
  if (props.variant === 'recent') {
    return h('div', { class: 'pa-bar pa-bar-recent', data: { state } }, h('div', { class: 'pa-meta-small', text: props.text }));
  }
  if (props.variant === 'double') {
    return h('div', { class: 'pa-bar pa-bar-double', data: { state } }, renderInfoRow({ n: 1, flight: props.flights[0] }), renderInfoRow({ n: 2, flight: props.flights[1] }));
  }
  const f = props.flight;
  return h(
    'div',
    { class: 'pa-bar pa-bar-single', data: { state } },
    h(
      'div',
      { class: 'pa-bar-text' },
      h('div', { class: 'pa-eyebrow', text: formatEyebrow(f) }),
      h('div', { class: `pa-route-large${f.route ? '' : ' pa-route-unknown'}`, text: f.route ?? ROUTE_UNKNOWN }),
      h('div', { class: 'pa-meta-small' }, renderAltitude(f), ` · ${formatSpeed(f)}`),
    ),
  );
}
