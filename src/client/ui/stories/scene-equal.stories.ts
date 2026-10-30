import type { Meta, StoryObj } from '@storybook/html-vite';
import { SAMPLE_CLOCK, SAMPLE_FLIGHTS, SAMPLE_PLACE, SAMPLE_PLANES } from '../domain/samples';
import type { PlaneType, SkyTime, SkyWeather } from '../domain/catalog';
import { EQUAL_LAYOUTS, type EqualLayout } from '../organisms/scene-layer-equal';
import { renderScreenEqual } from '../templates/screen-equal';
import type { ScreenAspect } from '../templates/screen';
import { fitRoutesWhenMounted } from '../organisms/fit-route';
import { aspectControl, skyKey, TIME_IDS, WEATHER_IDS } from './helpers';
import { withType, typeControl } from './equal-helpers';

// Entwurf zum Abnehmen (design-system-pyheh): Zwei-Flugzeuge-Ansicht mit zwei gleich grossen Slots. Nur die Silhouette
// traegt den Groessenunterschied der Typklasse. Typklasse je Slot im Controls-Panel unten waehlbar.
interface Args { aspect: ScreenAspect; time: SkyTime; weather: SkyWeather; typeOne: PlaneType; typeTwo: PlaneType; layout: EqualLayout }
const meta: Meta<Args> = {
  title: 'Templates/Entwurf: Zwei Flugzeuge gleich groß',
  parameters: { layout: 'fullscreen' },
  args: { aspect: '4:3', time: 'day', weather: 'light', typeOne: 'narrowbody', typeTwo: 'widebody', layout: 'nebeneinander' },
  argTypes: {
    aspect: aspectControl,
    time: { control: 'select', options: TIME_IDS },
    weather: { control: 'select', options: WEATHER_IDS },
    typeOne: { ...typeControl, name: 'Typklasse Slot 1' },
    typeTwo: { ...typeControl, name: 'Typklasse Slot 2' },
    layout: { control: 'inline-radio', options: EQUAL_LAYOUTS },
  },
};
export default meta;

const render = (a: Args): HTMLElement => {
  const stage = renderScreenEqual({
    aspect: a.aspect, layout: a.layout, sky: skyKey(a.time, a.weather), place: SAMPLE_PLACE, clock: SAMPLE_CLOCK,
    planes: [withType({ plane: SAMPLE_PLANES.D, flight: SAMPLE_FLIGHTS.D }, a.typeOne), withType({ plane: SAMPLE_PLANES.C, flight: SAMPLE_FLIGHTS.C }, a.typeTwo)],
  });
  fitRoutesWhenMounted(stage);
  return stage;
};

export const Nebeneinander: StoryObj<Args> & { name: string } = { name: 'Nebeneinander (gleiche Höhe)', render };
export const Versetzt: StoryObj<Args> & { name: string } = { name: 'Leicht versetzt', args: { layout: 'versetzt' }, render };
