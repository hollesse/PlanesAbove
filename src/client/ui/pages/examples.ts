import { SAMPLE_FLIGHTS, SAMPLE_PLACE, SAMPLE_PLANES, RECENT_TEXT } from '../domain/samples';
import type { ScreenProps } from '../templates/screen';

const p = (k: keyof typeof SAMPLE_PLANES) => ({ plane: SAMPLE_PLANES[k], flight: SAMPLE_FLIGHTS[k] });

export interface ExamplePage { id: string; label: string; props: ScreenProps }

/** Filled example scenes (the poster mocks of Screens.html plus a few weather/daytime variations). */
export const EXAMPLE_PAGES: readonly ExamplePage[] = [
  { id: 'route-known', label: 'Route bekannt · Tag, leicht bewölkt', props: { sky: { time: 'day', weather: 'light' }, place: SAMPLE_PLACE, clock: '10:08', planes: [p('A')] } },
  { id: 'route-unknown', label: 'Route unbekannt · Abenddämmerung', props: { sky: { time: 'dusk', weather: 'light' }, place: SAMPLE_PLACE, clock: '19:42', planes: [p('B')] } },
  { id: 'two-planes', label: 'Zwei Flugzeuge · Nacht, klar', props: { sky: { time: 'night', weather: 'clear' }, place: SAMPLE_PLACE, clock: '22:15', planes: [p('C'), p('D')] } },
  { id: 'empty', label: 'Kein Flugzeug · Zuletzt', props: { sky: { time: 'day', weather: 'light' }, place: SAMPLE_PLACE, clock: '14:26', planes: [], recent: RECENT_TEXT } },
  { id: 'dawn-fog', label: 'Morgendämmerung, Nebel', props: { sky: { time: 'dawn', weather: 'fog' }, place: SAMPLE_PLACE, clock: '06:12', planes: [p('E')] } },
  { id: 'storm', label: 'Tag, Gewitter', props: { sky: { time: 'day', weather: 'storm' }, place: SAMPLE_PLACE, clock: '15:31', planes: [p('F')] } },
  { id: 'snow', label: 'Tag, Schnee · zwei Flugzeuge', props: { sky: { time: 'day', weather: 'snow' }, place: SAMPLE_PLACE, clock: '11:47', planes: [p('E'), p('F')] } },
];
