import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderSceneHeader } from '../molecules/scene-header';
import type { Ink, SkyTime, SkyWeather } from '../domain/catalog';
import { aspectControl, skyStage, TIME_IDS, WEATHER_IDS } from './helpers';
import type { ScreenAspect } from '../templates/screen';

const meta: Meta = { title: 'Molecules/Kopfzeile' };
export default meta;

interface Args { place: string; clock: string; ink: Ink; time: SkyTime; weather: SkyWeather; aspect: ScreenAspect }

export const Kopfzeile: StoryObj<Args> = {
  name: 'Der Himmel über … · Live · HH:MM',
  args: { place: 'Kirchstrasse 17', clock: '10:08', ink: 'dark', time: 'day', weather: 'light', aspect: '4:3' },
  argTypes: { ink: { control: 'inline-radio', options: ['dark', 'light'], description: 'Himmel-Tinte' }, time: { control: 'select', options: TIME_IDS }, weather: { control: 'select', options: WEATHER_IDS }, aspect: aspectControl },
  render: (a) => skyStage({ time: a.time, weather: a.weather }, a.aspect, renderSceneHeader({ place: a.place, clock: a.clock, ink: a.ink })),
};

export const TinteDunkel: StoryObj = { name: 'Tinte dunkel (Tag)', render: () => skyStage({ time: 'day', weather: 'light' }, '4:3', renderSceneHeader({ place: 'Kirchstrasse 17', clock: '10:08', ink: 'dark' })) };
export const TinteHell: StoryObj = { name: 'Tinte hell (Abend)', render: () => skyStage({ time: 'dusk', weather: 'light' }, '4:3', renderSceneHeader({ place: 'Kirchstrasse 17', clock: '19:42', ink: 'light' })) };
export const VeraltetDunkel: StoryObj = { name: 'Veraltet · Letzter Stand (Tinte dunkel, Tag)', render: () => skyStage({ time: 'day', weather: 'light' }, '4:3', renderSceneHeader({ place: 'Kirchstrasse 17', clock: '10:12', ink: 'dark', stale: { since: '10:08' } })) };
export const VeraltetHell: StoryObj = { name: 'Veraltet · Letzter Stand (Tinte hell, Abend)', render: () => skyStage({ time: 'dusk', weather: 'light' }, '4:3', renderSceneHeader({ place: 'Kirchstrasse 17', clock: '19:42', ink: 'light', stale: { since: '19:36' } })) };
