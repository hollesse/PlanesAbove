import type { Meta, StoryObj } from '@storybook/html-vite';
import { h } from '../dom';
import type { FlightInfo } from '../domain/flight';
import { SAMPLE_FLIGHTS, type SampleKey } from '../domain/samples';
import { renderInfoRow } from '../molecules/info-row';

const meta: Meta = { title: 'Molecules/Info-Zeile' };
export default meta;

export const InfoZeile: StoryObj<{ n: number; flight: SampleKey }> = {
  name: 'Eine Zeile mit Plakette',
  args: { n: 1, flight: 'A' },
  argTypes: { n: { control: 'inline-radio', options: [1, 2] }, flight: { control: 'select', options: Object.keys(SAMPLE_FLIGHTS) } },
  render: (a) => h('div', { style: 'container-type:inline-size;max-width:900px;border:2px solid #1F2A33;background:#ECEBE3' }, h('div', { style: 'height:11cqw;display:grid;grid-template-rows:1fr' }, renderInfoRow({ n: a.n, flight: SAMPLE_FLIGHTS[a.flight] }))),
};

const LONG: FlightInfo = {
  operator: 'Lufthansa', callsign: 'LH8765', aircraft: 'Airbus A350-900', registration: 'D-AIXP',
  route: 'Frankfurt am Main → Dubai → Singapur', altitudeM: 11300, speedKmh: 905, phase: 'climb',
};

export const LangeRoute: StoryObj = {
  name: 'Lange Route (dreilegig), Höhe und Tempo auf eigenen Zeilen',
  render: () => h('div', { style: 'container-type:inline-size;max-width:900px;border:2px solid #1F2A33;background:#ECEBE3' }, h('div', { style: 'height:11cqw;display:grid;grid-template-rows:1fr' }, renderInfoRow({ n: 1, flight: LONG }))),
};
