import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { EDITOR_OUT } from '../../playwright.config';

test.describe.configure({ mode: 'serial' });
test.beforeEach(() => fs.rmSync(EDITOR_OUT, { recursive: true, force: true }));

test('rubber band follows the mouse without a click; Shift constrains the axis and the placed point', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('svg[data-livery-render] .lv-body')).toBeVisible();
  const overlay = page.getByTestId('overlay');
  const box = (await overlay.boundingBox())!;
  const [vx, vy, vw, vh] = (await overlay.getAttribute('viewBox'))!.split(' ').map(Number);
  const at = ([x, y]: number[]) => [box.x + ((x - vx) / vw) * box.width, box.y + ((y - vy) / vh) * box.height] as const;
  await page.mouse.move(...at([300, 200]));
  await expect(page.getByTestId('draft-rubber')).toHaveCount(0);
  await page.mouse.click(...at([300, 200]));
  const rubber = page.getByTestId('draft-rubber');
  await expect(rubber).toHaveCount(1);
  await expect(rubber).toBeHidden();
  await page.mouse.move(...at([400, 230]));
  await expect(rubber).toBeVisible();
  await page.keyboard.down('Shift');
  await page.mouse.move(...at([420, 235]));
  const d = (await rubber.getAttribute('d'))!;
  const nums = d.match(/-?[\d.]+/g)!.map(Number);
  expect(nums[3]).toBe(nums[1]); // horizontal: same y as the last point
  await page.mouse.click(...at([420, 235]));
  await page.keyboard.up('Shift');
  await expect(page.getByTestId('draft-path')).toHaveAttribute('d', /^M\d+ \d+ L\d+ 2\d\d$/);
  const pd = (await page.getByTestId('draft-path').getAttribute('d'))!.match(/-?[\d.]+/g)!.map(Number);
  expect(pd[3]).toBe(pd[1]);
  await page.mouse.move(box.x - 20, box.y - 20);
  await expect(rubber).toBeHidden();
});

test('rubber band runs from the last placed point to the snapped mouse position; hidden while dragging a handle and in preview', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('svg[data-livery-render] .lv-body')).toBeVisible();
  const overlay = page.getByTestId('overlay');
  const box = (await overlay.boundingBox())!;
  const [vx, vy, vw, vh] = (await overlay.getAttribute('viewBox'))!.split(' ').map(Number);
  const at = ([x, y]: number[]) => [box.x + ((x - vx) / vw) * box.width, box.y + ((y - vy) / vh) * box.height] as const;
  const rubber = page.getByTestId('draft-rubber');
  const band = async () => (await rubber.getAttribute('d'))!.match(/-?[\d.]+/g)!.map(Number);
  const near = (a: number[], b: number[]) => a.forEach((v, i) => expect(Math.abs(v - b[i])).toBeLessThanOrEqual(1.5));

  await page.mouse.click(...at([300, 200]));
  await page.mouse.move(...at([400, 260]));
  await expect(rubber).toBeVisible();
  near(await band(), [300, 200, 400, 260]);

  await page.mouse.click(...at([400, 260]));
  await page.mouse.move(...at([470, 300]));
  await expect(rubber).toBeVisible();
  near(await band(), [400, 260, 470, 300]);

  // dragging a draft handle hides the band
  const handle = page.getByTestId('draft-handle-0');
  await expect(handle).toHaveCount(1);
  const hb = (await handle.boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2 + 15, hb.y + hb.height / 2 + 15);
  await expect(rubber).toBeHidden();
  await page.mouse.up();

  // preview mode hides the band
  await page.mouse.move(...at([450, 330]));
  await expect(rubber).toBeVisible();
  await page.keyboard.down('Space');
  await page.mouse.move(...at([460, 340]));
  await expect(rubber).toBeHidden();
  await page.keyboard.up('Space');
});
