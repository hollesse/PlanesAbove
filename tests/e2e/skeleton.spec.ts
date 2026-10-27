// E2E against the real service in mock mode (ADR 0003/0004): scenario files drive fake sources, the clock is advanced by the test.
import { expect, test } from '@playwright/test';
import { startMockService, type MockService } from './support/service';

let svc: MockService;
test.afterEach(async () => { await svc?.stop(); });

const app = (page: import('@playwright/test').Page) => page.locator('#app');

test('leerer Himmel: Szene ohne Flugzeug, Dienst gesund', async ({ page }) => {
  svc = await startMockService('empty-sky');
  await page.goto(svc.url);
  await expect(app(page)).toHaveAttribute('data-state', 'empty');
  await expect(page.locator('.pa-plane')).toHaveCount(0);
  await expect(page.locator('.pa-scene-header')).toContainText('Der Himmel über Testdorf');
  expect((await fetch(svc.url + '/healthz')).status).toBe(200);
});

test('ein Flugzeug: Silhouette in Standard-Lackierung, Callsign, Typ und Hoehe in der Info-Leiste, eine Sichtung', async ({ page }) => {
  svc = await startMockService('one-plane');
  await page.goto(svc.url);
  await expect(app(page)).toHaveAttribute('data-state', 'one');
  await expect(page.locator('.pa-plane')).toHaveAttribute('data-plane-type', 'narrowbody');
  await expect(page.locator('.pa-plane')).toHaveAttribute('data-livery', 'def');
  const bar = page.locator('.pa-bar-single');
  await expect(bar).toContainText('Lufthansa · DLH400 · Airbus A320neo');
  await expect(bar).toContainText('10 973 m hoch');
  await expect(bar).toContainText('Frankfurt → New York');
  for (let i = 0; i < 3; i++) await svc.advance(30); // wiederholte Takte aendern die Anzahl der Sichtungen nicht
  expect(await svc.sightings()).toHaveLength(1);
});

test('zwei Flugzeuge: die zwei naechsten werden gewaehlt (3 im Umkreis)', async ({ page }) => {
  svc = await startMockService('two-planes');
  await page.goto(svc.url);
  await expect(app(page)).toHaveAttribute('data-state', 'two');
  await expect(app(page)).toHaveAttribute('data-planes', 'near00,mid000');
  await expect(page.locator('.pa-info-row')).toHaveCount(2);
  expect(await svc.sightings()).toHaveLength(3);
});

test('Wechsel waehrend des Vorlesens wird zurueckgehalten, danach erscheint die neuere Auswahl', async ({ page }) => {
  svc = await startMockService('switch-during-narration');
  await page.goto(svc.url);
  await expect(app(page)).toHaveAttribute('data-planes', 'aaaaaa');
  await page.locator('.pa-bar-single').click(); // Tippen auf den Text spricht die Zeile
  await expect(app(page)).toHaveAttribute('data-speaking', 'true');
  await svc.advance(30); // der naechste Takt liefert ein anderes Flugzeug
  await page.waitForTimeout(800); // mehrere Client-Polls (200 ms) waehrend die Ausgabe laeuft
  await expect(app(page)).toHaveAttribute('data-planes', 'aaaaaa');
  await expect(app(page)).toHaveAttribute('data-speaking', 'false', { timeout: 15_000 }); // Wiedergabe-Ende oder Watchdog
  await expect(app(page)).toHaveAttribute('data-planes', 'bbbbbb');
});

test('Ausfall der Quelle: letzte Szene bleibt mit Stale-Markierung, dann Erholung von selbst', async ({ page }) => {
  svc = await startMockService('outage-recovery');
  await page.goto(svc.url);
  await expect(app(page)).toHaveAttribute('data-planes', 'aaaaaa');
  await expect(app(page)).toHaveAttribute('data-stale', 'false');
  await svc.advance(30); // 429 von der Quelle
  await expect(app(page)).toHaveAttribute('data-stale', 'true');
  await expect(app(page)).toHaveAttribute('data-planes', 'aaaaaa');
  await expect(page.locator('.pa-stale-notice')).toContainText('Keine aktuellen Daten');
  await svc.advance(30); // Quelle zurueck
  await expect(app(page)).toHaveAttribute('data-stale', 'false');
  await expect(app(page)).toHaveAttribute('data-planes', 'bbbbbb');
});
