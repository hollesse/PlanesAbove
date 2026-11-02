import { PLANE_PARTS } from '../assets/generated/plane-parts';
import { LOGO_SVG } from '../assets/generated/logos';
import type { LiveryFile, LogoLayer, PathLayer } from './livery-file';

// The one pure render function for sky scene, Storybook and the editor (ADR 0032 point 6).
// Layer order from the bottom: back colour fields, white body, paths (clipped to the body), body outline,
// front colour fields, details. Front fields (ADR 0038, e.g. rear engines) are cut out of the paths' clip area.

export const OUTLINE = '#1F2A33';
export const BODY_FILL = '#FFFFFF';
export const FIELD_DEFAULTS = { engines: '#C9CCCB', wings: '#E1E3E1', tailplane: '#E1E3E1' } as const;

export interface RenderOptions {
  /** 0..1, editor only. Below 1 the silhouette fades and an UNCLIPPED copy of the paths shows through. Default 1. */
  silhouetteOpacity?: number;
  /** 0..1, editor only. Default 1. */
  detailsOpacity?: number;
}

let instance = 0;
const safeColor = (c: string | undefined, fallback: string) => (c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : fallback);
const n = (v: number) => String(Math.round(v * 100) / 100);

/** SVG path data for a closed path layer; `via` bends a segment through a point on the curve. */
export function pathData(layer: Pick<PathLayer, 'points' | 'via'>): string {
  const p = layer.points;
  let d = `M${n(p[0][0])} ${n(p[0][1])}`;
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    const via = layer.via?.[i];
    if (via) d += ` Q${n(2 * via[0] - (a[0] + b[0]) / 2)} ${n(2 * via[1] - (a[1] + b[1]) / 2)} ${n(b[0])} ${n(b[1])}`;
    else if (i < p.length - 1) d += ` L${n(b[0])} ${n(b[1])}`;
  }
  return d + ' Z';
}

/** Size of a logo in its own units (from its viewBox), or null for an unknown `src`. */
export function logoSize(src: string): { w: number; h: number } | null {
  const svg = LOGO_SVG[src];
  const vb = svg?.match(/^<svg[^>]*?\sviewBox="([^"]+)"/)?.[1]?.trim().split(/[\s,]+/).map(Number);
  return vb && vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0 ? { w: vb[2], h: vb[3] } : null;
}
/** Placeholder size (logo units) for an unknown `src`. */
export const LOGO_PLACEHOLDER = { w: 100, h: 60 } as const;

/** A placed logo: centred on (x, y), rotated, then scaled around that centre. Unknown `src` -> dashed placeholder. */
export function logoElement(l: LogoLayer): string {
  const t = `transform="translate(${n(l.x)} ${n(l.y)}) rotate(${n(l.rotation)}) scale(${Math.round(l.scale * 1000) / 1000})"`;
  const size = logoSize(l.src);
  if (!size) {
    const { w, h } = LOGO_PLACEHOLDER;
    return `<g class="lv-logo lv-logo-missing" ${t}><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="none" stroke="#888" stroke-width="3" stroke-dasharray="8 5"/></g>`;
  }
  const svg = LOGO_SVG[l.src];
  const vb = svg.match(/^<svg[^>]*?\sviewBox="([^"]+)"/)![1];
  const inner = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
  return `<g class="lv-logo" ${t}><svg x="${n(-size.w / 2)}" y="${n(-size.h / 2)}" width="${n(size.w)}" height="${n(size.h)}" viewBox="${vb}">${inner}</svg></g>`;
}

export function renderLiverySvg(file: LiveryFile, options: RenderOptions = {}): string {
  const parts = PLANE_PARTS[file.typklasse];
  if (!parts) throw new Error(`no silhouette for Typklasse ${file.typklasse}`);
  const id = `lv${++instance}`; // unique per render instance: several liveries share one document
  const so = options.silhouetteOpacity ?? 1;
  const dop = options.detailsOpacity ?? 1;
  const op = (v: number) => (v < 1 ? ` opacity="${n(v)}"` : '');
  // paths and logos in layer order (bottom -> top)
  const pathEls = (extra = '') => file.layers.map((l) => (l.type === 'logo' ? logoElement(l) : `<path d="${pathData(l)}" fill="${safeColor(l.color, '#000000')}"${extra}/>`)).join('');
  const stroke = `stroke="${OUTLINE}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
  const fieldEls = (layer: 'front' | 'back') =>
    Object.entries(parts.fields)
      .filter(([k]) => (parts.fieldLayer?.[k] ?? 'back') === layer)
      .map(([k, geo]) => `<g class="lv-field-${k}" fill="${safeColor(file.fields[k as keyof typeof FIELD_DEFAULTS], FIELD_DEFAULTS[k as keyof typeof FIELD_DEFAULTS])}" ${stroke}>${geo}</g>`)
      .join('');
  const fields = fieldEls('back');
  const frontFields = fieldEls('front');
  const frontGeo = Object.entries(parts.fields)
    .filter(([k]) => parts.fieldLayer?.[k] === 'front')
    .map(([, geo]) => geo)
    .join('');
  // Paint area = body minus front fields. SVG clip-path cannot subtract, so a mask is used in that case.
  const paintArea = frontGeo
    ? `mask="url(#${id}-paint-mask)"`
    : `clip-path="url(#${id}-clip)"`;
  const outline = parts.outlines
    ? `<path class="lv-outline-fin" d="${parts.outlines.fin}" mask="url(#${id}-ol-mask)"/><path class="lv-outline-fuselage" d="${parts.outlines.fuselage}"/>`
    : parts.body;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${parts.viewBox}" data-livery-render data-typklasse="${file.typklasse}">`,
    `<defs><clipPath id="${id}-clip">${parts.body}</clipPath>${
      frontGeo ? `<mask id="${id}-paint-mask" maskUnits="userSpaceOnUse" x="-1000" y="-1000" width="3000" height="3000"><g fill="#fff">${parts.body}</g><g fill="#000">${frontGeo}</g></mask>` : ''
    }${
      parts.outlines ? `<mask id="${id}-ol-mask" maskUnits="userSpaceOnUse" x="-1000" y="-1000" width="3000" height="3000"><rect x="-1000" y="-1000" width="3000" height="3000" fill="#fff"/><path d="${parts.outlines.fuselage}" fill="#000"/></mask>` : ''
    }</defs>`,
    `<g class="lv-silhouette"${op(so)}>${fields}<g class="lv-body" fill="${BODY_FILL}">${parts.body}</g></g>`,
    so < 1 ? `<g class="lv-ghost"${op(1 - so)}>${pathEls()}</g>` : '',
    `<g class="lv-paint" ${paintArea}>${pathEls()}</g>`,
    `<g class="lv-outline"${op(so)} fill="none" ${stroke}>${outline}</g>`,
    frontFields ? `<g class="lv-front-fields"${op(so)}>${frontFields}</g>` : '',
    `<g class="lv-details"${op(dop)}>${parts.details}</g>`,
    '</svg>',
  ].join('');
}
