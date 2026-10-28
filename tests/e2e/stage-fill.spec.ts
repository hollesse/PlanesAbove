// Guards the target layout of the 4:3 stage (design-system-h7w2q). Standalone/black-translucent cannot be emulated; the device check is by eye.
import { expect, test } from '@playwright/test';
import { startMockService, type MockService } from './support/service';

let svc: MockService;
test.afterEach(async () => { await svc?.stop(); });

// The app re-renders the scene on each poll, so measure inside the page in one synchronous step (no detached-element races).
const box = (page: import('@playwright/test').Page, sel: string) => page.evaluate((q) => { const r = document.querySelector(q)!.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }, sel);

test('iPad Pro 10,5" quer (1112x834): Buehne fuellt den Bildschirm ab (0,0), Kopfzeile unter der Statusleiste', async ({ page }) => {
  svc = await startMockService('empty-sky');
  await page.setViewportSize({ width: 1112, height: 834 });
  await page.goto(svc.url);
  await expect(page.locator('.pa-screen')).toBeVisible();
  await expect(page.locator('.pa-scene-header')).toBeVisible();
  const s = await box(page, '.pa-screen');
  expect(Math.abs(s.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(s.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(s.width - 1112)).toBeLessThanOrEqual(1);
  expect(Math.abs(s.height - 834)).toBeLessThanOrEqual(1);
  const h = await box(page, '.pa-scene-header');
  expect(h.y).toBeGreaterThanOrEqual(20);
});

test('Nicht-4:3 (1180x820): Buehne bleibt 4:3 und zentriert (Letterboxing)', async ({ page }) => {
  svc = await startMockService('empty-sky');
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto(svc.url);
  await expect(page.locator('.pa-screen')).toBeVisible();
  await expect(page.locator('.pa-scene-header')).toBeVisible();
  const s = await box(page, '.pa-screen');
  expect(Math.abs(s.width / s.height - 4 / 3)).toBeLessThan(0.01);
  expect(Math.abs(s.height - 820)).toBeLessThanOrEqual(1);
  expect(Math.abs(s.x + s.width / 2 - 1180 / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(s.y + s.height / 2 - 820 / 2)).toBeLessThanOrEqual(1);
});
