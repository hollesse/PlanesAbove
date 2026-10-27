import { planeSvg } from '../atoms/plane-silhouette';
import { logoSvg } from '../atoms/logo';
import { fluidSvg, h } from '../dom';
import type { PlaneType } from '../domain/catalog';
import { placeLogo, resolveLivery } from '../domain/livery';

export interface PaintedPlaneProps {
  type: PlaneType;
  /** Livery id from the catalog; unknown or missing -> Standard-Lackierung. */
  livery?: string;
  /** undefined = the livery's own logo, null = no logo, string = explicit logo id. */
  logo?: string | null;
}

/** Molecule: a plane silhouette with livery colours and logo applied. */
export function renderPaintedPlane({ type, livery, logo }: PaintedPlaneProps): HTMLElement {
  const { def, available } = resolveLivery(type, livery);
  if (!available) return h('div', { class: 'pa-no-livery', text: 'Keine Lackierung', data: { planeType: type, livery: def.id } });
  const logoId = logo === undefined ? def.logo : logo;
  const svg = placeLogo(planeSvg(type), logoId ? logoSvg(logoId) : undefined, logoId ? logoSvg(`${logoId}-tail`) : undefined);
  const el = h('div', { class: 'pa-plane', html: fluidSvg(svg), data: { planeType: type, livery: def.id } });
  for (const [k, v] of Object.entries(def.vars)) el.style.setProperty(k, v);
  return el;
}
