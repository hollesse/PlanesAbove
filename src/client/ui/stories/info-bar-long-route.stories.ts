// Spike design-system-h3b7q: three drafts for a long route in the info bar. Story-local only - components and ui.css stay untouched.
// Every draft re-uses the real organism and then applies draft rules (pa-draft-* classes, inline font-size in cqw) after mount,
// measuring the real layout so the in-story check ("passt" / "Überlauf") is based on bounding boxes.
import type { Meta, StoryObj } from '@storybook/html-vite';
import { h } from '../dom';
import type { FlightInfo } from '../domain/flight';
import { SAMPLE_FLIGHTS } from '../domain/samples';
import { renderInfoBar } from '../organisms/info-bar';
import type { ScreenAspect } from '../templates/screen';
import { ASPECTS, skyStage } from './helpers';

type Variant = 'A' | 'B' | 'C' | 'D';

const LONG_1: FlightInfo = { ...SAMPLE_FLIGHTS.A, operator: 'Iberia', callsign: 'IB1234', route: 'Santiago de Compostela (SCQ) → Jerez de la Frontera (XRY)', phase: 'climb' };
const LONG_2: FlightInfo = { ...SAMPLE_FLIGHTS.D, route: 'Santiago de Compostela (SCQ) → Jerez de la Frontera (XRY)' };
const SHORT_1: FlightInfo = { ...SAMPLE_FLIGHTS.A, route: 'Frankfurt (FRA) → New York (JFK)' };
const SHORT_2: FlightInfo = { ...SAMPLE_FLIGHTS.C, route: 'Köln (CGN) → Palma (PMI)' };
const EYEBROW_VIA = ' · über Sharjah';

const css = `
.pa-draft-route-line { display: block; white-space: nowrap; }
.pa-draft-route-wrap { white-space: normal; line-height: 1.05; }
.pa-draft-check { position: absolute; right: 6px; top: 6px; z-index: 5; font: 600 11px/1 var(--pa-font-mono, monospace); padding: 3px 6px; border: 1px solid #0a7a2f; background: #e6f6ea; color: #0a7a2f; }
.pa-draft-check[data-ok="false"] { border-color: #b00020; background: #fde7ea; color: #b00020; }
.pa-draft-caption { font: 600 11px/1.4 var(--pa-font-mono, monospace); letter-spacing: .08em; text-transform: uppercase; }
.pa-draft-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 24px; }
.pa-draft-pair > div { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
`;

/** Name tiers by the length of the longest label (incl. code): up to 16 full, up to 22 about 80 %, above about 65 %. */
const tier = (route: string): number => {
  const longest = Math.max(...route.split(' → ').map((s) => s.length));
  return longest <= 16 ? 1 : longest <= 22 ? 0.8 : 0.65;
};
const B_THRESHOLD = { single: 30, double: 40 }; // B: break before the arrow once the route is longer than this (the low two-plane row needs a higher threshold)
const C_MIN = 0.5; // C: smallest allowed scale
// D (operator's pick, 2026-10-28): single view shrinks first (down to D_MIN_SINGLE) and breaks before the arrow only if that is still not enough;
// two-plane view behaves like C (one line, shrink only). Short routes shrink a little instead of wrapping.
const D_MIN_SINGLE = 0.6;

/** Shrinks in 2 % steps until the text fits or the minimum is reached; returns the final scale. */
const shrinkUntilFits = (el: HTMLElement, min: number, start = 1): number => {
  let s = start;
  setScale(el, s);
  while (!fits(el) && s > min) setScale(el, (s = Math.round((s - 0.02) * 100) / 100));
  return s;
};

const routeEls = (stage: HTMLElement): HTMLElement[] => [...stage.querySelectorAll<HTMLElement>('.pa-route-large')];
const baseSize = (el: HTMLElement): number => (el.closest('.pa-bar-single') ? 5 : 3.3);

const setScale = (el: HTMLElement, scale: number): void => {
  el.style.fontSize = scale === 1 ? '' : `${(baseSize(el) * scale).toFixed(2)}cqw`;
};

/** Break only before the arrow: line 1 = start airport, line 2 = "→ end airport". Never inside a name. */
const breakBeforeArrow = (el: HTMLElement): void => {
  const [from, to] = (el.textContent ?? '').split(' → ');
  if (!to) return;
  el.classList.add('pa-draft-route-wrap');
  el.replaceChildren(h('span', { class: 'pa-draft-route-line', text: from }), h('span', { class: 'pa-draft-route-line', text: `→ ${to}` }));
};

/** Bounding-box check: route text inside the bar and inside its own text column; text blocks inside the bar/row vertically. */
function fits(el: HTMLElement): boolean {
  const box = el.closest<HTMLElement>('.pa-info-row') ?? el.closest<HTMLElement>('.pa-bar');
  if (!box) return true;
  const range = document.createRange();
  range.selectNodeContents(el);
  const text = range.getBoundingClientRect();
  const bar = el.closest('.pa-bar')!.getBoundingClientRect();
  const column = el.getBoundingClientRect();
  const row = box.getBoundingClientRect();
  const column2 = el.parentElement!.getBoundingClientRect();
  const lastBlock = el.parentElement!.lastElementChild!.getBoundingClientRect();
  const firstBlock = el.parentElement!.firstElementChild!.getBoundingClientRect();
  const tol = 1;
  return (
    text.left >= bar.left - tol && text.right <= bar.right + tol && text.right <= Math.max(column.right, column2.right) + tol && el.scrollWidth <= el.clientWidth + tol &&
    firstBlock.top >= row.top - tol && lastBlock.bottom <= row.bottom + tol
  );
}

function applyVariant(variant: Variant, stage: HTMLElement): void {
  for (const el of routeEls(stage)) {
    // Start from the untouched organism output each time (the draft is re-applied whenever the stage is resized).
    el.dataset.route ??= el.textContent ?? '';
    el.classList.remove('pa-draft-route-wrap');
    el.style.fontSize = '';
    el.textContent = el.dataset.route;
    const route = el.dataset.route;
    const t = tier(route);
    if (variant === 'A') {
      setScale(el, t);
      if (!fits(el)) breakBeforeArrow(el);
    } else if (variant === 'B') {
      setScale(el, t);
      if (route.length > B_THRESHOLD[el.closest('.pa-bar-single') ? 'single' : 'double']) breakBeforeArrow(el);
    } else if (variant === 'C') {
      shrinkUntilFits(el, C_MIN);
    } else if (el.closest('.pa-bar-single')) {
      shrinkUntilFits(el, D_MIN_SINGLE);
      if (!fits(el)) {
        breakBeforeArrow(el); // two lines at the name tier (like A), smaller only if even that does not fit
        setScale(el, t);
        if (!fits(el)) shrinkUntilFits(el, Math.min(t, D_MIN_SINGLE), t);
      }
    } else {
      shrinkUntilFits(el, C_MIN);
    }
  }
  const ok = routeEls(stage).every(fits);
  const sizes = routeEls(stage).map((el) => el.style.fontSize || `${baseSize(el)}cqw`).join(' / ');
  const lines = routeEls(stage).map((el) => (el.classList.contains('pa-draft-route-wrap') ? '2 Zeilen' : '1 Zeile')).join(' / ');
  const badge = stage.querySelector<HTMLElement>('.pa-draft-check')!;
  badge.dataset.ok = String(ok);
  badge.textContent = `${ok ? 'passt' : 'Überlauf'} · ${lines} · ${sizes}`;
}

/** Waits until the stage is in the document (and fonts are loaded) so the layout can be measured, then applies the draft. */
function whenMounted(stage: HTMLElement, run: () => void): void {
  const tick = (n: number): void => {
    if (stage.isConnected) {
      // Webfonts load lazily: request the ones used by the bar first, otherwise we would measure with the fallback font.
      const fonts = [...stage.querySelectorAll<HTMLElement>('.pa-route-large, .pa-eyebrow, .pa-meta-small')].map((e) => {
        const cs = getComputedStyle(e);
        return document.fonts.load(`${cs.fontWeight} 20px ${cs.fontFamily}`, e.textContent ?? '');
      });
      void Promise.all(fonts).then(() => document.fonts.ready).then(() => requestAnimationFrame(run));
    }
    else if (n < 200) requestAnimationFrame(() => tick(n + 1));
  };
  tick(0);
}

function draftStage(variant: Variant, aspect: ScreenAspect, flights: FlightInfo[]): HTMLElement {
  const withVia = flights.map((f) => (f.route && f.route.length > 40 ? { ...f, operator: `${f.operator}${EYEBROW_VIA}` } : f));
  const bar = flights.length === 1 ? renderInfoBar({ variant: 'single', flight: withVia[0] }) : renderInfoBar({ variant: 'double', flights: [withVia[0], withVia[1]] });
  const stage = skyStage({ time: 'day', weather: 'light' }, aspect, bar);
  stage.append(h('div', { class: 'pa-draft-check', text: '…', data: { ok: 'true' } }));
  whenMounted(stage, () => {
    applyVariant(variant, stage);
    new ResizeObserver(() => applyVariant(variant, stage)).observe(stage);
  });
  return stage;
}

/** Both aspect ratios side by side (4:3 and 5:3), with the in-story overflow check on each. */
function bothAspects(variant: Variant, flights: FlightInfo[]): HTMLElement {
  return h(
    'div',
    {},
    h('style', { text: css }),
    h('div', { class: 'pa-draft-pair' }, ...ASPECTS.map((a) => h('div', {}, draftStage(variant, a, flights), h('span', { class: 'pa-draft-caption', text: `Variante ${variant} · ${a}` })))),
  );
}

const meta: Meta = { title: 'Organisms/Info-Leiste · Entwürfe lange Route', parameters: { layout: 'padded' } };
export default meta;

const story = (variant: Variant, flights: FlightInfo[], name: string): StoryObj => ({ render: () => bothAspects(variant, flights), name });

export const AEinzel = story('A', [LONG_1], 'A · Einzelansicht lange Route');
export const AZwei = story('A', [LONG_1, LONG_2], 'A · Zwei Flugzeuge lange Route');
export const ANormal = story('A', [SHORT_1], 'A · Normalfall Einzelansicht');
export const ANormalZwei = story('A', [SHORT_1, SHORT_2], 'A · Normalfall Zwei Flugzeuge');
export const BEinzel = story('B', [LONG_1], 'B · Einzelansicht lange Route');
export const BZwei = story('B', [LONG_1, LONG_2], 'B · Zwei Flugzeuge lange Route');
export const BNormal = story('B', [SHORT_1], 'B · Normalfall Einzelansicht');
export const BNormalZwei = story('B', [SHORT_1, SHORT_2], 'B · Normalfall Zwei Flugzeuge');
export const CEinzel = story('C', [LONG_1], 'C · Einzelansicht lange Route');
export const CZwei = story('C', [LONG_1, LONG_2], 'C · Zwei Flugzeuge lange Route');
export const CNormal = story('C', [SHORT_1], 'C · Normalfall Einzelansicht');
export const CNormalZwei = story('C', [SHORT_1, SHORT_2], 'C · Normalfall Zwei Flugzeuge');
export const DEinzel = story('D', [LONG_1], 'D · Kombination · Einzelansicht lange Route');
export const DZwei = story('D', [LONG_1, LONG_2], 'D · Kombination · Zwei Flugzeuge lange Route');
export const DNormal = story('D', [SHORT_1], 'D · Kombination · Normalfall Einzelansicht');
export const DNormalZwei = story('D', [SHORT_1, SHORT_2], 'D · Kombination · Normalfall Zwei Flugzeuge');
