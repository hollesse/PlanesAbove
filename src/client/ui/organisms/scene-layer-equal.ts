// Entwurf (design-system-pyheh): scene layer with two EQUAL-sized slots, so that only the silhouette carries the size
// difference between Typklassen. Own slot classes (pa-slot-eq-*), the existing pa-slot-one/-two stay untouched.
import { renderBadge } from '../atoms/badge';
import { h } from '../dom';
import { renderPaintedPlane, type PaintedPlaneProps } from '../molecules/painted-plane';
import type { PlaneSlot } from './scene-layer';

/** Layout proposals: planes side by side at the same height, or the second one slightly lower (staggered). */
export type EqualLayout = 'nebeneinander' | 'versetzt';
export const EQUAL_LAYOUTS: readonly EqualLayout[] = ['nebeneinander', 'versetzt'];

/** Classes for the stage (or layer) that hosts equal slots; they define the vertical position variables. */
export const equalLayoutClass = (layout: EqualLayout): string => (layout === 'versetzt' ? 'pa-eq pa-eq-staggered' : 'pa-eq');

export const renderEqualPlaneSlot = (slot: PlaneSlot, plane: PaintedPlaneProps): HTMLElement =>
  h('div', { class: `pa-slot pa-slot-eq-${slot}`, data: { slot } }, renderPaintedPlane(plane));

export const renderEqualBadgeSlot = (n: 1 | 2): HTMLElement =>
  h('div', { class: `pa-badge-slot pa-badge-slot-eq-${n === 1 ? 'one' : 'two'}`, data: { badge: String(n) } }, renderBadge({ n }));

/** Organism: 0, 1 or 2 planes; with two, both slots have the same width and carry a Nummern-Plakette. */
export function renderSceneLayerEqual({ planes, layout = 'nebeneinander' }: { planes: PaintedPlaneProps[]; layout?: EqualLayout }): HTMLElement {
  if (planes.length > 2) throw new Error('A scene shows at most two planes');
  const layer = h('div', { class: `pa-layer ${equalLayoutClass(layout)}`, style: 'pointer-events:none', data: { planes: String(planes.length), layout } });
  if (planes.length === 1) layer.append(renderEqualPlaneSlot('single', planes[0]));
  if (planes.length === 2) layer.append(renderEqualPlaneSlot('one', planes[0]), renderEqualBadgeSlot(1), renderEqualPlaneSlot('two', planes[1]), renderEqualBadgeSlot(2));
  return layer;
}
