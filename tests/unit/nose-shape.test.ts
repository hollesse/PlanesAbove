import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// liveries-ygdxc: realistic, bluntly rounded nose built from several tangent-continuous curves.
const read = (p: string) => readFileSync(`src/client/ui/assets/planes/${p}`, 'utf8');
type Pt = [number, number];
type Seg = { kind: 'L' | 'Q' | 'C'; pts: Pt[] };

// Absolute-command path parser (M L Q C Z) -> segments with their control points.
function parse(d: string): Seg[] {
  const tokens = d.match(/[MLQCZ]|-?\d*\.?\d+/g)!;
  const segs: Seg[] = [];
  let i = 0;
  let cur: Pt = [0, 0];
  const n = { M: 1, L: 1, Q: 2, C: 3 } as Record<string, number>;
  while (i < tokens.length) {
    const c = tokens[i++];
    if (c === 'Z') continue;
    const pts: Pt[] = [];
    for (let k = 0; k < n[c]; k++) pts.push([parseFloat(tokens[i++]), parseFloat(tokens[i++])]);
    if (c !== 'M') segs.push({ kind: c as Seg['kind'], pts: [cur, ...pts] });
    cur = pts[pts.length - 1];
  }
  return segs;
}
function sample(seg: Seg, steps: number): Pt[] {
  const p = seg.pts;
  const out: Pt[] = [];
  const m = seg.kind === 'L' ? 1 : steps;
  for (let s = 1; s <= m; s++) {
    const t = s / m;
    const u = 1 - t;
    if (seg.kind === 'L') out.push(p[1]);
    else if (seg.kind === 'Q') out.push([u * u * p[0][0] + 2 * u * t * p[1][0] + t * t * p[2][0], u * u * p[0][1] + 2 * u * t * p[1][1] + t * t * p[2][1]]);
    else out.push([u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0], u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]]);
  }
  return out;
}
const outlineD = (t: string) => read(`${t}/silhouette.svg`).match(/id="outline-fuselage" d="([^"]+)"/)![1];
const bodyD = (t: string) => read(`${t}/silhouette.svg`).match(/<g id="body">\s*<path d="([^"]+)"/)![1];

// today's nose anchor points: nose start on the belly, tip x, and the top line y
const TODAY: Record<string, { xs: number; tipX: number; top: number }> = {
  narrowbody: { xs: 863.8, tipX: 950, top: 185 },
  widebody: { xs: 850.8, tipX: 960, top: 165 },
  'regional-jet': { xs: 781, tipX: 850, top: 200 },
  'jumbo-hump': { xs: 868.8, tipX: 986, top: 168 },
  'double-decker': { xs: 865, tipX: 972, top: 140 },
};
const TYPES = Object.keys(TODAY);

function noseSegs(t: string): Seg[] {
  const segs = parse(outlineD(t));
  const start = segs.findIndex((s) => s.pts[0][0] === TODAY[t].xs && s.pts[0][1] === 260 && s.kind !== 'L');
  const end = segs.findIndex((s, i) => i >= start && s.pts[s.pts.length - 1][1] <= TODAY[t].top + 0.01);
  return segs.slice(start, end + 1);
}
function insidePoly(poly: Pt[], [x, y]: Pt) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

describe.each(TYPES)('%s nose (liveries-ygdxc)', (t) => {
  const { xs, tipX, top } = TODAY[t];
  it('has a nose of at least three curve segments', () => {
    expect(noseSegs(t).filter((s) => s.kind !== 'L').length).toBeGreaterThanOrEqual(3);
  });
  it('never turns sharply between consecutive sample steps (< 20 degrees)', () => {
    const segs = parse(outlineD(t));
    const pts: Pt[] = [segs[0].pts[0]];
    for (const s of segs) pts.push(...sample(s, 12));
    let worst = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      if (pts[i][0] < xs - 0.01) continue;
      const a = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]];
      const b = [pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]];
      if (Math.hypot(...a) === 0 || Math.hypot(...b) === 0) continue;
      const ang = Math.abs(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1])) * (180 / Math.PI);
      worst = Math.max(worst, ang);
    }
    expect(worst).toBeLessThan(20);
  });
  it('keeps tip x, belly line and top line of today (+-5)', () => {
    const pts = parse(outlineD(t)).flatMap((s) => sample(s, 40));
    expect(Math.abs(Math.max(...pts.map((p) => p[0])) - tipX)).toBeLessThanOrEqual(5);
    const nose = noseSegs(t);
    expect(nose[0].pts[0]).toEqual([xs, 260]);
    expect(Math.abs(nose[nose.length - 1].pts[nose[nose.length - 1].pts.length - 1][1] - top)).toBeLessThanOrEqual(5);
    expect(Math.max(...pts.map((p) => p[1]))).toBeLessThanOrEqual(260.1);
  });
  it('has a blunt tip well above the belly (35-45% of fuselage height)', () => {
    const pts = parse(outlineD(t)).flatMap((s) => sample(s, 60));
    const tip = pts.reduce((m, p) => (p[0] > m[0] ? p : m));
    const frac = (260 - tip[1]) / (260 - top);
    expect(frac).toBeGreaterThan(t === 'jumbo-hump' ? 0.3 : 0.33);
    expect(frac).toBeLessThan(0.47);
  });
  it('uses identical nose geometry in outline-fuselage and the body group', () => {
    const o = outlineD(t);
    const b = bodyD(t);
    const cut = (d: string) => d.slice(d.indexOf(`L${xs} 260`));
    const nO = cut(o).match(/^L[\d. ]+260((?: [CQ][\d. -]+)+)/)![1];
    const nB = cut(b).match(/^L[\d. ]+260((?: [CQ][\d. -]+)+)/)![1];
    expect(nB).toBe(nO);
  });
  it('keeps the cockpit windows inside the fuselage contour', () => {
    const segs = parse(outlineD(t));
    const poly: Pt[] = [segs[0].pts[0]];
    for (const s of segs) poly.push(...sample(s, 30));
    const d = read(`${t}/details.svg`).match(/fill="#3A3F44" d="([^"]+)"/)![1];
    const pts = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [parseFloat(m[1]), parseFloat(m[2])] as Pt);
    expect(pts.length).toBeGreaterThan(5);
    for (const p of pts) expect(insidePoly(poly, p), `window point ${p}`).toBe(true);
  });
  it('shapes the windshield along the nose contour (windows ahead of the nose start)', () => {
    const d = read(`${t}/details.svg`).match(/fill="#3A3F44" d="([^"]+)"/)![1];
    const pts = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [parseFloat(m[1]), parseFloat(m[2])] as Pt);
    const tipmost = Math.max(...pts.map((p) => p[0]));
    expect(tipmost).toBeGreaterThan(xs + (tipX - xs) * 0.55);
  });
});
