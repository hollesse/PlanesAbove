import { SKY_SVG } from '../assets/generated/skies';
import { fluidSvg, h } from '../dom';
import { skyId, type SkyKey } from '../domain/catalog';

export const skySvg = (key: SkyKey): string => {
  const svg = SKY_SVG[skyId(key)];
  if (!svg) throw new Error(`Unknown sky: ${skyId(key)}`);
  return svg;
};

/** Atom: one of the 28 skies (Tageszeit x Wetterlage). Intrinsic aspect 1.6; crop it with an overflow-hidden container. */
export function renderSky(key: SkyKey): HTMLElement {
  return h('div', { class: 'pa-sky', html: fluidSvg(skySvg(key)), data: { sky: skyId(key) } });
}
