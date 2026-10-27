import { h } from '../dom';
import type { Ink } from '../domain/catalog';

export interface SceneHeaderProps {
  place: string;
  clock: string;
  ink: Ink;
  /** Veraltet (ADR 0008): the last good data is shown; `since` is the HH:MM of that last good Stand. Absent = live. */
  stale?: { since: string };
}

/** Molecule: "Der Himmel über … · Live · HH:MM" (live) or "… · Letzter Stand · HH:MM" (veraltet) over the sky, with light or dark Himmel-Tinte. */
export const renderSceneHeader = ({ place, clock, ink, stale }: SceneHeaderProps): HTMLElement =>
  h('div', { class: `pa-scene-header pa-ink-${ink} pa-glow-on-${ink}-ink`, data: { ink, glow: ink, state: stale ? 'stale' : 'live' } }, h('span', { text: `Der Himmel über ${place}` }), h('span', { text: stale ? `Letzter Stand · ${stale.since}` : `Live · ${clock}` }));
