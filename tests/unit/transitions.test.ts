import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TRANSITIONS, TRANSITION_GROUPS } from '../../src/client/ui/transitions/catalog';
import { playTransition, renderTransition, renderTransitionStage, resetTransition } from '../../src/client/ui/transitions/player';

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
      const stage = renderTransitionStage(t);
      const animated = stage.querySelectorAll<HTMLElement>('[data-anim-name]');
      expect(animated.length, t.id).toBeGreaterThan(0);
      animated.forEach((el) => expect(el.style.getPropertyValue('animation')).toContain('paused'));
    }
  });

  it('plays on demand and can be reset', () => {
    const stage = renderTransitionStage(TRANSITIONS[0]);
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
});
