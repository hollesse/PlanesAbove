import { expect, test, type Page } from '@playwright/test';

// Fotopanel (ADR 0033 §2): the first photo of the first sample that has one; home server mocked via page.route.
const samples = ['aaaaaa', 'bbbbbb', 'cccccc'].map((icao24, i) => ({ icao24, registration: `D-A${i}`, callsign: null, lastSeenMs: 1 }));
const rows = [{ prefix: 'SPIKE', airline: 'Spike Air', typklasse: 'narrowbody', count: 9, lastSeenMs: 1, samples }];
const photo = { id: 'p1', thumbUrl: 'x', imageUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', photographer: 'Erika Foto', source: 'commons', pageUrl: 'https://commons.example/File:X.jpg', licenceText: 'CC BY-SA 4.0' };
const errorsOf = new WeakMap<object, string[]>();
test.beforeEach(({ page }) => { const errs: string[] = []; errorsOf.set(page, errs); page.on('pageerror', (e) => errs.push(String(e))); });
test.afterEach(({ page }) => { expect(errorsOf.get(page)).toEqual([]); });

async function mock(page: Page, ref: (hex: string, reg: string | null) => Promise<unknown> | unknown) {
  const asked: string[] = [];
  await page.route('**/api/stats/sightings-by-class*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ days: 90, rows }) }));
  await page.route('**/api/photos/reference*', async (route) => {
    const u = new URL(route.request().url());
    const hex = u.searchParams.get('icao24')!;
    asked.push(hex);
    const out = await ref(hex, u.searchParams.get('registration'));
    if (out === 'fail') return route.abort();
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(out) });
  });
  return asked;
}
const pickAirline = async (page: Page) => { await page.goto('/'); await page.getByTestId('sightings-only-gaps').uncheck(); await page.getByTestId('airline-row').first().click(); };

test('no selection: "Keine Sichtung gewählt"', async ({ page }) => {
  await mock(page, () => ({ photos: [], status: 'none' }));
  await page.goto('/');
  await expect(page.getByTestId('photo-panel')).toContainText('Keine Sichtung gewählt');
});

test('first sample none, second ok: shows the second photo with credit and link; the third is prefetched', async ({ page }) => {
  const asked = await mock(page, (hex) => (hex === 'aaaaaa' ? { photos: [], status: 'none' } : { photos: [photo], status: 'ok' }));
  await pickAirline(page);
  await expect(page.getByTestId('photo-img')).toHaveAttribute('src', photo.imageUrl);
  const credit = page.getByTestId('photo-credit');
  await expect(credit).toContainText('Erika Foto');
  await expect(credit).toContainText('commons');
  await expect(credit).toContainText('CC BY-SA 4.0');
  await expect(page.getByTestId('photo-link')).toHaveAttribute('href', photo.pageUrl);
  await expect(page.getByTestId('photo-link')).toHaveAttribute('target', '_blank');
  await expect.poll(() => asked).toEqual(['aaaaaa', 'bbbbbb', 'cccccc']);
});

test('all samples none: "Kein Foto"', async ({ page }) => {
  await mock(page, () => ({ photos: [], status: 'none' }));
  await pickAirline(page);
  await expect(page.getByTestId('photo-panel')).toContainText('Kein Foto');
});

test('all requests fail: "Foto nicht verfügbar"', async ({ page }) => {
  await mock(page, () => 'fail');
  await pickAirline(page);
  await expect(page.getByTestId('photo-panel')).toContainText('Foto nicht verfügbar');
});

test('a combination change during a slow answer shows only the new photo', async ({ page }) => {
  const two = [{ prefix: 'AAA', airline: 'Alpha', typklasse: 'narrowbody', count: 20, lastSeenMs: 1, samples: [{ icao24: 'aaaaaa', registration: 'D-A0' }] },
    { prefix: 'BBB', airline: 'Beta', typklasse: 'narrowbody', count: 10, lastSeenMs: 1, samples: [{ icao24: 'bbbbbb', registration: 'D-A1' }] }];
  await page.route('**/api/stats/sightings-by-class*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ days: 90, rows: two }) }));
  await page.route('**/api/photos/reference*', async (route) => {
    const hex = new URL(route.request().url()).searchParams.get('icao24');
    if (hex === 'aaaaaa') await new Promise((r) => setTimeout(r, 800));
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'ok', photos: [{ ...photo, photographer: hex === 'aaaaaa' ? 'Alt' : 'Neu' }] }) });
  });
  await page.goto('/');
  await page.getByTestId('sightings-only-gaps').uncheck();
  await page.getByTestId('airline-row').nth(0).click();
  await page.getByTestId('airline-row').nth(1).click();
  await expect(page.getByTestId('photo-credit')).toContainText('Neu');
  await page.waitForTimeout(1000);
  await expect(page.getByTestId('photo-credit')).toContainText('Neu');
  await expect(page.getByTestId('photo-credit')).not.toContainText('Alt');
});

test('gallery: 3 registrations, one without photo: "1 / 2"; next shows the second registration in the caption, prev goes back', async ({ page }) => {
  await mock(page, (hex) => (hex === 'bbbbbb' ? { photos: [], status: 'none' } : { photos: [{ ...photo, photographer: `Foto ${hex}`, date: '2021-06-15T00:00:00.000Z' }], status: 'ok' }));
  await pickAirline(page);
  await expect(page.getByTestId('photo-pos')).toHaveText('1 / 2');
  await expect(page.getByTestId('photo-credit')).toContainText('D-A0');
  await expect(page.getByTestId('photo-credit')).toContainText('2021-06-15');
  await page.getByTestId('photo-next').click();
  await expect(page.getByTestId('photo-pos')).toHaveText('2 / 2');
  await expect(page.getByTestId('photo-credit')).toContainText('D-A2');
  await expect(page.getByTestId('photo-credit')).toContainText('Foto cccccc');
  await expect(page.getByTestId('photo-next')).toBeDisabled();
  await page.getByTestId('photo-prev').click();
  await expect(page.getByTestId('photo-pos')).toHaveText('1 / 2');
  await expect(page.getByTestId('photo-credit')).toContainText('D-A0');
});

test('gallery: requests are sequential, at most the current and the next photo are loaded ahead', async ({ page }) => {
  const many = Array.from({ length: 6 }, (_, i) => ({ icao24: `a0000${i}`, registration: `D-B${i}`, callsign: null, lastSeenMs: 1 }));
  await page.route('**/api/stats/sightings-by-class*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ days: 90, rows: [{ ...rows[0], samples: many }] }) }));
  let inFlight = 0; let maxInFlight = 0; const asked: string[] = [];
  await page.route('**/api/photos/reference*', async (route) => {
    asked.push(new URL(route.request().url()).searchParams.get('icao24')!);
    inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 150));
    inFlight--;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ photos: [photo], status: 'ok' }) });
  });
  await pickAirline(page);
  await expect(page.getByTestId('photo-pos')).toHaveText('1 / 2+');
  await page.waitForTimeout(600);
  expect(asked).toHaveLength(2); // current + next, not all 6
  expect(maxInFlight).toBe(1);
  await page.getByTestId('photo-next').click();
  await expect(page.getByTestId('photo-pos')).toHaveText('2 / 3+');
  expect(maxInFlight).toBe(1);
});
