import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLANE_PARTS } from '../../src/client/ui/assets/generated/plane-parts';
import { renderLiverySvg } from '../../src/client/ui/domain/livery-render';

const read = (p: string) => readFileSync(`src/client/ui/assets/${p}`, 'utf8');
const attr = (svg: string, cls: string) => svg.match(new RegExp(`class="${cls}"[^>]*\\sd="([^"]+)"`))![1];

describe.each(['widebody', 'regional-jet'])('%s plane assets (liveries-yafve)', (t) => {
  const legacy = read(`svg/${t}.svg`);
  const details = read(`planes/${t}/details.svg`);
  const parts = PLANE_PARTS[t];
  it('is a complete PLANE_PARTS entry', () => {
    expect(parts.viewBox).toBe('0 -60 1000 460');
    expect(parts.body).toContain('<path');
    expect(Object.keys(parts.fields).sort()).toEqual(t === 'widebody' ? ['engines', 'tailplane', 'wings'] : ['engines', 'wings']);
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
