import { renderBadge } from '../atoms/badge';
import { h } from '../dom';
import { renderPaintedPlane, type PaintedPlaneProps } from '../molecules/painted-plane';

/** Where a plane sits: alone (single) or as plane 1/2 when two share the sky (one/two). */
export type PlaneSlot = 'single' | 'one' | 'two';

/** A positioned plane. Transitions animate these wrappers. */
export const renderPlaneSlot = (slot: PlaneSlot, plane: PaintedPlaneProps): HTMLElement =>
  h('div', { class: `pa-slot pa-slot-${slot}`, data: { slot } }, renderPaintedPlane(plane));

/** A positioned Nummern-Plakette next to plane 1 or 2. */
export const renderBadgeSlot = (n: 1 | 2): HTMLElement => h('div', { class: `pa-badge-slot pa-badge-slot-${n === 1 ? 'one' : 'two'}`, data: { badge: String(n) } }, renderBadge({ n }));

/** Organism: the planes of a scene - 0, 1 or 2 of them (badges appear when there are two). */
export function renderSceneLayer({ planes }: { planes: PaintedPlaneProps[] }): HTMLElement {
  if (planes.length > 2) throw new Error('A scene shows at most two planes');
  const layer = h('div', { class: 'pa-layer', style: 'pointer-events:none', data: { planes: String(planes.length) } });
  if (planes.length === 1) layer.append(renderPlaneSlot('single', planes[0]));
  if (planes.length === 2) layer.append(renderPlaneSlot('one', planes[0]), renderBadgeSlot(1), renderPlaneSlot('two', planes[1]), renderBadgeSlot(2));
  return layer;
}
