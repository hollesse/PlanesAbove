import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { EDITOR_OUT } from '../../playwright.config';

// ADR 0037 point 3: Chromium-only editor E2E, writing into a temp directory. Spike walking skeleton:
// draw four points, close, save, then the board and Storybook's generated story must show the same picture.
const STORYBOOK = 'http://127.0.0.1:6007';
const committed = JSON.parse(fs.readFileSync('src/client/ui/assets/liveries/spike/narrowbody.json', 'utf8'));

async function svgShot(page: import('@playwright/test').Page): Promise<string> {
  await page.evaluate(() => document.querySelectorAll('svg.overlay').forEach((o) => ((o as unknown as HTMLElement).style.display = 'none'))); // editor-only selection/draft overlay is not part of the picture
  const svg = page.locator('svg[data-livery-render]');
  await svg.evaluate((el) => { (el as unknown as HTMLElement).style.cssText = 'display:block;width:800px;height:auto;background:#fff'; });
  return (await svg.screenshot()).toString('base64');
}

async function expectSameAsStory(page: import('@playwright/test').Page, storyId: string) {
  const board = await svgShot(page);
  const sb = await page.context().newPage();
  await sb.goto(`${STORYBOOK}/iframe.html?id=${storyId}&viewMode=story`);
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
  // tolerance: sub-pixel anti-aliasing of the two page layouts (observed ~0.2 %); a real divergence shows as tens of percent
  expect(diff).toBeLessThan(0.005);
}

test.beforeEach(() => fs.rmSync(EDITOR_OUT, { recursive: true, force: true }));

test('draw a quad, see it clipped, unclipped at silhouette opacity 0, save, and match the Storybook story', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('svg[data-livery-render] .lv-body')).toBeVisible();
  await expect(page.locator('svg[data-livery-render] .lv-details')).toBeAttached();

  // four clicks at the committed points (viewBox coordinates -> screen), then close
  const box = (await page.getByTestId('overlay').boundingBox())!;
  const [vx, vy, vw, vh] = (await page.getByTestId('overlay').getAttribute('viewBox'))!.split(' ').map(Number);
  const at = ([x, y]: number[]) => [box.x + ((x - vx) / vw) * box.width, box.y + ((y - vy) / vh) * box.height] as const;
  const pts = committed.layers[0].points as number[][];
  for (const p of pts) await page.mouse.click(...at(p));
  await page.getByTestId('path-color').fill(committed.layers[0].color);
  await page.mouse.click(...at(pts[0])); // clicking the first point closes the path

  // clipped: the quad reaches beyond the silhouette (x 300..700 / y 150..300) but is cut at the body edge
  const paint = page.locator('svg[data-livery-render] .lv-paint');
  await expect(paint).toHaveAttribute('clip-path', /url\(#lv\d+-clip\)/);
  expect(await page.locator('svg[data-livery-render] .lv-ghost').count()).toBe(0);
  // opacity 0 reveals the uncut quad
  await page.getByTestId('opacity-silhouette').fill('0');
  await expect(page.locator('svg[data-livery-render] .lv-ghost')).toHaveCount(1);
  await expect(page.locator('svg[data-livery-render] .lv-ghost path')).toHaveAttribute('d', /^M300 150 L700 150 L700 300 L300 300 Z$/);
  await page.getByTestId('opacity-silhouette').fill('1');

  // save: exactly <out>/spike/narrowbody.json equal to the committed file
  await page.getByTestId('save').click();
  await expect(page.getByTestId('status')).toContainText('Gespeichert');
  expect(fs.readdirSync(EDITOR_OUT, { recursive: true }).sort()).toEqual(['spike', path.join('spike', 'narrowbody.json')]);
  const saved = JSON.parse(fs.readFileSync(path.join(EDITOR_OUT, 'spike/narrowbody.json'), 'utf8'));
  expect(saved.layers[0].points).toHaveLength(4);
  expect(saved).toEqual(committed);

  // same picture as the Storybook story (canvas diff, tolerance below)
  await expectSameAsStory(page, 'liveries-pfade--spike-narrowbody');
});

test('Escape discards the draft; a following click starts a fresh one; there is no close button', async ({ page }) => {
  await page.goto('/');
  const overlay = page.getByTestId('overlay');
  await expect(page.locator('svg[data-livery-render] .lv-body')).toBeVisible();
  await expect(page.getByTestId('close-path')).toHaveCount(0);
  const box = (await overlay.boundingBox())!;
  const dots = overlay.locator('circle[r="5"]');
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4);
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.4);
  await expect(dots).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(dots).toHaveCount(0);
  await expect(overlay.locator('circle')).toHaveCount(0);
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.6);
  await expect(dots).toHaveCount(1);
  await expect(page.getByTestId('close-path')).toHaveCount(0);
});

test('a livery id with ../ is refused with 400 and nothing is written', async ({ request }) => {
  const r = await request.post('/__livery-editor/save', { data: { ...committed, livery: '../escape' } });
  expect(r.status()).toBe(400);
  expect(fs.existsSync(EDITOR_OUT) ? fs.readdirSync(EDITOR_OUT, { recursive: true }) : []).toEqual([]);
});

test('layer panel: two overlapping paths, swap their order, hide one, save in panel order, and match the Storybook story', async ({ page }) => {
  const fixture = JSON.parse(fs.readFileSync('src/client/ui/assets/liveries/stack-order/narrowbody.json', 'utf8'));
  await page.goto('/');
  await expect(page.locator('svg[data-livery-render] .lv-body')).toBeVisible();
  const box = (await page.getByTestId('overlay').boundingBox())!;
  const [vx, vy, vw, vh] = (await page.getByTestId('overlay').getAttribute('viewBox'))!.split(' ').map(Number);
  const at = ([x, y]: number[]) => [box.x + ((x - vx) / vw) * box.width, box.y + ((y - vy) / vh) * box.height] as const;
  const draw = async (points: number[][], color: string) => {
    for (const p of points) await page.mouse.click(...at(p));
    await page.getByTestId('path-color').fill(color);
    await page.mouse.click(...at(points[0]));
  };
  // drawn bottom first: red, then blue on top of it
  await draw(fixture.layers[1].points, fixture.layers[1].color);
  await draw(fixture.layers[0].points, fixture.layers[0].color);
  const rows = page.getByTestId('layer-list').locator('[data-testid^="layer-row-"]');
  await expect(rows).toHaveCount(2);
  // the panel lists the top layer first and the newly closed path is selected
  await expect(rows.nth(0)).toHaveAttribute('data-index', '1');
  await expect(rows.nth(0)).toHaveClass(/selected/);
  await expect(page.locator('#board')).toHaveAttribute('data-selected', '1');
  await expect(page.getByTestId('selection-outline')).toHaveCount(1);
  await page.getByTestId('layer-name').fill('Blau');
  await rows.nth(1).getByTestId('layer-select').click();
  await expect(page.locator('#board')).toHaveAttribute('data-selected', '0');
  await page.getByTestId('layer-name').fill('Rot');
  await expect(rows.nth(1).getByTestId('layer-select')).toHaveText('Rot');

  // swap: Rot goes up, above Blau
  await page.getByTestId('layer-up').click();
  await expect(rows.nth(0).getByTestId('layer-select')).toHaveText('Rot');
  await expect(page.locator('#board')).toHaveAttribute('data-selected', '1');

  // hiding removes it from the board, not from the saved file
  await page.getByTestId('livery-id').fill('stack-order');
  await rows.nth(1).getByTestId('layer-visible').uncheck();
  await expect(page.locator('svg[data-livery-render] .lv-paint path')).toHaveCount(1);
  await page.getByTestId('save').click();
  await expect(page.getByTestId('status')).toContainText('Gespeichert');
  const target = path.join(EDITOR_OUT, 'stack-order/narrowbody.json');
  expect(JSON.parse(fs.readFileSync(target, 'utf8')).layers).toHaveLength(2);
  await rows.nth(1).getByTestId('layer-visible').check();
  await expect(page.locator('svg[data-livery-render] .lv-paint path')).toHaveCount(2);

  // save in panel order (bottom -> top = Blau, Rot) and compare with the committed fixture's story
  await page.getByTestId('save').click();
  await expect(page.getByTestId('status')).toContainText('Gespeichert');
  expect(JSON.parse(fs.readFileSync(target, 'utf8'))).toEqual(fixture);
  await expectSameAsStory(page, 'liveries-pfade--stack-order-narrowbody');
});
