import { LOGO_SVG } from '../assets/generated/logos';
import { anchorOf } from '../domain/livery';
import { fluidSvg, h } from '../dom';

/** All logo asset ids (file names without extension). */
export const LOGO_IDS: readonly string[] = Object.keys(LOGO_SVG).sort();

export const logoSvg = (id: string): string | undefined => LOGO_SVG[id];

/** Atom: a logo asset on its own. */
export function renderLogo({ id }: { id: string }): HTMLElement {
  const svg = logoSvg(id);
  if (!svg) throw new Error(`Unknown logo: ${id}`);
  return h('div', { class: 'pa-logo', html: fluidSvg(svg), data: { logo: id, anchor: anchorOf(svg) } });
}
