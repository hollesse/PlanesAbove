import { h } from '../dom';
import type { Ink } from '../domain/catalog';

export interface StaleNoticeProps { text: string; ink: Ink }

/**
 * Atom: the subtle stale indicator (ADR 0008) - shown when the last good scene is kept while the data source or network is down.
 * Small mono label under the header, same Himmel-Tinte and glow as the header; never blanks the scene.
 */
export const renderStaleNotice = ({ text, ink }: StaleNoticeProps): HTMLElement =>
  h('div', { class: `pa-stale-notice pa-ink-${ink} pa-glow-on-${ink}-ink`, data: { ink, stale: 'true' }, attrs: { role: 'status' } }, h('span', { text }));
