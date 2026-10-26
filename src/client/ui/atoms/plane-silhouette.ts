import { PLANE_SVG } from '../assets/generated/planes';
import { fluidSvg, h } from '../dom';
import type { PlaneType } from '../domain/catalog';

export interface PlaneSilhouetteProps { type: PlaneType }

/** Raw (unpainted) SVG markup of a Typklasse. */
export const planeSvg = (type: PlaneType): string => {
  const svg = PLANE_SVG[type];
  if (!svg) throw new Error(`Unknown plane type: ${type}`);
  return svg;
};

/** Atom: the unpainted silhouette of one Typklasse. */
export function renderPlaneSilhouette({ type }: PlaneSilhouetteProps): HTMLElement {
  return h('div', { class: 'pa-plane', html: fluidSvg(planeSvg(type)), data: { planeType: type } });
}
