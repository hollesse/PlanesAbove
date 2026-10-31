import { h } from '../dom';
import { qrMatrix } from '../domain/qr';

const QUIET = 4;

/** Atom: QR-Code als Inline-SVG (dunkle Module auf weisser Ruhezone, immer kontrastreich lesbar). */
export function renderQrCode(text: string, label = 'QR-Code'): HTMLElement {
  const m = qrMatrix(text);
  const n = m.length + QUIET * 2;
  let d = '';
  m.forEach((row, y) => row.forEach((dark, x) => {
    if (dark) d += `M${x + QUIET} ${y + QUIET}h1v1h-1z`;
  }));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" style="display:block;width:100%;height:100%" aria-hidden="true"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  return h('div', { class: 'pa-qr', html: svg, attrs: { role: 'img', 'aria-label': label }, data: { url: text } });
}
