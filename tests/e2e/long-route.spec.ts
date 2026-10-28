import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// design-system-grp94: the two longest airport labels of tables/airports.json (ADR 0021, "Stadt (IATA)") must stay fully visible
// in the info bar (single and two-plane view, 4:3 and 5:3). The names are read from the table at test time.
const table = JSON.parse(readFileSync('src/server/modules/airspace/tables/airports.json', 'utf8')) as Record<string, { city: string; iata: string }>;
const labels = Object.values(table).map((a) => `${a.city} (${a.iata})`).sort((a, b) => b.length - a.length);
const [first, second] = labels;
const route = `${first} → ${second}`;

interface Measure { aspect: string; text: string; lines: number; fontPx: number; baseCqw: number; inside: boolean; overflowX: boolean; parts: { text: string; inside: boolean }[] }

async function measure(page: Page, id: string): Promise<Measure[]> {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`);
  await page.waitForSelector('.pa-longest-route .pa-route-large');
  await page.waitForSelector('[data-routes-fitted]'); // fit runs after fonts + rAF; a fixed delay raced it in WebKit
  return page.evaluate(() => {
    const inside = (r: DOMRect, b: DOMRect) => r.left >= b.left - 1 && r.right <= b.right + 1 && r.top >= b.top - 1 && r.bottom <= b.bottom + 1;
    return [...document.querySelectorAll<HTMLElement>('.pa-longest-route > [data-aspect]')].flatMap((cell) => {
      const bar = cell.querySelector('.pa-bar')!.getBoundingClientRect();
      return [...cell.querySelectorAll<HTMLElement>('.pa-route-large')].map((el) => {
        const box = (el.closest('.pa-info-row') ?? el.closest('.pa-bar'))!.getBoundingClientRect();
        const lineEls = el.querySelectorAll<HTMLElement>('.pa-route-line');
        const parts = (lineEls.length ? [...lineEls] : [el]).map((p) => {
          const rg = document.createRange();
          rg.selectNodeContents(p);
          return { text: p.textContent ?? '', inside: inside(rg.getBoundingClientRect(), bar) && rg.getBoundingClientRect().right <= el.parentElement!.getBoundingClientRect().right + 1 };
        });
        const rg = document.createRange();
        rg.selectNodeContents(el);
        const cs = getComputedStyle(el);
        return {
          aspect: cell.dataset.aspect!, text: parts.map((p) => p.text).join(' '), lines: lineEls.length || 1, fontPx: parseFloat(cs.fontSize),
          baseCqw: el.closest('.pa-bar-single') ? 5 : 3.3, inside: inside(rg.getBoundingClientRect(), bar) && rg.getBoundingClientRect().bottom <= box.bottom + 1,
          overflowX: el.scrollWidth > el.clientWidth + 1 || el.parentElement!.scrollWidth > el.parentElement!.clientWidth + 1 || document.documentElement.scrollWidth > document.documentElement.clientWidth, parts,
        };
      });
    });
  });
}

test('the two longest airport labels come from the table', () => {
  expect(first.length).toBeGreaterThan(20);
  expect(route).toBe('Santiago de Compostela (SCQ) → Jerez de la Frontera (XRY)'); // when the table grows, update the story text and this line
});

for (const [name, id, planes] of [['single view', 'organisms-info-leiste--laengste-route-einzel', 1], ['two-plane view', 'organisms-info-leiste--laengste-route-zwei', 2]] as const) {
  test(`longest route stays fully inside the info bar: ${name}`, async ({ page }) => {
    const ms = await measure(page, id);
    expect(ms).toHaveLength(2 * planes); // 4:3 and 5:3
    for (const m of ms) {
      const ctx = `${name} ${m.aspect}`;
      expect(m.text.replace(/\s+/g, ' ').trim().toLowerCase(), ctx).toBe(route.toLowerCase());
      expect(m.inside, `${ctx} route inside bar`).toBe(true);
      expect(m.parts.every((p) => p.inside), `${ctx} every part inside`).toBe(true);
      expect(m.overflowX, `${ctx} no horizontal overflow`).toBe(false);
      for (const label of [first, second]) expect(m.text.toLowerCase(), ctx).toContain(label.toLowerCase()); // names never split
      if (planes === 2) expect(m.lines, `${ctx} one line`).toBe(1);
      if (m.lines === 2) expect(m.parts[0].text, ctx).toBe(first);
    }
  });
}

test('single view: the longest route breaks before the arrow at a smaller size', async ({ page }) => {
  const ms = await measure(page, 'organisms-info-leiste--laengste-route-einzel');
  for (const m of ms) {
    expect(m.lines).toBe(2);
    expect(m.parts[1].text.startsWith('→ ')).toBe(true);
  }
});

test('short routes (two-plane sample) keep their normal size and one line', async ({ page }) => {
  await page.goto('/iframe.html?id=organisms-info-leiste--zwei-flugzeuge&viewMode=story');
  await page.waitForSelector('[data-routes-fitted] .pa-route-large');
  const styles = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.pa-route-large')].map((e) => ({ inline: e.style.fontSize, lines: e.querySelectorAll('.pa-route-line').length })));
  for (const s of styles) { expect(s.inline).toBe(''); expect(s.lines).toBe(0); }
});

test('short single route stays on one line', async ({ page }) => {
  await page.goto('/iframe.html?id=organisms-info-leiste--ein-flugzeug-route-bekannt&viewMode=story');
  await page.waitForSelector('[data-routes-fitted] .pa-route-large');
  const r = await page.evaluate(() => { const e = document.querySelector<HTMLElement>('.pa-route-large')!; return { text: e.textContent, lines: e.querySelectorAll('.pa-route-line').length }; });
  expect(r.text).toBe('Frankfurt → New York');
  expect(r.lines).toBe(0);
});
