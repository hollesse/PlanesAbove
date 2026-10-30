import { expect, test } from '@playwright/test';

// design-system-pyheh: equal slots in the draft stories, at 4:3 and 5:3, inside the sky above the info bar.
interface Entry { id: string; title: string; type: string }
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
