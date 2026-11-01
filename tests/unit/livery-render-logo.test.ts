import { describe, expect, it } from 'vitest';
import { LOGO_SVG } from '../../src/client/ui/assets/generated/logos';
import { logoSize, renderLiverySvg } from '../../src/client/ui/domain/livery-render';

const path = (color: string) => ({ type: 'path', points: [[300, 150], [700, 150], [700, 300], [300, 300]], color });
const logo = (over: object = {}) => ({ type: 'logo', src: 'lufthansa', x: 500, y: 220, scale: 1.2, rotation: 30, ...over });
const file = (layers: object[], typklasse = 'narrowbody') => ({ version: 1, livery: 'x', typklasse, fields: {}, layers }) as never;

describe('logo layers (ADR 0032 point 6)', () => {
  it('logoSize reads the viewBox; unknown src is null', () => {
    expect(logoSize('lufthansa')).toEqual({ w: 100, h: 100 });
    expect(logoSize('easyjet')).toEqual({ w: 445.99, h: 100 });
    expect(logoSize('nope')).toBeNull();
    expect(Object.keys(LOGO_SVG).length).toBeGreaterThan(0);
  });
  it('renders the logo centred on x/y, rotated and scaled, inside the clipped paint group', () => {
    const svg = renderLiverySvg(file([logo()]));
    const paint = svg.match(/<g class="lv-paint" clip-path="url\(#lv\d+-clip\)">([\s\S]*?)<\/g><g class="lv-outline"/)![1];
    expect(paint).toContain('transform="translate(500 220) rotate(30) scale(1.2)"');
    expect(paint).toContain('<svg x="-50" y="-50" width="100" height="100" viewBox="0 0 100 100">');
    expect(paint).toContain('<image');
  });
  it('keeps layer order between paths and logos', () => {
    const svg = renderLiverySvg(file([path('#111111'), logo(), path('#222222')]));
    const i = (s: string) => svg.indexOf(s);
    expect(i('#111111')).toBeLessThan(i('lv-logo'));
    expect(i('lv-logo')).toBeLessThan(i('#222222'));
  });
  it('the regional-jet mask path also carries logos', () => {
    const svg = renderLiverySvg(file([logo()], 'regional-jet'));
    expect(svg).toMatch(/<g class="lv-paint" mask="url\(#lv\d+-paint-mask\)"><g class="lv-logo"/);
  });
  it('unknown src gives a dashed placeholder, no error', () => {
    const svg = renderLiverySvg(file([logo({ src: 'nope' })]));
    expect(svg).toContain('lv-logo-missing');
    expect(svg).toContain('stroke-dasharray');
  });
  it('the unclipped ghost copy (silhouette opacity < 1) shows logos too', () => {
    const svg = renderLiverySvg(file([logo()]), { silhouetteOpacity: 0.5 });
    expect(svg.match(/class="lv-logo"/g)).toHaveLength(2);
  });
});
