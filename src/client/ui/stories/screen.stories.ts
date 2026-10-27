import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderScreen, type ScreenAspect } from '../templates/screen';
import { SAMPLE_FLIGHTS, SAMPLE_PLANES, SAMPLE_PLACE, RECENT_TEXT } from '../domain/samples';
import type { SkyTime, SkyWeather } from '../domain/catalog';
import { aspectControl, TIME_IDS, WEATHER_IDS } from './helpers';

interface Args { aspect: ScreenAspect; time: SkyTime; weather: SkyWeather; clock: string; stale?: { since: string } }
const meta: Meta<Args> = {
  title: 'Templates/Bildschirm',
  parameters: { layout: 'fullscreen' },
  args: { aspect: '4:3', time: 'day', weather: 'light', clock: '10:08' },
  argTypes: { aspect: aspectControl, time: { control: 'select', options: TIME_IDS }, weather: { control: 'select', options: WEATHER_IDS } },
};
export default meta;

const p = (k: keyof typeof SAMPLE_PLANES) => ({ plane: SAMPLE_PLANES[k], flight: SAMPLE_FLIGHTS[k] });
const story = (name: string, planes: ReturnType<typeof p>[]): StoryObj<Args> & { name: string } => ({
  name,
  render: (a) => renderScreen({ aspect: a.aspect, sky: { time: a.time, weather: a.weather }, place: SAMPLE_PLACE, clock: a.clock, planes, recent: RECENT_TEXT, stale: a.stale }),
});

export const Leer = story('Leer (kein Flugzeug)', []);
export const Eins = story('Eins (ein Flugzeug)', [p('A')]);
export const Zwei = story('Zwei (zwei Flugzeuge)', [p('C'), p('D')]);
export const Format53 = { ...story('Eins · Format 5:3 (Entwurf)', [p('A')]), args: { aspect: '5:3' as ScreenAspect } };
export const Veraltet = { ...story('Eins · veraltet (Letzter Stand)', [p('A')]), args: { stale: { since: '10:02' } } };
