import { expect, test } from '@playwright/test';

// design-system-pyheh: equal slots in the draft stories, at 4:3 and 5:3, inside the sky above the info bar.
interface Entry { id: string; title: string; type: string; name?: string }
const box = (l: ReturnType<import('@playwright/test').Page['locator']>) => l.evaluate((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width }; });

for (const aspect of ['4:3', '5:3']) {
  for (const layout of ['nebeneinander', 'versetzt']) {
    test(`two equal slots + badges sit in the sky above the bar (${aspect}, ${layout})`, async ({ page, request, baseURL }) => {
      const index = (await (await request.get(`${baseURL}/index.json`)).json()) as { entries: Record<string, Entry> };
      const s = Object.values(index.entries).find((e) => e.title === 'Templates/Entwurf: Zwei Flugzeuge gleich groß' && e.type === 'story')!;
      await page.goto(`/iframe.html?id=${s.id}&viewMode=story&args=aspect:${aspect};layout:${layout}`);
      await page.waitForSelector('.pa-screen');
      const stage = await box(page.locator('.pa-screen'));
      const bar = await box(page.locator('.pa-bar-double'));
      const one = await box(page.locator('.pa-slot-eq-one'));
      const two = await box(page.locator('.pa-slot-eq-two'));
      expect(Math.abs(one.w - two.w)).toBeLessThanOrEqual(1);
      for (const sel of ['.pa-slot-eq-one', '.pa-slot-eq-two', '.pa-badge-slot-eq-one', '.pa-badge-slot-eq-two']) {
        const b = await box(page.locator(sel));
        expect(b.l, sel).toBeGreaterThanOrEqual(stage.l);
        expect(b.r, sel).toBeLessThanOrEqual(stage.r);
        expect(b.t, sel).toBeGreaterThanOrEqual(stage.t);
        expect(b.b, sel).toBeLessThanOrEqual(bar.t);
      }
      expect(one.r).toBeLessThanOrEqual(two.l);
    });
  }
}

test('the equal-slot transitions are playable stories', async ({ page, request, baseURL }) => {
  const index = (await (await request.get(`${baseURL}/index.json`)).json()) as { entries: Record<string, Entry> };
  const titles = Object.values(index.entries).filter((e) => e.title === 'Pages/Entwurf: Übergänge gleich groß');
  expect(titles).toHaveLength(3);
  await page.goto(`/iframe.html?id=${titles[0].id}&viewMode=story`);
  await expect(page.locator('.pa-play').first()).toBeVisible();
  await expect(page.locator('.pa-slot-one, .pa-slot-two')).toHaveCount(0);
});

// design-system-q7mxe: Groessenfaktor je Typklasse, gemessen an der sichtbaren (gezeichneten) Breite der Silhouette.
const TYPES: Record<string, number> = { 'double-decker': 1.3, 'jumbo-hump': 1.25, widebody: 1.2, narrowbody: 1, 'regional-jet': 0.85, turboprop: 0.8, helicopter: 0.75, 'business-jet': 0.65, 'light-aircraft': 0.5, glider: 0.5 };
type Page = import('@playwright/test').Page;
const open = async (page: Page, request: import('@playwright/test').APIRequestContext, baseURL: string | undefined, name: string, args: string) => {
  const index = (await (await request.get(`${baseURL}/index.json`)).json()) as { entries: Record<string, Entry> };
  const s = Object.values(index.entries).find((e) => e.title === 'Templates/Entwurf: Zwei Flugzeuge gleich groß' && e.type === 'story' && e.name === name)!;
  await page.goto(`/iframe.html?id=${s.id}&viewMode=story&args=${args}`);
  await page.waitForSelector('.pa-screen .pa-plane svg');
};
/** Visible width and box of the silhouette in a slot: svg bbox (drawn area) scaled to screen pixels, and the plane element's own box. */
const measure = (page: Page, sel: string) => page.locator(sel).evaluate((slot) => {
  const svg = slot.querySelector('svg')!;
  const bb = svg.getBBox();
  const vb = svg.viewBox.baseVal;
  const r = svg.getBoundingClientRect();
  const k = r.width / vb.width;
  const stage = slot.closest('.pa-screen')!.getBoundingClientRect();
  const bar = document.querySelector('.pa-bar')!.getBoundingClientRect();
  const left = r.left + (bb.x - vb.x) * k, top = r.top + (bb.y - vb.y) * k;
  return { vis: bb.width * k, w: r.width, h: r.height, l: left, r: left + bb.width * k, t: top, b: top + bb.height * k, stageW: stage.width, stageL: stage.left, stageR: stage.right, stageT: stage.top, barT: bar.top };
});

for (const aspect of ['4:3', '5:3']) {
  test(`same class = same size in both slots; class ratios hold; nothing clipped (${aspect}, versetzt)`, async ({ page, request, baseURL }) => {
    const m: Record<string, number> = {};
    for (const [t, f] of Object.entries(TYPES)) {
      await open(page, request, baseURL, 'Leicht versetzt', `aspect:${aspect};typeOne:${t};typeTwo:${t}`);
      const one = await measure(page, '.pa-slot-eq-one');
      const two = await measure(page, '.pa-slot-eq-two');
      expect(Math.abs(one.w - two.w), t).toBeLessThanOrEqual(1);
      expect(Math.abs(one.h - two.h), t).toBeLessThanOrEqual(1);
      expect(Math.abs(one.vis - two.vis), t).toBeLessThanOrEqual(1);
      m[t] = one.vis;
      const slotW = (await page.locator('.pa-slot-eq-one').boundingBox())!.width;
      if (t === 'narrowbody') expect(Math.abs(one.vis / slotW - 0.65)).toBeLessThanOrEqual(0.03);
      for (const b of [one, two]) { // not clipped: inside the stage horizontally, inside the sky above the bar
        expect(b.l, t).toBeGreaterThanOrEqual(b.stageL);
        expect(b.r, t).toBeLessThanOrEqual(b.stageR);
        expect(b.t, t).toBeGreaterThanOrEqual(b.stageT);
        expect(b.b, t).toBeLessThanOrEqual(b.barT);
      }
      expect(one.r, t).toBeLessThanOrEqual(two.l);
      expect(two.t, 'front plane (slot two, nose side) sits lower').toBeGreaterThan(one.t);
      expect(two.b).toBeGreaterThan(one.b);
      void f;
    }
    for (const [t, f] of Object.entries(TYPES)) expect(Math.abs(m[t] / m.narrowbody - f), t).toBeLessThanOrEqual(0.03);
  });

  test(`single plane keeps the class ratio (${aspect})`, async ({ page, request, baseURL }) => {
    const vis: Record<string, number> = {};
    for (const t of ['narrowbody', 'glider', 'double-decker']) {
      await open(page, request, baseURL, 'Einzelflug (Größenfaktor)', `aspect:${aspect};typeOne:${t}`);
      const b = await measure(page, '.pa-slot-eq-single');
      vis[t] = b.vis;
      expect(b.l).toBeGreaterThanOrEqual(b.stageL);
      expect(b.r).toBeLessThanOrEqual(b.stageR);
      expect(b.b).toBeLessThanOrEqual(b.barT);
    }
    expect(Math.abs(vis.glider / vis.narrowbody - 0.5)).toBeLessThanOrEqual(0.03);
    expect(Math.abs(vis['double-decker'] / vis.narrowbody - 1.3)).toBeLessThanOrEqual(0.03);
  });
}
