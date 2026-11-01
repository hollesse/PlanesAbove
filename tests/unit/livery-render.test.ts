import { describe, expect, it } from 'vitest';
import type { LiveryFile } from '../../src/client/ui/domain/livery-file';
import { pathData, renderLiverySvg } from '../../src/client/ui/domain/livery-render';

const file: LiveryFile = {
  version: 1, livery: 'spike', typklasse: 'narrowbody',
  fields: { engines: '#112233', wings: '#e1e3e1', tailplane: '#e1e3e1' },
  layers: [{ type: 'path', points: [[300, 150], [700, 150], [700, 300], [300, 300]], color: '#d6001c' }],
};
const dom = (svg: string) => { const d = document.createElement('div'); d.innerHTML = svg; return d; };

describe('renderLiverySvg (ADR 0032 point 6)', () => {
  it('gives every render instance its own clipPath id, so several liveries can share one document', () => {
    const host = dom(renderLiverySvg(file) + renderLiverySvg(file));
    const ids = [...host.querySelectorAll('[id]')].map((e) => e.id);
    expect(ids.length).toBe(4);
    expect(new Set(ids).size).toBe(4);
    for (const g of host.querySelectorAll('.lv-paint')) expect(host.querySelector(g.getAttribute('clip-path')!.replace(/^url\((#.*)\)$/, '$1'))?.tagName.toLowerCase()).toBe('clippath');
  });
  it('stacks colour fields, white body, clipped paths, outline, details from the bottom', () => {
    const order = [...dom(renderLiverySvg(file)).querySelector('svg')!.children].map((c) => c.getAttribute('class') ?? c.tagName);
    expect(order).toEqual(['defs', 'lv-silhouette', 'lv-paint', 'lv-outline', 'lv-details']);
    const sil = dom(renderLiverySvg(file)).querySelector('.lv-silhouette')!;
    expect([...sil.children].map((c) => c.getAttribute('class'))).toEqual(['lv-field-engines', 'lv-field-wings', 'lv-field-tailplane', 'lv-body']);
    expect(sil.querySelector('.lv-field-engines')!.getAttribute('fill')).toBe('#112233');
  });
  it('shows paths unclipped (ghost) only while the silhouette is faded', () => {
    expect(dom(renderLiverySvg(file)).querySelector('.lv-ghost')).toBeNull();
    const faded = dom(renderLiverySvg(file, { silhouetteOpacity: 0 })).querySelector('svg')!;
    expect(faded.querySelector('.lv-ghost')!.hasAttribute('opacity')).toBe(false); // fully opaque
    expect(faded.querySelector('.lv-ghost')!.hasAttribute('clip-path')).toBe(false);
    expect(faded.querySelector('.lv-silhouette')!.getAttribute('opacity')).toBe('0');
  });
  it('bends a segment through a via point (control = 2*via - (a+b)/2)', () => {
    expect(pathData({ points: [[0, 0], [10, 0], [10, 10]], via: [[5, -5], null, null] })).toBe('M0 0 Q5 -10 10 0 L10 10 Z');
  });
});

describe('outline: fuselage drawn fully, fin masked (liveries-yzshd)', () => {
  it('draws the fuselage outline unmasked and the fin outline behind a per-instance mask', () => {
    const host = dom(renderLiverySvg(file) + renderLiverySvg(file));
    const outlines = [...host.querySelectorAll('.lv-outline')];
    const maskIds = [...host.querySelectorAll('mask')].map((m) => m.id);
    expect(new Set(maskIds).size).toBe(2);
    for (const [i, o] of outlines.entries()) {
      expect(o.querySelector('.lv-outline-fuselage')!.hasAttribute('mask')).toBe(false);
      expect(o.querySelector('.lv-outline-fin')!.getAttribute('mask')).toBe(`url(#${maskIds[i]})`);
    }
  });
  it('keeps #body (union) as the paint clipPath', () => {
    const host = dom(renderLiverySvg(file));
    expect(host.querySelector('clipPath path')).not.toBeNull();
    expect(host.querySelector('.lv-paint')!.getAttribute('clip-path')).toMatch(/-clip\)$/);
  });
});

describe('outline fallback', () => {
  it('uses #body as the outline when a Typklasse has no outline paths', async () => {
    const { PLANE_PARTS } = await import('../../src/client/ui/assets/generated/plane-parts');
    const orig = PLANE_PARTS.narrowbody;
    (PLANE_PARTS as any).narrowbody = { ...orig, outlines: undefined };
    try {
      const host = dom(renderLiverySvg(file));
      expect(host.querySelector('mask')).toBeNull();
      expect(host.querySelector('.lv-outline path')!.getAttribute('d')).toBe(dom(orig.body).querySelector('path')!.getAttribute('d'));
    } finally { (PLANE_PARTS as any).narrowbody = orig; }
  });
});
