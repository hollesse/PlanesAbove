import { expect, test } from '@playwright/test';

// Every story must render without errors (ADR 0003). The list comes from the built Storybook's index.json.
interface Entry { id: string; title: string; name: string; type: string }

test('every story renders without errors', async ({ page, request, baseURL }) => {
  const index = (await (await request.get(`${baseURL}/index.json`)).json()) as { entries: Record<string, Entry> };
  const stories = Object.values(index.entries).filter((e) => e.type === 'story');
  expect(stories.length).toBeGreaterThan(30);

  const problems: string[] = [];
  let current = '';
  page.on('pageerror', (e) => problems.push(`${current}: pageerror ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${current}: console.${m.type()} ${m.text()}`); });
  page.on('requestfailed', (r) => problems.push(`${current}: request failed ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${current}: HTTP ${r.status()} ${r.url()}`); });

  for (const s of stories) {
    current = s.id;
    await page.goto(`/iframe.html?id=${s.id}&viewMode=story`);
    await page.waitForSelector('.pa-root', { timeout: 15_000 });
    await expect(page.locator('.sb-errordisplay'), s.id).toBeHidden();
    expect(await page.locator('.pa-root *').count(), `${s.id} rendered content`).toBeGreaterThan(0);
  }
  expect(problems).toEqual([]);
});

test('the Atomic Design levels are visible in the navigation', async ({ request, baseURL }) => {
  const index = (await (await request.get(`${baseURL}/index.json`)).json()) as { entries: Record<string, Entry> };
  const levels = new Set(Object.values(index.entries).map((e) => e.title.split('/')[0]));
  expect([...levels].sort()).toEqual(['Atoms', 'Molecules', 'Organisms', 'Pages', 'Templates']);
});

test('fonts are served locally', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1')) external.push(r.url()); });
  await page.goto('/iframe.html?id=atoms-tokens--typografie&viewMode=story');
  await page.waitForSelector('.pa-root');
  const loaded = await page.evaluate(async () => { await document.fonts.ready; return [document.fonts.check("900 20px Archivo"), document.fonts.check("400 20px 'IBM Plex Mono'")]; });
  expect(loaded).toEqual([true, true]);
  expect(external).toEqual([]);
});
