// sky-scene-h8c2v: the app shows two planes in equally wide slots, staggered in flight direction (vorn = Nasenseite tiefer),
// and both slots plus badges stay in the sky above the info bar - at 4:3, between, and 5:3.
import { expect, test } from '@playwright/test';
import { startMockService, type MockService } from './support/service';

let svc: MockService;
test.afterEach(async () => { await svc?.stop(); });

for (const [name, width, height] of [['4:3 (1112x834)', 1112, 834], ['iPad 10 (1180x820)', 1180, 820], ['5:3 (1000x600)', 1000, 600]] as const) {
  test(`Zwei Flugzeuge: gleich breite Slots, gestaffelt, im Himmel ueber der Info-Leiste: ${name}`, async ({ page }) => {
    svc = await startMockService('two-planes');
    await page.setViewportSize({ width, height });
    await page.goto(svc.url);
    await expect(page.locator('.pa-slot-eq-two')).toBeVisible();
    const m = await page.evaluate(() => {
      const b = (q: string) => { const r = document.querySelector(q)!.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width }; };
      return { stage: b('.pa-screen'), bar: b('.pa-bar-double'), one: b('.pa-slot-eq-one'), two: b('.pa-slot-eq-two'), b1: b('.pa-badge-slot-eq-one'), b2: b('.pa-badge-slot-eq-two'), old: document.querySelectorAll('.pa-slot-one, .pa-slot-two').length };
    });
    expect(m.old).toBe(0);
    expect(Math.abs(m.one.width - m.two.width)).toBeLessThanOrEqual(1);
    expect(m.two.top).toBeGreaterThan(m.one.top); // vorn (rechts, Nasenseite) liegt tiefer
    for (const r of [m.one, m.two, m.b1, m.b2]) {
      expect(r.left).toBeGreaterThanOrEqual(m.stage.left - 1);
      expect(r.right).toBeLessThanOrEqual(m.stage.right + 1);
      expect(r.top).toBeGreaterThanOrEqual(m.stage.top - 1);
      expect(r.bottom).toBeLessThanOrEqual(m.bar.top + 1);
    }
  });
}
