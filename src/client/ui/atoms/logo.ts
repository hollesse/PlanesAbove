import { LOGO_SVG } from '../assets/generated/logos';
import { anchorOf } from '../domain/livery';
import { fluidSvg, h } from '../dom';

/** All logo asset ids (file names without extension). */
export const LOGO_IDS: readonly string[] = Object.keys(LOGO_SVG).sort();

export const logoSvg = (id: string): string | undefined => LOGO_SVG[id];

const num = (attrs: string, name: string): number | undefined => {
  const m = new RegExp(`(?:^|\\s)${name}="(-?[\\d.]+)"`).exec(attrs);
  return m ? Number(m[1]) : undefined;
};

/** Geometry (x, y, width, height) a logo paints: its <image> and any nested <svg x y width height> vector content. */
export function logoContentBoxes(svg: string): { x: number; y: number; w: number; h: number }[] {
  const boxes: { x: number; y: number; w: number; h: number }[] = [];
  const re = /<(image|svg)\b([^>]*)>/g;
  let first = true;
  for (let m = re.exec(svg); m; m = re.exec(svg)) {
    if (m[1] === 'svg' && first) { first = false; continue; } // the root element itself
    first = false;
    const [x, y, w, h] = [num(m[2], 'x') ?? 0, num(m[2], 'y') ?? 0, num(m[2], 'width'), num(m[2], 'height')];
    if (w !== undefined && h !== undefined) boxes.push({ x, y, w, h });
  }
  return boxes;
}

/** The root viewBox widened so it encloses all painted logo content (nothing is clipped). */
export function enclosingViewBox(svg: string): string {
  const root = /<svg\b[^>]*\sviewBox="([^"]+)"/.exec(svg);
  if (!root) return '';
  const [vx, vy, vw, vh] = root[1].split(/\s+/).map(Number);
  let [x0, y0, x1, y1] = [vx, vy, vx + vw, vy + vh];
  for (const b of logoContentBoxes(svg)) {
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
  }
  return `${+x0.toFixed(3)} ${+y0.toFixed(3)} ${+(x1 - x0).toFixed(3)} ${+(y1 - y0).toFixed(3)}`;
}

/** Atom: a logo asset on its own. */
export function renderLogo({ id }: { id: string }): HTMLElement {
  const svg = logoSvg(id);
  if (!svg) throw new Error(`Unknown logo: ${id}`);
  return h('div', { class: 'pa-logo', html: fluidSvg(svg.replace(/(<svg\b[^>]*\sviewBox=)"[^"]+"/, `$1"${enclosingViewBox(svg)}"`)), data: { logo: id, anchor: anchorOf(svg) } });
}
