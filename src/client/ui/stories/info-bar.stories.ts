import type { Meta, StoryObj } from '@storybook/html-vite';
import { SAMPLE_FLIGHTS, RECENT_TEXT } from '../domain/samples';
import type { ScreenAspect } from '../templates/screen';
import { renderInfoBar, type InfoBarProps } from '../organisms/info-bar';
import { h } from '../dom';
import { aspectControl, skyStage } from './helpers';

const meta: Meta<{ aspect: ScreenAspect }> = { title: 'Organisms/Info-Leiste', args: { aspect: '4:3' }, argTypes: { aspect: aspectControl } };
export default meta;

const story = (props: InfoBarProps): StoryObj<{ aspect: ScreenAspect }> => ({
  render: (a) => skyStage({ time: 'day', weather: 'light' }, a.aspect, renderInfoBar(props)),
});

export const EinFlugzeugRouteBekannt = { ...story({ variant: 'single', flight: SAMPLE_FLIGHTS.A }), name: 'Ein Flugzeug · Route bekannt' };
export const EinFlugzeugRouteUnbekannt = { ...story({ variant: 'single', flight: SAMPLE_FLIGHTS.B }), name: 'Ein Flugzeug · Route unbekannt' };
export const ZweiFlugzeuge = { ...story({ variant: 'double', flights: [SAMPLE_FLIGHTS.C, SAMPLE_FLIGHTS.D] }), name: 'Zwei Flugzeuge' };
export const Zuletzt = { ...story({ variant: 'recent', text: RECENT_TEXT }), name: 'Schmale „Zuletzt“-Leiste' };

// Benchmark route of two long labels from tables/airports.json (ADR 0021). tests/e2e/long-route.spec.ts checks this text against the table.
const LONGEST_ROUTE = 'Santiago de Compostela (SCQ) → Jerez de la Frontera (XRY)';
const longest = (flights: InfoBarProps): HTMLElement =>
  h('div', { class: 'pa-longest-route', style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:24px' },
    ...(['4:3', '5:3'] as ScreenAspect[]).map((aspect) => h('div', { style: 'min-width:0', data: { aspect } }, skyStage({ time: 'day', weather: 'light' }, aspect, renderInfoBar(flights)))));

export const LaengsteRouteEinzel = {
  render: () => longest({ variant: 'single', flight: { ...SAMPLE_FLIGHTS.A, operator: 'Iberia', callsign: 'IB1234', route: LONGEST_ROUTE, phase: 'climb' } }),
  name: 'Längste Route · Ein Flugzeug (4:3 und 5:3)',
};
export const LaengsteRouteZwei = {
  render: () => longest({ variant: 'double', flights: [{ ...SAMPLE_FLIGHTS.C, route: LONGEST_ROUTE }, { ...SAMPLE_FLIGHTS.D, route: LONGEST_ROUTE }] }),
  name: 'Längste Route · Zwei Flugzeuge (4:3 und 5:3)',
};
