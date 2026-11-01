import { describe, expect, it } from 'vitest';
import { PLANE_PARTS } from '../../src/client/ui/assets/generated/plane-parts';
import { renderLiverySvg } from '../../src/client/ui/domain/livery-render';

const file = (typklasse: string) =>
  ({ version: 1, livery: 'x', typklasse, fields: {}, layers: [{ type: 'path', points: [[300, 150], [700, 150], [700, 300], [300, 300]], color: '#d6001c' }] }) as never;

describe('field layering front/back (ADR 0038)', () => {
  it('narrowbody and widebody (only back fields) render byte-identical to before (snapshot)', () => {
    expect(renderLiverySvg(file('narrowbody')).replace(/lv\d+/g, 'lvN')).toMatchSnapshot();
    expect(renderLiverySvg(file('widebody')).replace(/lv\d+/g, 'lvN')).toMatchSnapshot();
  });
  it('build-assets passes the layer through; regional-jet engines are front, rest back', () => {
    expect(PLANE_PARTS['regional-jet'].fieldLayer).toEqual({ engines: 'front', wings: 'back' });
    expect(Object.values(PLANE_PARTS['widebody'].fieldLayer)).toEqual(['back', 'back', 'back']);
    expect(Object.keys(PLANE_PARTS['regional-jet'].fields).sort()).toEqual(['engines', 'wings']);
  });
  it('front fields are drawn after outline, before details; paints use a mask with the engines cut out', () => {
    const svg = renderLiverySvg(file('regional-jet'));
    expect(svg.indexOf('lv-outline')).toBeLessThan(svg.indexOf('lv-front-fields'));
    expect(svg.indexOf('lv-front-fields')).toBeLessThan(svg.indexOf('lv-details'));
    expect(svg).toMatch(/<g class="lv-paint" mask="url\(#lv\d+-paint-mask\)">/);
    expect(svg).toMatch(/<mask id="lv\d+-paint-mask"[^>]*><g fill="#fff">[\s\S]*<\/g><g fill="#000">[\s\S]*<\/g><\/mask>/);
    expect(svg.match(/class="lv-field-engines"/g)).toHaveLength(1);
    expect(svg.slice(0, svg.indexOf('lv-front-fields'))).not.toContain('lv-field-engines');
  });
});
