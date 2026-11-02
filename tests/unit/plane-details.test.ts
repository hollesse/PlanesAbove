import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLANE_PARTS } from '../../src/client/ui/assets/generated/plane-parts';
import { renderLiverySvg } from '../../src/client/ui/domain/livery-render';

const read = (p: string) => readFileSync(`src/client/ui/assets/${p}`, 'utf8');
const attr = (svg: string, cls: string) => svg.match(new RegExp(`class="${cls}"[^>]*\\sd="([^"]+)"`))![1];

describe.each(['widebody', 'regional-jet', 'jumbo-hump', 'double-decker'])('%s plane assets (liveries-yafve, liveries-ecn02)', (t) => {
  const legacy = read(`svg/${t}.svg`);
  const details = read(`planes/${t}/details.svg`);
  const parts = PLANE_PARTS[t];
  it('is a complete PLANE_PARTS entry', () => {
    expect(parts.viewBox).toBe('0 -60 1000 460');
    expect(parts.body).toContain('<path');
    expect(Object.keys(parts.fields).sort()).toEqual(t === 'regional-jet' ? ['engines', 'wings'] : ['engines', 'tailplane', 'wings']);
    expect(parts.outlines).toBeTruthy();
    expect(parts.details).toContain('<ellipse');
  });
  it('contains the complete paint-window-line path of the legacy graphic', () => {
    const d = attr(legacy, 'paint-window-line');
    expect(d.match(/M/g)!.length).toBeGreaterThan(1);
    expect(details).toContain(`fill="#3A3F44" d="${d}"`);
  });
  it('uses the legacy fuselage and tail outlines', () => {
    expect(parts.outlines!.fuselage).toBe(attr(legacy, 'fuselage-outline'));
    expect(parts.outlines!.fin).toBe(attr(legacy, 'tail-outline'));
  });
  it('renders without error with all layers', () => {
    const svg = renderLiverySvg({ version: 1, livery: 'x', typklasse: t, fields: { engines: '#111111', wings: '#e1e3e1', tailplane: '#e1e3e1' }, layers: [{ type: 'path', points: [[300, 150], [700, 150], [700, 300], [300, 300]], color: '#d6001c' }] } as never);
    expect(svg).toContain('lv-outline');
    expect(svg).toContain('lv-details');
  });
});

describe.each(['jumbo-hump', 'double-decker'])('%s fields all behind the body (liveries-ecn02)', (t) => {
  it('has no front-layer field and engines/wings/tailplane carry their legacy geometry count', () => {
    const sil = read(`planes/${t}/silhouette.svg`);
    expect(sil).not.toContain('data-layer');
    expect((sil.match(/<g id="field-engines">[\s\S]*?<\/g>/)![0].match(/<(path|rect)/g) ?? []).length).toBe(6);
    expect(Object.values(PLANE_PARTS[t].fieldLayer ?? {}).every((l) => l === 'back')).toBe(true);
  });
  it('has one engine-detail pair (strut line + fan ellipse) per engine', () => {
    const d = read(`planes/${t}/details.svg`);
    expect(d.match(/<ellipse/g)!.length).toBe(2);
    expect(d.match(/stroke-width="4"/g)!.length).toBe(2);
  });
});
