import { describe, expect, it } from 'vitest';
import { PLANE_TYPE_IDS } from '../../src/client/ui/domain/catalog';
import { TRANSITIONS, TRANSITION_MS } from '../../src/client/ui/transitions/catalog';
import { EQUAL_TRANSITIONS } from '../../src/client/ui/transitions/catalog-equal';
import { renderTransition } from '../../src/client/ui/transitions/player';
import { renderEqualBadgeSlot, renderEqualPlaneSlot, renderSceneLayerEqual } from '../../src/client/ui/organisms/scene-layer-equal';
import { sampleTransitionData } from '../../src/client/ui/domain/transition-samples';
import { retypeData } from '../../src/client/ui/stories/equal-helpers';
import { readFileSync } from 'node:fs';
import * as scene from '../../src/client/ui/stories/scene-equal.stories';
import * as trans from '../../src/client/ui/stories/transitions-equal.stories';

const css = readFileSync('src/client/ui/styles/ui.css', 'utf8');
const rule = (sel: string) => new RegExp(`${sel.replace(/\./g, '\\.')} \\{([^}]*)\\}`).exec(css)![1];

describe('Entwurf: zwei Flugzeuge gleich groß (design-system-pyheh)', () => {
  it('both equal slots declare the same width; the live slots are untouched', () => {
    const w = (sel: string) => /width: ([^;]+);/.exec(rule(sel))![1];
    expect(w('.pa-slot-eq-one')).toBe(w('.pa-slot-eq-two'));
    expect(w('.pa-slot-one')).toBe('50%');
    expect(w('.pa-slot-two')).toBe('33%');
  });

  it('the scene layer uses own slot classes, never pa-slot-one/-two', () => {
    const layer = renderSceneLayerEqual({ planes: [{ type: 'narrowbody' }, { type: 'widebody' }] });
    expect([...layer.querySelectorAll('.pa-slot')].map((e) => e.className)).toEqual(['pa-slot pa-slot-eq-one', 'pa-slot pa-slot-eq-two']);
    expect(layer.querySelectorAll('.pa-badge-slot-eq-one, .pa-badge-slot-eq-two')).toHaveLength(2);
    expect(layer.querySelector('.pa-slot-one, .pa-slot-two')).toBeNull();
  });

  it('scene story has two select controls with exactly the ten Typklassen', () => {
    const at = scene.default.argTypes as Record<string, { control: string; options: string[] }>;
    for (const k of ['typeOne', 'typeTwo']) {
      expect(at[k].control).toBe('select');
      expect([...at[k].options].sort()).toEqual([...PLANE_TYPE_IDS].sort());
    }
    expect(PLANE_TYPE_IDS).toHaveLength(10);
  });

  it('changing the Typklasse re-renders that slot silhouette', () => {
    const el = (scene.Nebeneinander as any).render({ ...scene.default.args, typeOne: 'glider', typeTwo: 'helicopter' }) as HTMLElement;
    expect([...el.querySelectorAll('.pa-slot [data-plane-type]')].map((e) => (e as HTMLElement).dataset.planeType)).toEqual(['glider', 'helicopter']);
    expect(el.querySelector('.pa-bar-double')).not.toBeNull();
  });

  it('plane transitions: all 11 kommt/geht/wechselt, same ids/timing as the live set, only plane keyframes swapped', () => {
    expect(EQUAL_TRANSITIONS).toHaveLength(11);
    for (const t of EQUAL_TRANSITIONS) {
      const live = TRANSITIONS.find((x) => x.id === t.id)!;
      expect(t.layers.map((l) => l.kind)).toEqual(live.layers.map((l) => l.kind));
    }
    const anims = EQUAL_TRANSITIONS.flatMap((t) => t.layers.map((l) => l.anim?.name).filter(Boolean));
    expect(anims).toEqual(expect.arrayContaining(['pae-pa2-plane1', 'pae-pa5-p1', 'pae-pa6-p2', 'pae-pa7-pout']));
    const keyframes = readFileSync('src/client/ui/styles/transitions.css', 'utf8');
    for (const n of new Set(anims)) expect(keyframes, String(n)).toContain(`@keyframes ${n}{`);
  });

  it('the equal transition stage renders equal slots with the shared player and 5 s duration', () => {
    const spec = EQUAL_TRANSITIONS.find((t) => t.id === 'switch-two-both')!;
    const root = renderTransition({ spec, slots: { plane: renderEqualPlaneSlot, badge: renderEqualBadgeSlot }, data: retypeData(sampleTransitionData(spec.id), ['helicopter', 'glider']) });
    expect(root.querySelector('.pa-slot-one, .pa-slot-two')).toBeNull();
    expect(root.querySelectorAll('.pa-slot-eq-one, .pa-slot-eq-two').length).toBe(4);
    expect(root.querySelector('.pa-play')).not.toBeNull();
    expect((root.querySelector('[data-anim-name]') as HTMLElement).style.animation).toContain('5s');
    expect(TRANSITION_MS).toBe(5000);
    expect(root.querySelector('[data-side="to"][data-index="0"] [data-plane-type]')!.getAttribute('data-plane-type')).toBe('helicopter');
  });

  it('the transition stories exist for kommt, geht, wechselt and offer both type selects', () => {
    expect(Object.keys(trans).filter((k) => k !== 'default')).toEqual(['FlugzeugKommt', 'FlugzeugGeht', 'FlugzeugWechselt']);
    const at = trans.default.argTypes as Record<string, { options: string[] }>;
    expect(at.typeOne.options).toHaveLength(10);
    expect(at.typeTwo.options).toHaveLength(10);
  });

  it('a plane keeps its type across a change, a new arrival takes its slot index type', () => {
    const d = retypeData(sampleTransitionData('switch-two-1'), ['glider', 'helicopter']);
    expect([d.from[0].plane.type, d.from[1].plane.type, d.to[0].plane.type, d.to[1].plane.type]).toEqual(['glider', 'helicopter', 'glider', 'helicopter']);
    const e = retypeData(sampleTransitionData('two-to-one-a'), ['glider', 'helicopter']);
    expect(e.to[0].plane.type).toBe('helicopter');
  });
});
