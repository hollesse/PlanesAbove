import { expect, test } from '@playwright/test';

// Airline palette: colours already used by the airline's saved liveries (all Typklassen) plus the open draft.
// The `spike` fixture airline has saved files on several Typklassen, all using #d6001c.
const errorsOf = new WeakMap<object, string[]>();
test.beforeEach(({ page }) => { const errs: string[] = []; errorsOf.set(page, errs); page.on('pageerror', (e) => errs.push(String(e))); });
test.afterEach(({ page }) => { expect(errorsOf.get(page)).toEqual([]); });

async function drawQuad(page: import('@playwright/test').Page) {
  const box = (await page.getByTestId('overlay').boundingBox())!;
  const [vx, vy, vw, vh] = (await page.getByTestId('overlay').getAttribute('viewBox'))!.split(' ').map(Number);
  const at = ([x, y]: number[]) => [box.x + ((x - vx) / vw) * box.width, box.y + ((y - vy) / vh) * box.height] as const;
  const pts = [[300, 150], [700, 150], [700, 300], [300, 300]];
  for (const p of pts) await page.mouse.click(...at(p));
  await page.mouse.click(...at(pts[0]));
}

test('shows the airline colours from saved files of other Typklassen, and a hint for an unknown airline', async ({ page }) => {
  await page.goto('/');
  // the open draft (spike/narrowbody) is blank; the colour comes from the other saved spike Typklassen
  await expect(page.getByTestId('palette-swatch')).toHaveCount(1);
  await expect(page.getByTestId('palette-swatch')).toHaveAttribute('data-color', '#d6001c');
  await expect(page.getByTestId('palette-swatch')).toHaveAttribute('aria-label', '#d6001c');
  await expect(page.getByTestId('palette-empty')).toHaveCount(0);
  await page.getByTestId('livery-id').fill('brand-new-airline');
  await expect(page.getByTestId('palette-swatch')).toHaveCount(0);
  await expect(page.getByTestId('palette-empty')).toBeVisible();
  await page.getByTestId('livery-id').fill('spike');
  await expect(page.getByTestId('palette-swatch')).toHaveCount(1);
});

test('a click on a swatch recolours the selected path layer', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('path-color').fill('#123456');
  await drawQuad(page); // closing selects the new layer
  await expect(page.getByTestId('layer-color-0')).toHaveValue('#123456');
  await page.locator('[data-testid="palette-swatch"][data-color="#d6001c"]').click();
  await expect(page.getByTestId('layer-color-0')).toHaveValue('#d6001c');
  await expect(page.locator('svg[data-livery-render] [fill="#d6001c"]').first()).toBeAttached();
  await expect(page.locator('svg[data-livery-render] [fill="#123456"]')).toHaveCount(0);
});

test('without a selection a click sets the draw colour of the next path', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="palette-swatch"][data-color="#d6001c"]').click();
  await expect(page.getByTestId('path-color')).toHaveValue('#d6001c');
  await drawQuad(page);
  await expect(page.getByTestId('layer-color-0')).toHaveValue('#d6001c');
});

test('a colour newly used in the draft shows up without saving', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="palette-swatch"][data-color="#123456"]')).toHaveCount(0);
  await page.getByTestId('path-color').fill('#123456');
  await drawQuad(page);
  await expect(page.locator('[data-testid="palette-swatch"][data-color="#123456"]')).toHaveCount(1);
  await page.getByTestId('layer-color-0').fill('#654321');
  await expect(page.locator('[data-testid="palette-swatch"][data-color="#654321"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="palette-swatch"][data-color="#123456"]')).toHaveCount(0);
});
