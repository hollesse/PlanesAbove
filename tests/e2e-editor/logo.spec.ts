import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { EDITOR_OUT } from '../../playwright.config';

test.describe.configure({ mode: 'serial' });
test.beforeEach(() => fs.rmSync(EDITOR_OUT, { recursive: true, force: true }));

const STORYBOOK = 'http://127.0.0.1:6007';
const fixture = JSON.parse(fs.readFileSync('src/client/ui/assets/liveries/logo-test/narrowbody.json', 'utf8'));

async function svgShot(page: import('@playwright/test').Page): Promise<string> {
  await page.evaluate(() => document.querySelectorAll('svg.overlay').forEach((o) => ((o as unknown as HTMLElement).style.display = 'none')));
  const svg = page.locator('svg[data-livery-render]');
  await svg.evaluate((el) => { (el as unknown as HTMLElement).style.cssText = 'display:block;width:800px;height:auto;background:#fff'; });
  return (await svg.screenshot()).toString('base64');
}

async function setup(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.locator('svg[data-livery-render] .lv-body')).toBeVisible();
  // 1 screen pixel per board unit: mouse events carry whole pixels, so every gesture lands on exact board coordinates
  await page.addStyleTag({ content: '#board { width: 1000px !important; }' });
  await expect(page.getByTestId('overlay')).toHaveJSProperty('clientWidth', 1000);
  const box = (await page.getByTestId('overlay').boundingBox())!;
  const [vx, vy, vw, vh] = (await page.getByTestId('overlay').getAttribute('viewBox'))!.split(' ').map(Number);
  const at = ([x, y]: number[]) => [Math.round(box.x + ((x - vx) / vw) * box.width), Math.round(box.y + ((y - vy) / vh) * box.height)] as const;
  return at;
}
const drag = async (page: import('@playwright/test').Page, from: readonly [number, number], to: readonly [number, number]) => {
  await page.mouse.move(...from);
  await page.mouse.down();
  await page.mouse.move((from[0] + to[0]) / 2, (from[1] + to[1]) / 2);
  await page.mouse.move(...to);
  await page.mouse.up();
};

test('logo: pick from the list, move, scale by corner, rotate with Shift, save equals the fixture and matches the story', async ({ page }) => {
  const at = await setup(page);
  // the one path of the fixture
  for (const p of fixture.layers[0].points) await page.mouse.click(...at(p));
  await page.getByTestId('path-color').fill(fixture.layers[0].color);
  await page.mouse.click(...at(fixture.layers[0].points[0]));
  await expect(page.getByTestId('layer-list').locator('[data-testid^="layer-row-"]')).toHaveCount(1);

  await page.getByTestId('logo-add-lufthansa').click();
  const rows = page.getByTestId('layer-list').locator('[data-testid^="layer-row-"]');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toHaveClass(/selected/);
  await expect(rows.nth(0).getByTestId('layer-select')).toHaveText('lufthansa');
  await expect(page.getByTestId('layer-color-1')).toBeDisabled();
  await expect(page.locator('svg[data-livery-render] .lv-paint .lv-logo')).toHaveCount(1);
  await expect(page.locator('svg[data-livery-render] .lv-paint .lv-logo')).toHaveAttribute('transform', 'translate(500 221) rotate(0) scale(1.2)');
  await expect(page.getByTestId('logo-frame')).toHaveCount(1);
  await expect(page.getByTestId('logo-rotate')).toHaveCount(1);
  await expect(page.locator('[data-testid^="logo-corner-"]')).toHaveCount(4);

  // move inside the frame: (500,221) -> (560,230); no draft point is added
  await drag(page, at([500, 221]), at([560, 230]));
  await expect(page.locator('svg[data-livery-render] .lv-logo')).toHaveAttribute('transform', 'translate(560 230) rotate(0) scale(1.2)');
  expect(await page.locator('svg.overlay circle[r="5"]').count()).toBe(0);

  // bottom-right corner at (620,290) -> (635,305): scale 1.5 about the fixed centre
  await drag(page, at([620, 290]), at([635, 305]));
  await expect(page.locator('svg[data-livery-render] .lv-logo')).toHaveAttribute('transform', 'translate(560 230) rotate(0) scale(1.5)');

  // rotation handle at (560,125) -> towards (610,143) with Shift: 29.9 degrees snaps to 30
  await page.keyboard.down('Shift');
  await drag(page, at([560, 125]), at([610, 143]));
  await page.keyboard.up('Shift');
  await expect(page.locator('svg[data-livery-render] .lv-logo')).toHaveAttribute('transform', 'translate(560 230) rotate(30) scale(1.5)');

  await page.getByTestId('livery-id').fill('logo-test');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('status')).toContainText('Gespeichert');
  expect(JSON.parse(fs.readFileSync(path.join(EDITOR_OUT, 'logo-test/narrowbody.json'), 'utf8'))).toEqual(fixture);

  // pixel compare with the story
  const board = await svgShot(page);
  const sb = await page.context().newPage();
  await sb.goto(`${STORYBOOK}/iframe.html?id=liveries-pfade--logo-test-narrowbody&viewMode=story`);
  await sb.waitForSelector('svg[data-livery-render]');
  const story = await svgShot(sb);
  const diff = await page.evaluate(async ([a, b]) => {
    const load = (b64: string) => new Promise<ImageData>((res) => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d')!; g.drawImage(i, 0, 0); res(g.getImageData(0, 0, c.width, c.height)); }; i.src = `data:image/png;base64,${b64}`; });
    const [x, y] = [await load(a), await load(b)];
    if (x.width !== y.width || x.height !== y.height) return 1;
    let bad = 0;
    for (let i = 0; i < x.data.length; i += 4) if (Math.abs(x.data[i] - y.data[i]) + Math.abs(x.data[i + 1] - y.data[i + 1]) + Math.abs(x.data[i + 2] - y.data[i + 2]) > 30) bad++;
    return bad / (x.width * x.height);
  }, [board, story]);
  expect(diff).toBeLessThan(0.005) // sub-pixel anti-aliasing between the two page layouts, like draw-and-compare;
});

test('logo layer in the layer panel: rename, reorder, hide, delete; Space preview hides the frame', async ({ page }) => {
  await setup(page);
  await page.getByTestId('logo-add-lufthansa').click();
  await page.getByTestId('logo-add-easyjet').click();
  const rows = page.getByTestId('layer-list').locator('[data-testid^="layer-row-"]');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).getByTestId('layer-select')).toHaveText('easyjet');

  await page.getByTestId('layer-row-1').hover();
  await page.getByTestId('layer-rename-1').click();
  await page.getByTestId('layer-name-input-1').fill('Heck');
  await page.getByTestId('layer-name-input-1').press('Enter');
  await expect(rows.nth(0).getByTestId('layer-select')).toHaveText('Heck');

  await page.getByTestId('layer-row-1').hover();
  await page.getByTestId('layer-down-1').click();
  await expect(rows.nth(1).getByTestId('layer-select')).toHaveText('Heck');
  await expect(page.locator('svg[data-livery-render] .lv-paint .lv-logo')).toHaveCount(2);

  await rows.nth(1).getByTestId('layer-visible').uncheck();
  await expect(page.locator('svg[data-livery-render] .lv-paint .lv-logo')).toHaveCount(1);
  await expect(page.getByTestId('logo-frame')).toHaveCount(0); // the selected layer is hidden
  await rows.nth(1).getByTestId('layer-visible').check();
  await expect(page.locator('svg[data-livery-render] .lv-paint .lv-logo')).toHaveCount(2);

  await rows.nth(0).getByTestId('layer-select').click(); // select lufthansa (lufthansa, now on top)
  await expect(page.getByTestId('logo-frame')).toHaveCount(1);
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.down('Space');
  await expect(page.getByTestId('overlay')).toBeHidden();
  await page.keyboard.up('Space');

  await page.getByTestId('layer-row-0').hover();
  await page.getByTestId('layer-delete-0').click();
  await expect(rows).toHaveCount(1);
  await expect(page.locator('svg[data-livery-render] .lv-paint .lv-logo')).toHaveCount(1);
});
