// sky-scene-xw8jv: Nummern-Plakette tippen oeffnet das Foto-Overlay (gemockte Foto-API ueber das `photos`-Feld des Szenarios).
import { expect, test } from '@playwright/test';
import { startMockService, type MockService } from './support/service';

let svc: MockService;
test.afterEach(async () => { await svc?.stop(); });

// A real finger hits whatever is on top; the client resolves the tap by geometry, so tap the badge's centre point.
const tapAt = async (page: import('@playwright/test').Page, selector: string) => {
  let b = null as { x: number; y: number; width: number; height: number } | null;
  await expect.poll(async () => (b = await page.locator(selector).boundingBox())).not.toBeNull(); // the scene may re-render between lookups
  await page.mouse.click(b!.x + b!.width / 2, b!.y + b!.height / 2);
};
const app = (page: import('@playwright/test').Page) => page.locator('#app');

test('zwei Flugzeuge: Plakette 2 tippen -> Galerie blaettern -> Foto-Seite -> X; kein Vorlesen', async ({ page }) => {
  svc = await startMockService('photo-planes');
  await page.goto(svc.url);
  await expect(app(page)).toHaveAttribute('data-planes', 'aaaaaa,bbbbbb');
  await tapAt(page, '.pa-badge-slot[data-badge="2"]');
  const overlay = page.locator('.pa-photo-overlay');
  await expect(overlay).toHaveAttribute('data-state', 'gallery');
  await expect(page.locator('.pa-photo-caption')).toContainText('EI-DCL');
  await expect(page.locator('.pa-photo-link')).toHaveText('mock.example/foto/1');
  await page.locator('.pa-photo-arrow-next').click();
  await expect(page.locator('.pa-photo-link')).toHaveText('mock.example/foto/2');
  await expect(page.locator('.pa-photo-qr')).toBeVisible();
  await expect(app(page)).toHaveAttribute('data-speaking', 'false');
  await page.locator('.pa-photo-close').click();
  await expect(overlay).toHaveCount(0);
  await expect(app(page)).toHaveAttribute('data-speaking', 'false');
  await tapAt(page, '.pa-info-row >> nth=0'); // Szene wieder bedienbar: Text liest vor
  await expect(app(page)).toHaveAttribute('data-speaking', 'true');
});

test('Plakette in der Info-Zeile tippen oeffnet ebenfalls; Flugzeug ohne Foto zeigt Kein Foto', async ({ page }) => {
  svc = await startMockService('photo-planes');
  await page.goto(svc.url);
  await expect(app(page)).toHaveAttribute('data-planes', 'aaaaaa,bbbbbb');
  await tapAt(page, '.pa-info-row .pa-badge >> nth=0');
  await expect(page.locator('.pa-photo-overlay')).toHaveAttribute('data-state', 'empty');
  await expect(page.locator('.pa-photo-empty')).toContainText('kein Foto');
  await expect(app(page)).toHaveAttribute('data-speaking', 'false');
  await page.locator('.pa-photo-close').click();
  await expect(page.locator('.pa-photo-overlay')).toHaveCount(0);
});

test('Flugzeug verschwindet bei offenem Overlay: Overlay bleibt, X schliesst', async ({ page }) => {
  svc = await startMockService('photo-planes');
  await page.goto(svc.url);
  await expect(app(page)).toHaveAttribute('data-planes', 'aaaaaa,bbbbbb');
  await tapAt(page, '.pa-badge-slot[data-badge="2"]');
  await expect(page.locator('.pa-photo-overlay')).toHaveAttribute('data-state', 'gallery');
  await svc.advance(30); // bbbbbb verlaesst die Szene
  await expect(app(page)).toHaveAttribute('data-planes', 'aaaaaa', { timeout: 10_000 });
  await page.waitForTimeout(1500); // Uebergang und mehrere Polls
  await expect(page.locator('.pa-photo-overlay')).toHaveAttribute('data-state', 'gallery');
  await page.locator('.pa-photo-close').click();
  await expect(page.locator('.pa-photo-overlay')).toHaveCount(0);
});
