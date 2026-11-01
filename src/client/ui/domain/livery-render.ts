import { PLANE_PARTS } from '../assets/generated/plane-parts';
import type { LiveryFile, PathLayer } from './livery-file';

// The one pure render function for sky scene, Storybook and the editor (ADR 0032 point 6).
// Layer order from the bottom: colour fields, white body, paths (clipped to the body), body outline, details.

export const OUTLINE = '#1F2A33';
export const BODY_FILL = '#F4F4F2';
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

export function renderLiverySvg(file: LiveryFile, options: RenderOptions = {}): string {
  const parts = PLANE_PARTS[file.typklasse];
  if (!parts) throw new Error(`no silhouette for Typklasse ${file.typklasse}`);
  const id = `lv${++instance}`; // unique per render instance: several liveries share one document
  const so = options.silhouetteOpacity ?? 1;
  const dop = options.detailsOpacity ?? 1;
  const op = (v: number) => (v < 1 ? ` opacity="${n(v)}"` : '');
  const paths = file.layers.filter((l): l is PathLayer => l.type === 'path');
  const pathEls = (extra = '') => paths.map((l) => `<path d="${pathData(l)}" fill="${safeColor(l.color, '#000000')}"${extra}/>`).join('');
  const stroke = `stroke="${OUTLINE}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
  const fields = Object.entries(parts.fields)
    .map(([k, geo]) => `<g class="lv-field-${k}" fill="${safeColor(file.fields[k as keyof typeof FIELD_DEFAULTS], FIELD_DEFAULTS[k as keyof typeof FIELD_DEFAULTS])}" ${stroke}>${geo}</g>`)
    .join('');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${parts.viewBox}" data-livery-render data-typklasse="${file.typklasse}">`,
    `<defs><clipPath id="${id}-clip">${parts.body}</clipPath></defs>`,
    `<g class="lv-silhouette"${op(so)}>${fields}<g class="lv-body" fill="${BODY_FILL}">${parts.body}</g></g>`,
    so < 1 ? `<g class="lv-ghost"${op(1 - so)}>${pathEls()}</g>` : '',
    `<g class="lv-paint" clip-path="url(#${id}-clip)">${pathEls()}</g>`,
    `<g class="lv-outline"${op(so)} fill="none" ${stroke}>${parts.body}</g>`,
    `<g class="lv-details"${op(dop)}>${parts.details}</g>`,
    '</svg>',
  ].join('');
}
