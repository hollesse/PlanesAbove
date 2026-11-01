import { expect, test } from '@playwright/test';

// ADR 0033 §3: seen Airline x Typklasse list in the editor, mocked home server (contract of GET /api/stats/sightings-by-class).
const rows = [
  { prefix: 'SPIKE', airline: 'Spike Air', typklasse: 'narrowbody', count: 40, lastSeenMs: 1, samples: [] },
  { prefix: 'DLH', airline: 'Lufthansa', typklasse: 'narrowbody', count: 25, lastSeenMs: 1, samples: [] },
  { prefix: 'ZZZ', airline: null, typklasse: 'regional', count: 30, lastSeenMs: 1, samples: [] },
];
const body = (days: number) => JSON.stringify({ days, standort: { lat: 0, lon: 0 }, rows });

test('list from a mocked home server: gaps only, click sets livery id and Typklasse, days changes the query', async ({ page }) => {
  const urls: string[] = [];
  await page.route('**/api/stats/sightings-by-class*', (route) => {
    const u = new URL(route.request().url());
    urls.push(u.search);
    return route.fulfill({ contentType: 'application/json', body: body(Number(u.searchParams.get('days'))) });
  });
  await page.goto('/');
  const rowsLoc = page.getByTestId('sighting-row');
  await expect(rowsLoc).toHaveCount(2);
  await expect(rowsLoc.nth(0)).toContainText('Airline fehlt im Katalog'); // 30 before 25
  await expect(rowsLoc.nth(1)).toContainText('Lufthansa');
  await expect(rowsLoc.nth(0)).toContainText('Lücke');
  expect(urls[0]).toBe('?days=90');
  await page.getByTestId('sightings-only-gaps').uncheck();
  await expect(rowsLoc).toHaveCount(3);
  await expect(rowsLoc.first()).toContainText('Spike Air');
  await page.getByTestId('sightings-only-gaps').check();
  await rowsLoc.nth(1).click();
  await expect(page.getByTestId('livery-id')).toHaveValue('dlh');
  await expect(page.getByTestId('typklasse')).toHaveValue('narrowbody');
  await expect(page.getByTestId('layer-list').locator('.layer-row')).toHaveCount(0);
  await page.getByTestId('sightings-days').fill('30');
  await expect.poll(() => urls[urls.length - 1]).toBe('?days=30');
});

test('click on a combination with an existing file loads its layers into the board', async ({ page }) => {
  await page.route('**/api/stats/sightings-by-class*', (route) => route.fulfill({ contentType: 'application/json', body: body(90) }));
  await page.goto('/');
  await page.getByTestId('sightings-only-gaps').uncheck();
  await page.getByTestId('sighting-row').filter({ hasText: 'Spike Air' }).click();
  await expect(page.getByTestId('livery-id')).toHaveValue('spike');
  await expect(page.getByTestId('layer-list').locator('.layer-row')).toHaveCount(1);
  await expect(page.locator('svg[data-livery-render] path[fill="#d6001c"]')).toHaveCount(1);
});

test('without a home server: hint shown, text field and select still work', async ({ page }) => {
  await page.route('**/api/stats/sightings-by-class*', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByTestId('sightings-unreachable')).toHaveText('Heimserver nicht erreichbar');
  await page.getByTestId('livery-id').fill('abc');
  await page.getByTestId('typklasse').selectOption('narrowbody');
  await expect(page.getByTestId('livery-id')).toHaveValue('abc');
});

test('unmocked (no proxy configured): the fetch fails gracefully', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('sightings-unreachable')).toHaveText('Heimserver nicht erreichbar');
});
