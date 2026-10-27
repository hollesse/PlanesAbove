import { describe, expect, it } from 'vitest';
import { EXAMPLE_PAGES, renderScreen } from '../../src/client/ui';
import { renderSky } from '../../src/client/ui/atoms/sky';
import { renderSceneLayer } from '../../src/client/ui/organisms/scene-layer';
import { SAMPLE_PLANES } from '../../src/client/ui/domain/samples';

describe('Szene und Bildschirm', () => {
  it('sky layer of a stage is rendered as cover (slice, full width and height, centered)', () => {
    const states = new Set<string>();
    for (const aspect of ['4:3', '5:3'] as const) {
      for (const p of EXAMPLE_PAGES) {
        const stage = renderScreen({ ...p.props, aspect });
        states.add(`${aspect}/${stage.dataset.state}`);
        expect(stage.dataset.aspect).toBe(aspect);
        const svg = stage.querySelector('.pa-layer .pa-sky svg')!;
        expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid slice');
        expect(svg.getAttribute('style')).toContain('width:100%');
        expect(svg.getAttribute('style')).toContain('height:100%');
      }
    }
    expect([...states].sort()).toEqual(['4:3/empty', '4:3/one', '4:3/two', '5:3/empty', '5:3/one', '5:3/two']);
  });

  it('standalone sky atom keeps the full motif (no cover)', () => {
    const svg = renderSky({ time: 'day', weather: 'light' }).querySelector('svg')!;
    expect(svg.getAttribute('preserveAspectRatio')).not.toBe('xMidYMid slice');
    expect(svg.getAttribute('style')).toContain('height:auto');
  });

  it('scene layer shows 0, 1 or 2 planes; badges only with two', () => {
    expect(renderSceneLayer({ planes: [] }).querySelectorAll('.pa-slot')).toHaveLength(0);
    const one = renderSceneLayer({ planes: [SAMPLE_PLANES.A] });
    expect(one.querySelectorAll('.pa-slot-single')).toHaveLength(1);
    expect(one.querySelectorAll('.pa-badge')).toHaveLength(0);
    const two = renderSceneLayer({ planes: [SAMPLE_PLANES.A, SAMPLE_PLANES.D] });
    expect(two.querySelectorAll('.pa-slot')).toHaveLength(2);
    expect(two.querySelectorAll('.pa-badge')).toHaveLength(2);
    expect(() => renderSceneLayer({ planes: [SAMPLE_PLANES.A, SAMPLE_PLANES.B, SAMPLE_PLANES.C] })).toThrow();
  });

  it('renders the three Bildschirmzustände leer, eins, zwei', () => {
    const states = EXAMPLE_PAGES.map((p) => renderScreen(p.props).dataset.state);
    expect(states).toContain('empty');
    expect(states).toContain('one');
    expect(states).toContain('two');
    const empty = renderScreen(EXAMPLE_PAGES.find((p) => p.id === 'empty')!.props);
    expect(empty.querySelector('[data-state="recent"]')).not.toBeNull();
  });

  it('is 4:3 by default and 5:3 on request', () => {
    const props = EXAMPLE_PAGES[0].props;
    expect(renderScreen(props).className).toContain('pa-screen-4x3');
    expect(renderScreen({ ...props, aspect: '5:3' }).className).toContain('pa-screen-5x3');
  });

  it('smoke: renders outside Storybook into a plain document', () => {
    const el = renderScreen(EXAMPLE_PAGES[0].props);
    document.body.append(el);
    expect(document.body.querySelector('.pa-screen svg')).not.toBeNull();
    expect(el.textContent).toContain('Der Himmel über Kirchstrasse 17');
    expect(el.textContent).toContain('Frankfurt → New York');
  });
});
