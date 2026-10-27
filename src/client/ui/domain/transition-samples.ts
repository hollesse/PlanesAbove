// Sample data for the transition player (Storybook default): reproduces the Screens drafts exactly.
import type { TransitionData } from '../transitions/catalog';
import type { SkyKey } from './catalog';
import { RECENT_TEXT, SAMPLE_CLOCK, SAMPLE_FLIGHTS, SAMPLE_PLACE, SAMPLE_PLANES, type SampleKey } from './samples';
import type { ScreenPlane } from '../templates/screen';

const sp = (k: SampleKey): ScreenPlane => ({ plane: SAMPLE_PLANES[k], flight: SAMPLE_FLIGHTS[k] });
const keys = (ks: SampleKey[]): ScreenPlane[] => ks.map(sp);

const LAST_ONE = 'Zuletzt: Lufthansa LH400 · gerade eben';
const LAST_TWO = 'Zuletzt: Lufthansa LH400 · Ryanair FR1724 · gerade eben';

const PLANE_SAMPLES: Record<string, { from: SampleKey[]; to: SampleKey[]; recent?: { from?: string; to?: string } }> = {
  'empty-to-one': { from: [], to: ['A'], recent: { from: RECENT_TEXT } },
  'one-to-two': { from: ['A'], to: ['A', 'D'] },
  'empty-to-two': { from: [], to: ['E', 'F'], recent: { from: RECENT_TEXT } },
  'one-to-empty': { from: ['A'], to: [], recent: { to: LAST_ONE } },
  'two-to-one-b': { from: ['A', 'D'], to: ['A'] },
  'two-to-one-a': { from: ['A', 'D'], to: ['D'] },
  'two-to-empty': { from: ['A', 'D'], to: [], recent: { to: LAST_TWO } },
  'switch-one': { from: ['A'], to: ['E'] },
  'switch-two-1': { from: ['A', 'D'], to: ['E', 'D'] },
  'switch-two-2': { from: ['A', 'D'], to: ['A', 'F'] },
  'switch-two-both': { from: ['A', 'D'], to: ['E', 'F'] },
};

const DAY_LIGHT: SkyKey = { time: 'day', weather: 'light' };

/** Example data for a transition id; Wetter/Tageszeit specs keep plane A on both sides (their skies are literal in the spec). */
export function sampleTransitionData(id: string): TransitionData {
  const s = PLANE_SAMPLES[id] ?? { from: ['A'], to: ['A'] };
  return { from: keys(s.from), to: keys(s.to), sky: DAY_LIGHT, place: SAMPLE_PLACE, clock: SAMPLE_CLOCK, recent: s.recent ?? {} };
}
