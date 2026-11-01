import { expect, test } from '@playwright/test';

// ADR 0033 §3: two-step selection (airline, then Typklasse) from a mocked home server (contract of GET /api/stats/sightings-by-class).
const rows = [
  { prefix: 'SPIKE', airline: 'Spike Air', typklasse: 'narrowbody', count: 9, lastSeenMs: 1, samples: [] },
  { prefix: 'SPIKE', airline: 'Spike Air', typklasse: 'regional', count: 31, lastSeenMs: 1, samples: [] },
  { prefix: 'DLH', airline: 'Lufthansa', typklasse: 'narrowbody', count: 25, lastSeenMs: 1, samples: [] },
  { prefix: 'ZZZ', airline: null, typklasse: 'regional', count: 20, lastSeenMs: 1, samples: [] },
];
// every test fails on unhandled page errors
const errorsOf = new WeakMap<object, string[]>();
test.beforeEach(({ page }) => { const errs: string[] = []; errorsOf.set(page, errs); page.on('pageerror', (e) => errs.push(String(e))); });
test.afterEach(({ page }) => { expect(errorsOf.get(page)).toEqual([]); });
const body = (days: number) => JSON.stringify({ days, standort: { lat: 0, lon: 0 }, rows });

test('airline list: totals and gap status, click selects, select shows counts, seen type without silhouette is disabled and never preselected, most-seen drawable type is preselected and its file loaded, days changes the query', async ({ page }) => {
  const urls: string[] = [];
  await page.route('**/api/stats/sightings-by-class*', (route) => {
    const u = new URL(route.request().url());
    urls.push(u.search);
    return route.fulfill({ contentType: 'application/json', body: body(Number(u.searchParams.get('days'))) });
  });
  await page.goto('/');
  const airlines = page.getByTestId('airline-row');
  await expect(airlines).toHaveCount(3);
  await expect(airlines.nth(0)).toContainText('Spike Air');
  await expect(airlines.nth(0)).toContainText('40×');
  await expect(airlines.nth(0)).toContainText('1 von 2 Typen fehlen');
  await expect(airlines.nth(1)).toContainText('Lufthansa');
  await expect(airlines.nth(2)).toContainText('Airline fehlt im Katalog');
  expect(urls[0]).toBe('?days=90');
  await airlines.nth(0).click();
  await expect(page.getByTestId('livery-id')).toHaveValue('spike');
  await expect(airlines.nth(0)).toHaveClass(/selected/);
  const sel = page.getByTestId('typklasse');
  await expect(sel.locator('option').nth(0)).toHaveText('regional · 31 Sichtungen · fehlt · keine Silhouette');
  await expect(sel.locator('option').nth(0)).toHaveAttribute('disabled', '');
  await expect(sel.locator('option').nth(0)).toHaveText(/ · keine Silhouette$/);
  await expect(sel.locator('option').nth(1)).toHaveText('narrowbody · 9 Sichtungen · vorhanden');
  // the missing type has no silhouette here, so the most-seen drawable type is preselected and its file loaded
  await expect(sel).toHaveValue('narrowbody');
  await expect(page.getByTestId('layer-list').locator('.layer-row')).toHaveCount(1);
  await expect(page.locator('svg[data-livery-render] path[fill="#d6001c"]')).toHaveCount(1);
  await page.getByTestId('sightings-days').fill('30');
  await expect.poll(() => urls[urls.length - 1]).toBe('?days=30');
});

test('only gaps hides an airline whose seen types all have a file', async ({ page }) => {
  await page.route('**/api/stats/sightings-by-class*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ days: 90, rows: [rows[0]] }) }));
  await page.goto('/');
  await expect(page.getByText('Keine Lücken in den Sichtungen.')).toBeVisible();
  await expect(page.getByTestId('airline-row')).toHaveCount(0);
  await page.getByTestId('sightings-only-gaps').uncheck();
  await expect(page.getByTestId('airline-row')).toHaveCount(1);
  await expect(page.getByTestId('airline-row')).toContainText('0 von 1 Typen fehlen');
});

test('without a home server: hint shown, plain select, text field and select still work', async ({ page }) => {
  await page.route('**/api/stats/sightings-by-class*', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByTestId('sightings-unreachable')).toHaveText('Heimserver nicht erreichbar');
  await expect(page.getByTestId('typklasse').locator('option').first()).not.toContainText('Sichtungen');
  await page.getByTestId('livery-id').fill('abc');
  await page.getByTestId('typklasse').selectOption('narrowbody');
  await expect(page.getByTestId('livery-id')).toHaveValue('abc');
});

test('unmocked (no proxy configured): the fetch fails gracefully', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('sightings-unreachable')).toHaveText('Heimserver nicht erreichbar');
});
