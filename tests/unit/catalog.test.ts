import { describe, expect, it } from 'vitest';
import { ALL_SKIES, PLANE_TYPES, SKY_TIMES, SKY_WEATHERS, skyId, skyInk } from '../../src/client/ui/domain/catalog';
import { SKY_SVG } from '../../src/client/ui/assets/generated/skies';
import { PLANE_SVG } from '../../src/client/ui/assets/generated/planes';
import { renderSky } from '../../src/client/ui/atoms/sky';
import { renderPlaneSilhouette } from '../../src/client/ui/atoms/plane-silhouette';

describe('catalog', () => {
  it('has 10 Typklassen and 28 Himmel (4 Tageszeiten x 7 Wetterlagen)', () => {
    expect(PLANE_TYPES).toHaveLength(10);
    expect(SKY_TIMES).toHaveLength(4);
    expect(SKY_WEATHERS).toHaveLength(7);
    expect(ALL_SKIES).toHaveLength(28);
  });

  it('has an SVG asset for every sky and every Typklasse', () => {
    for (const k of ALL_SKIES) expect(SKY_SVG[skyId(k)], skyId(k)).toContain('<svg');
    for (const t of PLANE_TYPES) expect(PLANE_SVG[t.id], t.id).toContain('<svg');
  });

  it('renders every sky and every silhouette as an element', () => {
    for (const k of ALL_SKIES) expect(renderSky(k).querySelector('svg')).not.toBeNull();
    for (const t of PLANE_TYPES) expect(renderPlaneSilhouette({ type: t.id }).querySelector('svg')).not.toBeNull();
  });

  it('has no empty "M Z" paths left in any plane (cleaned business-jet)', () => {
    for (const svg of Object.values(PLANE_SVG)) expect(svg).not.toMatch(/d="M Z"/);
  });

  it('chooses light Himmel-Tinte for dusk, night, rain and storm, dark otherwise', () => {
    expect(skyInk({ time: 'day', weather: 'light' })).toBe('dark');
    expect(skyInk({ time: 'dawn', weather: 'clear' })).toBe('dark');
    expect(skyInk({ time: 'dusk', weather: 'light' })).toBe('light');
    expect(skyInk({ time: 'night', weather: 'clear' })).toBe('light');
    expect(skyInk({ time: 'day', weather: 'rain' })).toBe('light');
    expect(skyInk({ time: 'day', weather: 'storm' })).toBe('light');
    expect(skyInk({ time: 'day', weather: 'snow' })).toBe('dark');
  });
});
