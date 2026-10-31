import type { Meta, StoryObj } from '@storybook/html-vite';
import { SAMPLE_PHOTOS } from '../domain/photo';
import { SAMPLE_CLOCK, SAMPLE_FLIGHTS, SAMPLE_PLACE, SAMPLE_PLANES } from '../domain/samples';
import { renderPhotoOverlay } from '../organisms/photo-overlay';
import { renderScreen, type ScreenAspect } from '../templates/screen';
import { fitRoutesWhenMounted } from '../organisms/fit-route';
import { aspectControl } from './helpers';

// Beispieldaten: Platzhalter-Grafiken, keine echten Fotos und keine Hotlinks.
interface Args { aspect: ScreenAspect; autoCloseMs: number }
const meta: Meta<Args> = {
  title: 'Organisms/Foto-Overlay',
  parameters: { layout: 'fullscreen' },
  args: { aspect: '4:3', autoCloseMs: 0 },
  argTypes: { aspect: aspectControl, autoCloseMs: { control: 'number', name: 'Automatisch schließen nach (ms, 0 = nie)' } },
};
export default meta;

const CAPTION = `${SAMPLE_FLIGHTS.A.registration} · ${SAMPLE_FLIGHTS.A.aircraft} · ${SAMPLE_FLIGHTS.A.operator}`;

const make = (photos: Parameters<typeof renderPhotoOverlay>[0]['photos']) => (a: Args): HTMLElement => {
  const stage = renderScreen({ aspect: a.aspect, sky: { time: 'day', weather: 'light' }, place: SAMPLE_PLACE, clock: SAMPLE_CLOCK, planes: [{ plane: SAMPLE_PLANES.A, flight: SAMPLE_FLIGHTS.A }] });
  const overlay = renderPhotoOverlay({ photos, caption: CAPTION, autoCloseMs: a.autoCloseMs || undefined, onClose: () => overlay.remove() });
  stage.append(overlay);
  fitRoutesWhenMounted(stage);
  return stage;
};

type S = StoryObj<Args> & { name: string };
export const EinFoto: S = { name: 'Ein Foto', render: make([SAMPLE_PHOTOS[0]]) };
export const Galerie: S = { name: 'Galerie (mehrere Fotos)', render: make(SAMPLE_PHOTOS) };
export const Laedt: S = { name: 'Lädt', render: make(null) };
export const KeinFoto: S = { name: 'Kein Foto', render: make([]) };
