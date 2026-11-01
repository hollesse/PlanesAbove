import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { EDITOR_OUT } from '../../playwright.config';

test.describe.configure({ mode: 'serial' });
test.beforeEach(() => fs.rmSync(EDITOR_OUT, { recursive: true, force: true }));

async function setup(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.locator('svg[data-livery-render] .lv-body')).toBeVisible();
  const overlay = page.getByTestId('overlay');
  const box = (await overlay.boundingBox())!;
  const [vx, vy, vw, vh] = (await overlay.getAttribute('viewBox'))!.split(' ').map(Number);
  return ([x, y]: number[]) => [box.x + ((x - vx) / vw) * box.width, box.y + ((y - vy) / vh) * box.height] as const;
}
async function drawTriangle(page: import('@playwright/test').Page, at: (p: number[]) => readonly [number, number]) {
  const pts = [[300, 200], [500, 200], [400, 300]];
  for (const p of pts) await page.mouse.click(...at(p));
  await page.mouse.click(...at(pts[0]));
}

test('deselect via panel click and Escape; board click still starts a draft; Escape with draft keeps selection', async ({ page }) => {
  const at = await setup(page);
  await drawTriangle(page, at);
  const row = page.getByTestId('layer-row-0');
  await expect(row).toHaveClass(/selected/);
  await expect(page.getByTestId('selection-outline')).toHaveCount(1);

  await row.getByTestId('layer-select').click();
  await expect(row).not.toHaveClass(/selected/);
  await expect(page.getByTestId('selection-outline')).toHaveCount(0);
  await expect(page.locator('[data-testid^="vertex-handle-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="curve-handle-"]')).toHaveCount(0);
  await row.getByTestId('layer-select').click();
  await expect(row).toHaveClass(/selected/);

  await page.keyboard.press('Escape');
  await expect(row).not.toHaveClass(/selected/);
  await expect(page.getByTestId('selection-outline')).toHaveCount(0);

  // no selection: board click sets the first draft point, closing selects the new layer
  const pts = [[350, 180], [550, 180], [450, 280]];
  await page.mouse.click(...at(pts[0]));
  await expect(page.locator('svg.overlay circle[r="5"]')).toHaveCount(1);
  await page.mouse.click(...at(pts[1]));
  await page.mouse.click(...at(pts[2]));
  await page.mouse.click(...at(pts[0]));
  await expect(page.getByTestId('layer-row-1')).toHaveClass(/selected/);

  // Escape with a draft discards only the draft
  await page.mouse.click(...at([320, 160]));
  await expect(page.locator('svg.overlay circle[r="5"]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('svg.overlay circle[r="5"]')).toHaveCount(0);
  await expect(page.getByTestId('layer-row-1')).toHaveClass(/selected/);
});

test('holding Space hides the overlay and ignores board clicks; release restores it', async ({ page }) => {
  const at = await setup(page);
  await drawTriangle(page, at);
  const overlay = page.getByTestId('overlay');
  await expect(page.getByTestId('selection-outline')).toBeVisible();
  await page.keyboard.down('Space');
  await expect(overlay).toHaveCSS('visibility', 'hidden');
  await page.mouse.click(...at([320, 160]));
  await page.keyboard.up('Space');
  await expect(overlay).toHaveCSS('visibility', 'visible');
  await expect(page.locator('svg.overlay circle[r="5"]')).toHaveCount(0);
  await expect(page.getByTestId('layer-row-0')).toHaveClass(/selected/);
  await expect(page.getByTestId('selection-outline')).toBeVisible();
});

test('Space in a text field types a space and triggers no preview', async ({ page }) => {
  await setup(page);
  const id = page.getByTestId('livery-id');
  await id.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#board')).not.toHaveClass(/preview/);
  expect(await id.inputValue()).toContain(' ');
});
