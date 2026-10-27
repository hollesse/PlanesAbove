import { h } from '../dom';
import type { Ink } from '../domain/catalog';

export interface SceneHeaderProps { place: string; clock: string; ink: Ink }

/** Molecule: "Der Himmel über … · Live · HH:MM" over the sky, with light or dark Himmel-Tinte. */
export const renderSceneHeader = ({ place, clock, ink }: SceneHeaderProps): HTMLElement =>
  h('div', { class: `pa-scene-header pa-ink-${ink} pa-glow-on-${ink}-ink`, data: { ink, glow: ink } }, h('span', { text: `Der Himmel über ${place}` }), h('span', { text: `Live · ${clock}` }));
