import { renderSky } from '../atoms/sky';
import { h } from '../dom';
import { skyInk, type SkyKey } from '../domain/catalog';
import type { FlightInfo } from '../domain/flight';
import { renderSceneHeader } from '../molecules/scene-header';
import type { PaintedPlaneProps } from '../molecules/painted-plane';
import { renderInfoBar } from '../organisms/info-bar';
import { renderSceneLayer } from '../organisms/scene-layer';

/** Screen format. 4:3 is the iPad target format; 5:3 is the format of the Claude-Design drafts. */
export type ScreenAspect = '4:3' | '5:3';

export interface ScreenPlane { plane: PaintedPlaneProps; flight: FlightInfo }

export interface ScreenProps {
  aspect?: ScreenAspect;
  sky: SkyKey;
  place: string;
  clock: string;
  /** 0, 1 or 2 planes (Bildschirmzustand leer, eins, zwei). */
  planes: ScreenPlane[];
  /** Text of the slim "Zuletzt" bar shown when no plane is up. */
  recent?: string;
}

/** Empty positioned stage in the requested format (container for cqw units). */
export const renderStage = (aspect: ScreenAspect = '4:3'): HTMLElement => h('div', { class: `pa-screen pa-screen-${aspect.replace(':', 'x')}`, data: { aspect } });

export const renderSkyLayer = (key: SkyKey): HTMLElement => h('div', { class: 'pa-layer' }, renderSky(key));

/** Template: a complete screen - sky, header, planes and info bar - for the state empty, one or two. */
export function renderScreen(props: ScreenProps): HTMLElement {
  if (props.planes.length > 2) throw new Error('A screen shows at most two planes');
  const stage = renderStage(props.aspect);
  stage.dataset.state = ['empty', 'one', 'two'][props.planes.length];
  stage.append(renderSkyLayer(props.sky), renderSceneHeader({ place: props.place, clock: props.clock, ink: skyInk(props.sky) }), renderSceneLayer({ planes: props.planes.map((p) => p.plane) }));
  if (props.planes.length === 1) stage.append(renderInfoBar({ variant: 'single', flight: props.planes[0].flight }));
  else if (props.planes.length === 2) stage.append(renderInfoBar({ variant: 'double', flights: [props.planes[0].flight, props.planes[1].flight] }));
  else if (props.recent) stage.append(renderInfoBar({ variant: 'recent', text: props.recent }));
  return stage;
}
