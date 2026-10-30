// Entwurf (design-system-pyheh): the plane transitions for the equal-slot layout.
// Decision: NOT a second hand-written spec set. The equal specs are derived from the 11 plane specs of catalog.ts
// (same ids, groups, layer order, timings), only the plane keyframes whose geometry depends on the slot size are swapped
// for `pae-*` variants in styles/ui.css (they use cqw, so they hold at 4:3 and 5:3). The slot CLASS prefix
// (pa-slot-eq-*) is chosen by the renderer (player `slots` option), so specs stay free of class names.
import { TRANSITIONS, type Layer, type TransitionSpec } from './catalog';

/** Original keyframes whose translate/scale assumed 50 %/33 % slots -> own equal-slot variants. */
export const EQUAL_KEYFRAMES: Readonly<Record<string, string>> = {
  'pa2-plane1': 'pae-pa2-plane1', // single -> slot one (shrink)
  'pa5-p1': 'pae-pa5-p1', // slot one -> single (grow)
  'pa6-p2': 'pae-pa6-p2', // slot two -> single (grow)
  'pa6-p1': 'pae-pa6-p1', // slot one leaves (right, fully off screen)
  'pa7-pout': 'pae-pa7-pout', // slot one leaves (right, fully off screen)
};

const mapLayer = (l: Layer): Layer => (l.kind === 'plane' && l.anim && EQUAL_KEYFRAMES[l.anim.name] ? { ...l, anim: { ...l.anim, name: EQUAL_KEYFRAMES[l.anim.name] } } : l);

export const EQUAL_TRANSITION_GROUPS = ['Flugzeug kommt', 'Flugzeug geht', 'Flugzeug wechselt'] as const;

/** The plane transitions (kommt / geht / wechselt) as specs for equal-sized slots. Weather/time transitions are not needed. */
export const EQUAL_TRANSITIONS: readonly TransitionSpec[] = TRANSITIONS.filter((t) => (EQUAL_TRANSITION_GROUPS as readonly string[]).includes(t.group)).map((t) => ({ ...t, layers: t.layers.map(mapLayer) }));
