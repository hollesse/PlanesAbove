import { skyInk } from '../domain/catalog';
import { renderSceneHeader } from '../molecules/scene-header';
import { renderInfoBar } from '../organisms/info-bar';
import { equalLayoutClass, renderSceneLayerEqual, type EqualLayout } from '../organisms/scene-layer-equal';
import { renderSkyLayer, renderStage, type ScreenProps } from './screen';

export interface ScreenEqualProps extends ScreenProps { layout?: EqualLayout }

/**
 * Template: a complete screen whose plane slots are equally wide and whose silhouettes carry the Groessenfaktor of
 * their Typklasse (design-system-pyheh/-q7mxe). Same states as renderScreen (empty with "Zuletzt", one, two, veraltet);
 * the app uses it with layout "versetzt" (sky-scene-h8c2v).
 */
export function renderScreenEqual({ aspect, sky, place, clock, planes, recent, stale, layout = 'nebeneinander' }: ScreenEqualProps): HTMLElement {
  if (planes.length > 2) throw new Error('A screen shows at most two planes');
  const stage = renderStage(aspect);
  stage.className += ` ${equalLayoutClass(layout)}`;
  stage.dataset.state = ['empty', 'one', 'two'][planes.length];
  stage.append(renderSkyLayer(sky), renderSceneHeader({ place, clock, ink: skyInk(sky), stale }), renderSceneLayerEqual({ planes: planes.map((p) => p.plane), layout }));
  if (planes.length === 1) stage.append(renderInfoBar({ variant: 'single', flight: planes[0].flight }));
  else if (planes.length === 2) stage.append(renderInfoBar({ variant: 'double', flights: [planes[0].flight, planes[1].flight] }));
  else if (recent) stage.append(renderInfoBar({ variant: 'recent', text: recent }));
  return stage;
}
