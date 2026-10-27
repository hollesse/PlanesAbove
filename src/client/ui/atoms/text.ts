import { h } from '../dom';

export type TextStyle = 'eyebrow' | 'route' | 'meta';
export const TEXT_STYLES: readonly TextStyle[] = ['eyebrow', 'route', 'meta'];
const CLASS: Record<TextStyle, string> = { eyebrow: 'pa-eyebrow', route: 'pa-route-large', meta: 'pa-meta-small' };

/** Atom: Textstile Eyebrow (Mono, versal), Route groß (Archivo 900) und Meta klein (Mono). */
export const renderText = ({ style, text }: { style: TextStyle; text: string }): HTMLElement => h('div', { class: CLASS[style], text });
