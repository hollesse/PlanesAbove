import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DURATION, TRANSITIONS, TRANSITION_GROUPS, TRANSITION_MS, type TransitionData } from '../../src/client/ui/transitions/catalog';
import { sampleTransitionData } from '../../src/client/ui/domain/transition-samples';
import { SAMPLE_FLIGHTS, SAMPLE_PLANES } from '../../src/client/ui/domain/samples';
import { stageSummary } from './fixtures/stage-summary';
import { playTransition, renderTransition, renderTransitionStage, resetTransition } from '../../src/client/ui/transitions/player';

const baseline = JSON.parse(fs.readFileSync('tests/unit/fixtures/transition-stages.json', 'utf8'));
const css = fs.readFileSync('src/client/ui/styles/transitions.css', 'utf8');

describe('Übergänge', () => {
  it('covers all 22 transitions of Screens.html in five groups', () => {
    expect(TRANSITIONS).toHaveLength(22);
    expect(new Set(TRANSITIONS.map((t) => t.group))).toEqual(new Set(TRANSITION_GROUPS));
    expect(new Set(TRANSITIONS.map((t) => t.id)).size).toBe(22);
    for (const g of TRANSITION_GROUPS) expect(TRANSITIONS.filter((t) => t.group === g).length).toBeGreaterThan(0);
    expect(TRANSITIONS.filter((t) => t.group === 'Wetter wechselt')).toHaveLength(7);
    expect(TRANSITIONS.filter((t) => t.group === 'Tageszeit wechselt')).toHaveLength(4);
  });

  it('every animation refers to a keyframe that exists', () => {
    for (const t of TRANSITIONS) for (const l of t.layers) if (l.anim) expect(css, `${t.id}: ${l.anim.name}`).toContain(`@keyframes ${l.anim.name}{`);
  });

  it('every transition animates something and builds a paused stage', () => {
    for (const t of TRANSITIONS) {
      const stage = renderTransitionStage(t, sampleTransitionData(t.id));
      const animated = stage.querySelectorAll<HTMLElement>('[data-anim-name]');
      expect(animated.length, t.id).toBeGreaterThan(0);
      animated.forEach((el) => expect(el.style.getPropertyValue('animation')).toContain('paused'));
    }
  });

  it('plays on demand and can be reset', () => {
    const stage = renderTransitionStage(TRANSITIONS[0], sampleTransitionData(TRANSITIONS[0].id));
    playTransition(stage);
    const el = stage.querySelector<HTMLElement>('[data-anim-name]')!;
    expect(el.style.getPropertyValue('animation-play-state')).toBe('running');
    expect(el.style.getPropertyValue('animation-name')).toBe(el.dataset.animName);
    resetTransition(stage);
    expect(el.style.getPropertyValue('animation-play-state')).toBe('paused');
  });

  it('Start button plays the transition', () => {
    const root = renderTransition({ spec: TRANSITIONS[3] });
    root.querySelector<HTMLButtonElement>('button')!.click();
    expect(root.querySelector<HTMLElement>('[data-anim-name]')!.style.getPropertyValue('animation-play-state')).toBe('running');
  });

  it('weather crossfade swaps the header ink with the sky (rain -> storm both light, overcast -> rain dark to light)', () => {
    const t = TRANSITIONS.find((x) => x.id === 'wx-overcast-rain')!;
    const inks = t.layers.filter((l) => l.kind === 'header').map((l) => (l as { ink: string }).ink);
    expect(inks).toEqual(['dark', 'light']);
  });
  it('every sky of every weather and time-of-day transition covers the stage (slice, 100% x 100%)', () => {
    const specs = TRANSITIONS.filter((t) => t.group === 'Wetter wechselt' || t.group === 'Tageszeit wechselt');
    expect(specs.length).toBe(11);
    for (const t of specs) {
      const svgs = renderTransitionStage(t, sampleTransitionData(t.id)).querySelectorAll<SVGElement>('.pa-sky svg');
      expect(svgs.length, t.id).toBeGreaterThanOrEqual(2);
      svgs.forEach((svg) => {
        expect(svg.getAttribute('preserveAspectRatio'), t.id).toBe('xMidYMid slice');
        expect(svg.style.width, t.id).toBe('100%');
        expect(svg.style.height, t.id).toBe('100%');
      });
    }
  });

  const planeSpecs = TRANSITIONS.filter((t) => t.group !== 'Wetter wechselt' && t.group !== 'Tageszeit wechselt');

  it('plane specs hold no sample keys; every reference resolves against the sample data', () => {
    expect(planeSpecs).toHaveLength(11);
    for (const t of planeSpecs) {
      const data = sampleTransitionData(t.id);
      for (const l of t.layers) {
        if (l.kind === 'plane') {
          expect(typeof l.plane, t.id).toBe('object');
          expect(l.plane.index, t.id).toBeLessThan(data[l.plane.side].length);
        }
        if (l.kind === 'bar') {
          const b = l.bar;
          if (b.kind === 'single') expect(b.flight.index, t.id).toBeLessThan(data[b.flight.side].length);
          if (b.kind === 'double') b.flights.forEach((r) => expect(r.index, t.id).toBeLessThan(data[r.side].length));
          if (b.kind === 'recent') expect(data.recent[b.text], t.id).toBeTruthy();
        }
      }
    }
  });

  it('example-driven stages equal the pre-refactor snapshot (layer order, animations, slot classes, markup)', () => {
    for (const t of TRANSITIONS) {
      expect(stageSummary(renderTransitionStage(t, sampleTransitionData(t.id))), t.id).toEqual(baseline[t.id]);
    }
  });

  const custom: TransitionData = {
    from: [{ plane: SAMPLE_PLANES.C, flight: { ...SAMPLE_FLIGHTS.C, callsign: 'XX111', aircraft: 'Zeppelin NT' } }, { plane: SAMPLE_PLANES.B, flight: { ...SAMPLE_FLIGHTS.B, callsign: 'YY222', aircraft: 'Ballon' } }],
    to: [],
    sky: { time: 'night', weather: 'clear' },
    place: 'Testweg 1',
    clock: '03:33',
    recent: { to: 'Zuletzt: Testflug XX111 · eben' },
  };

  it('renders exactly the given data (callsign, type, recent text) and no sample data', () => {
    const spec = TRANSITIONS.find((t) => t.id === 'two-to-empty')!;
    const text = renderTransitionStage(spec, custom).textContent!;
    for (const s of ['XX111', 'YY222', 'Zeppelin NT', 'Ballon', 'Zuletzt: Testflug XX111 · eben', 'Testweg 1', '03:33']) expect(text).toContain(s);
    for (const s of ['LH400', 'FR1724', 'Lufthansa', 'Kirchstrasse', 'gerade eben']) expect(text).not.toContain(s);
  });

  it('night sky gives plane specs a light header ink; a missing reference skips the layer without throwing', () => {
    const spec = TRANSITIONS.find((t) => t.id === 'two-to-empty')!;
    expect(renderTransitionStage(spec, custom).querySelector('.pa-scene-header')!.classList.contains('pa-ink-light')).toBe(true);
    const missing: TransitionData = { ...custom, recent: {} };
    let stage!: HTMLElement;
    expect(() => { stage = renderTransitionStage(spec, missing); }).not.toThrow();
    expect(stage.textContent).not.toContain('Zuletzt');
    expect(stage.children.length).toBe(renderTransitionStage(spec, custom).children.length - 1);
    const none: TransitionData = { ...custom, from: [], to: [], recent: {} };
    for (const t of TRANSITIONS) expect(() => renderTransitionStage(t, none), t.id).not.toThrow();
  });

  it('TRANSITION_MS matches DURATION', () => {
    expect(TRANSITION_MS).toBe(5000);
    expect(TRANSITION_MS).toBe(parseFloat(DURATION) * 1000);
  });

  // [id, plane to, plane from, badge to, badge from, bar to, bar from]
  // Convention: leaving layers read `from`; arriving or staying ones read `to`.
  // Badge reads `to` when the target side still has that slot, else `from`.
  // Bar follows its first plane ref (recent: its text side).
  const SIDES: [string, number, number, number, number, number, number][] = [
    ['empty-to-one', 1, 0, 0, 0, 1, 1],
    ['one-to-two', 2, 0, 2, 0, 1, 1], // staying plane A reads `to`; both badges pop in fresh
    ['empty-to-two', 2, 0, 2, 0, 1, 1],
    ['one-to-empty', 0, 1, 0, 0, 1, 1],
    ['two-to-one-b', 1, 1, 1, 1, 1, 1],
    ['two-to-one-a', 1, 1, 1, 1, 1, 1],
    ['two-to-empty', 0, 2, 0, 2, 1, 1],
    ['switch-one', 1, 1, 0, 0, 1, 1],
    ['switch-two-1', 2, 1, 2, 0, 1, 1],
    ['switch-two-2', 2, 1, 2, 0, 1, 1],
    ['switch-two-both', 2, 2, 2, 0, 1, 1],
  ];

  it('covers every plane spec in the data-side table', () => {
    expect(SIDES.map((r) => r[0]).sort()).toEqual(TRANSITIONS.filter((t) => t.group.startsWith('Flugzeug')).map((t) => t.id).sort());
  });

  it.each(SIDES)('%s: data-side counts (plane/badge/bar to,from)', (id, pt, pf, bt, bf, brt, brf) => {
    const spec = TRANSITIONS.find((t) => t.id === id)!;
    const stage = renderTransitionStage(spec, sampleTransitionData(spec.id));
    const n = (sel: string, side: string) => stage.querySelectorAll(`${sel}[data-side="${side}"]`).length;
    expect([n('.pa-slot', 'to'), n('.pa-slot', 'from')], 'plane').toEqual([pt, pf]);
    expect([n('.pa-badge-slot', 'to'), n('.pa-badge-slot', 'from')], 'badge').toEqual([bt, bf]);
    expect([n('.pa-bar', 'to'), n('.pa-bar', 'from')], 'bar').toEqual([brt, brf]);
  });
});
