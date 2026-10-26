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

test('the sky covers the whole stage in every template and page story, transitions included, at 4:3 and 5:3', async ({ page }) => {
  const index = (await (await page.request.get('/index.json')).json()) as { entries: Record<string, Entry> };
  const ids = Object.values(index.entries).filter((e) => e.type === 'story' && (e.title.startsWith('Templates/') || e.title.startsWith('Pages/'))).map((e) => e.id);
  expect(ids.length).toBeGreaterThan(0);
  const ratio = { '4:3': 4 / 3, '5:3': 5 / 3 };
  for (const aspect of ['4:3', '5:3'] as const) {
    for (const id of ids) {
      if (id.endsWith('--format-53') && aspect === '4:3') continue; // story pins its own 5:3 format
      const label = `${id} @ ${aspect}`;
      await page.goto(`/iframe.html?id=${id}&viewMode=story`);
      await page.waitForSelector('.pa-sky svg');
      // URL args cannot carry a colon value, so switch the aspect via Storybook's own channel (same as the Controls panel).
      await page.evaluate(([storyId, a]) => (window as any).__STORYBOOK_ADDONS_CHANNEL__.emit('updateStoryArgs', { storyId, updatedArgs: { aspect: a } }), [id, aspect]);
      await page.waitForSelector(`.pa-screen[data-aspect="${aspect}"]`);
      const ms = await page.evaluate(() => {
        const r = (e: Element) => e.getBoundingClientRect();
        return [...document.querySelectorAll('.pa-sky svg')].filter((svg) => svg.closest('.pa-screen')).map((svg) => {
          const stage = svg.closest('.pa-screen')!;
          const st = r(stage); const sk = r(svg);
          return { top: sk.top - st.top, left: sk.left - st.left, bottom: st.bottom - sk.bottom, right: st.right - sk.right, aspect: (stage as HTMLElement).dataset.aspect, ratio: st.width / st.height };
        });
      });
      expect(ms.length, `${label} has stage skies`).toBeGreaterThan(0);
      for (const m of ms) {
        expect(m.aspect, label).toBe(aspect);
        expect(Math.abs(m.ratio - ratio[aspect]), `${label} stage ratio`).toBeLessThan(0.05);
        expect(m.top, label).toBeLessThanOrEqual(3);
        expect(m.bottom, label).toBeLessThanOrEqual(3);
        expect(m.left, label).toBeLessThanOrEqual(3);
        expect(m.right, label).toBeLessThanOrEqual(3);
      }
    }
  }
});

test('text on the sky gets an outline in the counter colour of its ink; text on paper gets none', async ({ page }) => {
  const index = (await (await page.request.get('/index.json')).json()) as { entries: Record<string, Entry> };
  const ids = Object.values(index.entries).filter((e) => e.type === 'story' && (e.title.startsWith('Templates/') || e.title.startsWith('Pages/') || e.title === 'Molecules/Kopfzeile')).map((e) => e.id);
  const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
  const LIGHT = rgb('#F6EEDC'); const DARK = rgb('#1F2A33');
  const seen = new Set<string>();
  for (const id of ids) {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await page.waitForSelector('.pa-scene-header');
    const res = await page.evaluate(() => {
      const hdr = document.querySelector('.pa-scene-header') as HTMLElement;
      const cs = getComputedStyle(hdr);
      const paper = [...document.querySelectorAll('.pa-bar, .pa-bar *, .pa-info-row, .pa-info-row *, .pa-badge')].map((e) => getComputedStyle(e).textShadow);
      return { color: cs.color, shadow: cs.textShadow, paper };
    });
    const counter = res.color === DARK ? LIGHT : DARK;
    seen.add(res.color);
    expect(res.shadow.split('rgb(').length - 1, id).toBe(8); // all directions
    for (const part of res.shadow.match(/rgb\([^)]*\)/g)!) expect(part, id).toBe(counter);
    for (const p of res.paper) expect(p, `${id} paper text`).toBe('none');
  }
  expect(seen.size, 'both inks covered').toBe(2);
});
