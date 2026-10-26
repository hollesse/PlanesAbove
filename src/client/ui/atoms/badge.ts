import { h } from '../dom';

/** Atom: the Nummern-Plakette (1 or 2) linking a plane to its info row. */
export const renderBadge = ({ n }: { n: number }): HTMLElement => h('div', { class: 'pa-badge', text: String(n) });
