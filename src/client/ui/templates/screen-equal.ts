import { skyInk, type SkyKey } from '../domain/catalog';
import { renderSceneHeader } from '../molecules/scene-header';
import { renderInfoBar } from '../organisms/info-bar';
import { equalLayoutClass, renderSceneLayerEqual, type EqualLayout } from '../organisms/scene-layer-equal';
import { renderSkyLayer, renderStage, type ScreenAspect, type ScreenPlane } from './screen';

export interface ScreenEqualProps { aspect?: ScreenAspect; sky: SkyKey; place: string; clock: string; planes: ScreenPlane[]; layout?: EqualLayout }

/** Entwurf template: a complete screen whose two plane slots are equally wide (design-system-pyheh). */
export function renderScreenEqual({ aspect, sky, place, clock, planes, layout = 'nebeneinander' }: ScreenEqualProps): HTMLElement {
  if (planes.length > 2) throw new Error('A screen shows at most two planes');
  const stage = renderStage(aspect);
  stage.className += ` ${equalLayoutClass(layout)}`;
  stage.dataset.state = ['empty', 'one', 'two'][planes.length];
  stage.append(renderSkyLayer(sky), renderSceneHeader({ place, clock, ink: skyInk(sky) }), renderSceneLayerEqual({ planes: planes.map((p) => p.plane), layout }));
  if (planes.length === 1) stage.append(renderInfoBar({ variant: 'single', flight: planes[0].flight }));
  if (planes.length === 2) stage.append(renderInfoBar({ variant: 'double', flights: [planes[0].flight, planes[1].flight] }));
  return stage;
}
