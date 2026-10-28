import { h } from '../dom';

// Long-route fit (design-system-grp94, variant D). The route line (.pa-route-large) never wraps inside an airport name and never
// leaves its bar. CSS cannot measure text, so after mount the real layout is measured and the font-size is adjusted in cqw.
//  - Single view (.pa-bar-single, base 5cqw): shrink first, down to 60 %; only if it still overflows, break before the arrow
//    (line 1 = start airport, line 2 = "→ end airport") at the name tier (<=16 chars 100 %, <=22 80 %, else 65 %), shrinking further if needed.
//  - Two-plane row (.pa-info-row, base 3.3cqw): always one line, shrink only, down to 50 %.
// Safari 16 safe: only getBoundingClientRect, Range, ResizeObserver, document.fonts.

const SINGLE_MIN = 0.6;
const ROW_MIN = 0.5;
const STEP = 0.02;
const ARROW = ' → ';

/** Name tier by the length of the longest label (incl. IATA code). */
export const nameTier = (route: string): number => {
  const longest = Math.max(...route.split(ARROW).map((s) => s.length));
  return longest <= 16 ? 1 : longest <= 22 ? 0.8 : 0.65;
};

const baseSize = (el: HTMLElement): number => (el.closest('.pa-bar-single') ? 5 : 3.3);

const setScale = (el: HTMLElement, scale: number): void => {
  el.style.fontSize = scale === 1 ? '' : `${(baseSize(el) * scale).toFixed(2)}cqw`;
};

/** Breaks only before the arrow: line 1 = start airport, line 2 = "→ end airport". Returns false if there is no arrow. */
export function breakBeforeArrow(el: HTMLElement): boolean {
  const [from, to] = (el.dataset.route ?? el.textContent ?? '').split(ARROW);
  if (!to) return false;
  el.classList.add('pa-route-wrap');
  el.replaceChildren(h('span', { class: 'pa-route-line', text: from }), h('span', { class: 'pa-route-line', text: `→ ${to}` }));
  return true;
}

/** Bounding-box check: the route text lies inside the bar and its text column; the text blocks lie inside the bar/row vertically. */
export function routeFits(el: HTMLElement): boolean {
  const bar = el.closest<HTMLElement>('.pa-bar');
  if (!bar) return true;
  const box = el.closest<HTMLElement>('.pa-info-row') ?? bar;
  const range = document.createRange();
  range.selectNodeContents(el);
  const text = range.getBoundingClientRect();
  const barBox = bar.getBoundingClientRect();
  const column = el.getBoundingClientRect();
  const parent = el.parentElement!;
  const columnBox = parent.getBoundingClientRect();
  const row = box.getBoundingClientRect();
  const first = parent.firstElementChild!.getBoundingClientRect();
  const last = parent.lastElementChild!.getBoundingClientRect();
  const tol = 1;
  return (
    text.left >= barBox.left - tol && text.right <= barBox.right + tol && text.right <= Math.max(column.right, columnBox.right) + tol &&
    el.scrollWidth <= el.clientWidth + tol && first.top >= row.top - tol && last.bottom <= row.bottom + tol
  );
}

function shrinkUntilFits(el: HTMLElement, min: number, start = 1): void {
  let s = start;
  setScale(el, s);
  while (!routeFits(el) && s > min) setScale(el, (s = Math.round((s - STEP) * 100) / 100));
}

/** Fits every route line inside `root` (idempotent: starts from the untouched organism output each time).
 *  Marks `root` with data-routes-fitted once done, so tests wait for the fit instead of a fixed delay. */
export function fitRoutes(root: HTMLElement): void {
  for (const el of root.querySelectorAll<HTMLElement>('.pa-route-large')) {
    el.dataset.route ??= el.textContent ?? '';
    el.classList.remove('pa-route-wrap');
    el.style.fontSize = '';
    el.textContent = el.dataset.route;
    if (el.closest('.pa-bar-single')) {
      shrinkUntilFits(el, SINGLE_MIN);
      if (!routeFits(el) && breakBeforeArrow(el)) {
        const tier = nameTier(el.dataset.route);
        setScale(el, tier);
        if (!routeFits(el)) shrinkUntilFits(el, Math.min(tier, SINGLE_MIN), tier);
      }
    } else {
      shrinkUntilFits(el, ROW_MIN);
    }
  }
  root.dataset.routesFitted = 'true';
}

/** Fits the routes once `root` is in the document and its webfonts are loaded, and again whenever it is resized. Call after every render. */
export function fitRoutesWhenMounted(root: HTMLElement): void {
  if (typeof requestAnimationFrame !== 'function') return; // no layout engine (unit tests)
  const tick = (n: number): void => {
    if (!root.isConnected) {
      if (n < 200) requestAnimationFrame(() => tick(n + 1));
      return;
    }
    const fonts = typeof document.fonts?.load === 'function'
      ? [...root.querySelectorAll<HTMLElement>('.pa-route-large, .pa-eyebrow, .pa-meta-small')].map((e) => {
          const cs = getComputedStyle(e);
          return document.fonts.load(`${cs.fontWeight} 20px ${cs.fontFamily}`, e.textContent ?? '');
        })
      : [];
    void Promise.all(fonts).then(() => document.fonts?.ready).then(() => requestAnimationFrame(() => {
      fitRoutes(root);
      if (typeof ResizeObserver === 'function') new ResizeObserver(() => requestAnimationFrame(() => fitRoutes(root))).observe(root);
    }));
  };
  tick(0);
}
