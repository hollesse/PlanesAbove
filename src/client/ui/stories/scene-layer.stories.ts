import type { Meta, StoryObj } from '@storybook/html-vite';
import { SAMPLE_PLANES, type SampleKey } from '../domain/samples';
import type { PaintedPlaneProps } from '../molecules/painted-plane';
import { renderSceneLayer } from '../organisms/scene-layer';
import type { ScreenAspect } from '../templates/screen';
import { aspectControl, skyStage, TIME_IDS, WEATHER_IDS } from './helpers';
import type { SkyTime, SkyWeather } from '../domain/catalog';

interface Args { aspect: ScreenAspect; time: SkyTime; weather: SkyWeather }
const meta: Meta<Args> = {
  title: 'Organisms/Szenen-Ebene',
  args: { aspect: '4:3', time: 'day', weather: 'light' },
  argTypes: { aspect: aspectControl, time: { control: 'select', options: TIME_IDS }, weather: { control: 'select', options: WEATHER_IDS } },
};
export default meta;

const story = (name: string, keys: SampleKey[]): StoryObj<Args> & { name: string } => ({
  name,
  render: (a) => skyStage({ time: a.time, weather: a.weather }, a.aspect, renderSceneLayer({ planes: keys.map((k): PaintedPlaneProps => SAMPLE_PLANES[k]) })),
});

export const KeinFlugzeug = story('0 Flugzeuge', []);
export const EinFlugzeug = story('1 Flugzeug', ['A']);
export const ZweiFlugzeuge = story('2 Flugzeuge (mit Plaketten)', ['C', 'D']);
