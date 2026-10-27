import { SKY_SVG } from '../assets/generated/skies';
import { coverSvg, fluidSvg, h } from '../dom';
import { skyId, type SkyKey } from '../domain/catalog';

export const skySvg = (key: SkyKey): string => {
  const svg = SKY_SVG[skyId(key)];
  if (!svg) throw new Error(`Unknown sky: ${skyId(key)}`);
  return svg;
};

/** Atom: one of the 28 skies (Tageszeit x Wetterlage). Standalone it shows the full 1.6:1 motif; with `cover` it fills its (positioned) container completely, centered and cropped. */
export function renderSky(key: SkyKey, opts: { cover?: boolean } = {}): HTMLElement {
  if (opts.cover) return h('div', { class: 'pa-sky pa-sky-cover', html: coverSvg(skySvg(key)), data: { sky: skyId(key) } });
  return h('div', { class: 'pa-sky', html: fluidSvg(skySvg(key)), data: { sky: skyId(key) } });
}
