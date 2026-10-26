import type { Meta, StoryObj } from '@storybook/html-vite';
import { SAMPLE_FLIGHTS, RECENT_TEXT } from '../domain/samples';
import type { ScreenAspect } from '../templates/screen';
import { renderInfoBar, type InfoBarProps } from '../organisms/info-bar';
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
