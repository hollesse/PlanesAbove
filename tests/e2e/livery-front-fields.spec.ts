import { expect, test } from '@playwright/test';

// ADR 0038: the regional-jet's rear engines are a front field: drawn above the paths, cut out of their clip area.
test('regional-jet story: the red body path ends at the engine nacelle (nacelle colour #c9cccb, not path red)', async ({ page }) => {
  await page.goto('/iframe.html?id=liveries-pfade--spike-regional-jet&viewMode=story');
  const svg = page.locator('svg[data-livery-render]').first();
  await svg.waitFor();
  const px = async (x: number, y: number) => {
    // viewBox "0 -60 1000 460" -> element pixel
    const box = (await svg.boundingBox())!;
    const clip = { x: box.x + (x / 1000) * box.width, y: box.y + ((y + 60) / 460) * box.height, width: 1, height: 1 };
    const png = await page.screenshot({ clip });
    return page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      const g = c.getContext('2d')!;
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, 1, 1).data;
      return '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
    }, png.toString('base64'));
  };
  const near = (a: string, b: string) => [1, 3, 5].every((i) => Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)) <= 4);
  expect(near(await px(255, 215), '#c9cccb'), 'engine nacelle').toBe(true);
  expect(near(await px(450, 230), '#d6001c'), 'fuselage path elsewhere stays red').toBe(true);
});
