// All transitions of Screens.html as declarative specs. Each spec lists the stacked layers of a screen;
// layers with `anim` move/fade via the keyframes in styles/transitions.css. Duration is ~5 s (DURATION).
import { SKY_TIMES, SKY_WEATHERS, skyInk, type Ink, type SkyKey, type SkyTime, type SkyWeather } from '../domain/catalog';
import { RECENT_TEXT, type SampleKey } from '../domain/samples';
import type { PlaneSlot } from '../organisms/scene-layer';

export const DURATION = '5s';

export interface Anim { name: string; timing: string }

export type BarSpec =
  | { kind: 'single'; flight: SampleKey }
  | { kind: 'double'; flights: [SampleKey, SampleKey] }
  | { kind: 'recent'; text: string };

export type Layer =
  | { kind: 'sky'; sky: SkyKey; anim?: Anim }
  | { kind: 'header'; ink: Ink; anim?: Anim }
  | { kind: 'plane'; slot: PlaneSlot; plane: SampleKey; anim?: Anim }
  | { kind: 'badge'; n: 1 | 2; anim?: Anim }
  | { kind: 'bar'; bar: BarSpec; anim?: Anim };

export type TransitionGroup = 'Flugzeug kommt' | 'Flugzeug geht' | 'Flugzeug wechselt' | 'Wetter wechselt' | 'Tageszeit wechselt';

export interface TransitionSpec { id: string; group: TransitionGroup; label: string; layers: Layer[] }

// Easing curves used by the drafts.
const OUT = 'cubic-bezier(.22,.61,.36,1)'; // arriving things
const IN = 'cubic-bezier(.55,0,.75,.4)'; // leaving things
const MOVE = 'cubic-bezier(.45,0,.25,1)'; // things that stay but move
const EASE = 'ease-in-out';
const POP = 'ease-out';
const a = (name: string, timing: string): Anim => ({ name, timing });

const DAY_LIGHT: SkyKey = { time: 'day', weather: 'light' };
const sky = (): Layer => ({ kind: 'sky', sky: DAY_LIGHT });
const header = (): Layer => ({ kind: 'header', ink: 'dark' });
const plane = (slot: PlaneSlot, p: SampleKey, anim?: Anim): Layer => ({ kind: 'plane', slot, plane: p, anim });
const badge = (n: 1 | 2, anim?: Anim): Layer => ({ kind: 'badge', n, anim });
const single = (f: SampleKey, anim?: Anim): Layer => ({ kind: 'bar', bar: { kind: 'single', flight: f }, anim });
const double = (f1: SampleKey, f2: SampleKey, anim?: Anim): Layer => ({ kind: 'bar', bar: { kind: 'double', flights: [f1, f2] }, anim });
const recent = (text: string, anim?: Anim): Layer => ({ kind: 'bar', bar: { kind: 'recent', text }, anim });

const planeTransitions: TransitionSpec[] = [
  { id: 'empty-to-one', group: 'Flugzeug kommt', label: 'Kein Flugzeug → Ein Flugzeug', layers: [sky(), header(), plane('single', 'A', a('pa-plane-in', OUT)), recent(RECENT_TEXT, a('pa-small-bar', EASE)), single('A', a('pa-big-bar', OUT))] },
  { id: 'one-to-two', group: 'Flugzeug kommt', label: 'Ein Flugzeug → Zwei Flugzeuge', layers: [sky(), header(), plane('single', 'A', a('pa2-plane1', MOVE)), badge(1, a('pa2-badge', POP)), plane('two', 'D', a('pa2-plane2', OUT)), badge(2, a('pa2-badge', POP)), single('A', a('pa2-bar1', EASE)), double('A', 'D', a('pa2-bar2', OUT))] },
  { id: 'empty-to-two', group: 'Flugzeug kommt', label: 'Kein Flugzeug → Zwei Flugzeuge', layers: [sky(), header(), plane('one', 'E', a('pa11-p1in', OUT)), plane('two', 'F', a('pa11-p2in', OUT)), badge(1, a('pa11-badge', POP)), badge(2, a('pa11-badge', POP)), recent(RECENT_TEXT, a('pa11-small', EASE)), double('E', 'F', a('pa11-bar', OUT))] },
  { id: 'one-to-empty', group: 'Flugzeug geht', label: 'Ein Flugzeug → Kein Flugzeug', layers: [sky(), header(), plane('single', 'A', a('pa4-plane', IN)), single('A', a('pa4-bar', EASE)), recent('Zuletzt: Lufthansa LH400 · gerade eben', a('pa4-small', OUT))] },
  { id: 'two-to-one-b', group: 'Flugzeug geht', label: 'Zwei → Eins · Flugzeug 2 geht', layers: [sky(), header(), plane('one', 'A', a('pa5-p1', MOVE)), plane('two', 'D', a('pa5-p2', IN)), badge(1, a('pa5-badge', POP)), badge(2, a('pa5-badge', POP)), double('A', 'D', a('pa5-bar2', EASE)), single('A', a('pa5-bar1', OUT))] },
  { id: 'two-to-one-a', group: 'Flugzeug geht', label: 'Zwei → Eins · Flugzeug 1 geht', layers: [sky(), header(), plane('two', 'D', a('pa6-p2', MOVE)), plane('one', 'A', a('pa6-p1', IN)), badge(1, a('pa5-badge', POP)), badge(2, a('pa5-badge', POP)), double('A', 'D', a('pa5-bar2', EASE)), single('D', a('pa5-bar1', OUT))] },
  { id: 'two-to-empty', group: 'Flugzeug geht', label: 'Zwei Flugzeuge → Kein Flugzeug', layers: [sky(), header(), plane('one', 'A', a('pa7-pout', IN)), plane('two', 'D', a('pa8-pout', IN)), badge(1, a('pa5-badge', POP)), badge(2, a('pa5-badge', POP)), double('A', 'D', a('pa5-bar2', EASE)), recent('Zuletzt: Lufthansa LH400 · Ryanair FR1724 · gerade eben', a('pa4-small', OUT))] },
  { id: 'switch-one', group: 'Flugzeug wechselt', label: 'Flugzeug → nächstes Flugzeug', layers: [sky(), header(), plane('single', 'A', a('pa3-plane-a', IN)), plane('single', 'E', a('pa3-plane-b', OUT)), single('A', a('pa3-bar-a', EASE)), single('E', a('pa3-bar-b', OUT))] },
  { id: 'switch-two-1', group: 'Flugzeug wechselt', label: 'Zwei → Zwei · Flugzeug 1 wechselt', layers: [sky(), header(), plane('one', 'A', a('pa7-pout', IN)), plane('one', 'E', a('pa7-pin', OUT)), plane('two', 'D'), badge(1, a('pa7-badge', POP)), badge(2), double('A', 'D', a('pa5-bar2', EASE)), double('E', 'D', a('pa5-bar1', OUT))] },
  { id: 'switch-two-2', group: 'Flugzeug wechselt', label: 'Zwei → Zwei · Flugzeug 2 wechselt', layers: [sky(), header(), plane('one', 'A'), plane('two', 'D', a('pa8-pout', IN)), plane('two', 'F', a('pa8-pin', OUT)), badge(1), badge(2, a('pa7-badge', POP)), double('A', 'D', a('pa5-bar2', EASE)), double('A', 'F', a('pa5-bar1', OUT))] },
  { id: 'switch-two-both', group: 'Flugzeug wechselt', label: 'Zwei → Zwei · Flugzeug 1 & 2 wechseln', layers: [sky(), header(), plane('one', 'A', a('pa7-pout', IN)), plane('one', 'E', a('pa7-pin', OUT)), plane('two', 'D', a('pa8-pout', IN)), plane('two', 'F', a('pa8-pin', OUT)), badge(1, a('pa7-badge', POP)), badge(2, a('pa7-badge', POP)), double('A', 'D', a('pa5-bar2', EASE)), double('E', 'F', a('pa5-bar1', OUT))] },
];

const wx = a('pa-wx', EASE);
const wxOut = a('pa-wx-out', EASE);

/** Crossfade between two skies; the header text cross-fades its ink as well. One plane stays. */
function crossfade(id: string, group: TransitionGroup, label: string, from: SkyKey, to: SkyKey): TransitionSpec {
  return {
    id, group, label,
    layers: [{ kind: 'sky', sky: from }, { kind: 'sky', sky: to, anim: wx }, { kind: 'header', ink: skyInk(from), anim: wxOut }, { kind: 'header', ink: skyInk(to), anim: wx }, plane('single', 'A'), single('A')],
  };
}

const weatherLabel = (w: SkyWeather) => SKY_WEATHERS.find((x) => x.id === w)!.label;
const timeLabel = (t: SkyTime) => SKY_TIMES.find((x) => x.id === t)!.label;

const weatherPairs: [SkyWeather, SkyWeather][] = [['light', 'clear'], ['clear', 'light'], ['light', 'overcast'], ['overcast', 'rain'], ['rain', 'storm'], ['overcast', 'fog'], ['overcast', 'snow']];
const timePairs: [SkyTime, SkyTime][] = [['dawn', 'day'], ['day', 'dusk'], ['dusk', 'night'], ['night', 'dawn']];

const weatherTransitions = weatherPairs.map(([f, t]) => crossfade(`wx-${f}-${t}`, 'Wetter wechselt', `${weatherLabel(f)} → ${weatherLabel(t)}`, { time: 'day', weather: f }, { time: 'day', weather: t }));
const timeTransitions = timePairs.map(([f, t]) => crossfade(`tod-${f}-${t}`, 'Tageszeit wechselt', `${timeLabel(f)} → ${timeLabel(t)}`, { time: f, weather: 'light' }, { time: t, weather: 'light' }));

export const TRANSITIONS: readonly TransitionSpec[] = [...planeTransitions, ...weatherTransitions, ...timeTransitions];

export const TRANSITION_GROUPS: readonly TransitionGroup[] = ['Flugzeug kommt', 'Flugzeug geht', 'Flugzeug wechselt', 'Wetter wechselt', 'Tageszeit wechselt'];
