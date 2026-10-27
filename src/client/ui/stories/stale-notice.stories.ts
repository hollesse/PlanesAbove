import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderStaleNotice } from '../atoms/stale-notice';
import { renderSceneHeader } from '../molecules/scene-header';
import type { Ink, SkyTime, SkyWeather } from '../domain/catalog';
import { aspectControl, skyStage, TIME_IDS, WEATHER_IDS } from './helpers';
import type { ScreenAspect } from '../templates/screen';

const meta: Meta = { title: 'Atoms/Stale-Hinweis' };
export default meta;

interface Args { text: string; ink: Ink; time: SkyTime; weather: SkyWeather; aspect: ScreenAspect }

export const StaleHinweis: StoryObj<Args> = {
  name: 'Keine aktuellen Daten · Stand HH:MM',
  args: { text: 'Keine aktuellen Daten · Stand 10:08', ink: 'dark', time: 'day', weather: 'light', aspect: '4:3' },
  argTypes: { ink: { control: 'inline-radio', options: ['dark', 'light'], description: 'Himmel-Tinte' }, time: { control: 'select', options: TIME_IDS }, weather: { control: 'select', options: WEATHER_IDS }, aspect: aspectControl },
  render: (a) => skyStage({ time: a.time, weather: a.weather }, a.aspect, renderSceneHeader({ place: 'Kirchstrasse 17', clock: '10:12', ink: a.ink }), renderStaleNotice({ text: a.text, ink: a.ink })),
};

export const StaleHinweisAbend: StoryObj = {
  name: 'Hinweis auf hellem Himmel-Ton (Abend)',
  render: () => skyStage({ time: 'dusk', weather: 'light' }, '4:3', renderSceneHeader({ place: 'Kirchstrasse 17', clock: '19:42', ink: 'light' }), renderStaleNotice({ text: 'Keine aktuellen Daten · Stand 19:36', ink: 'light' })),
};
