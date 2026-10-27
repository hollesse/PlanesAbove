import { describe, expect, it } from 'vitest';
import { COLORS, FONTS, GLOW_BLUR } from '../../src/client/ui/domain/tokens';

const modules = import.meta.glob('../../src/client/ui/stories/*.stories.ts', { eager: true }) as Record<string, { default: { title: string }; [k: string]: unknown }>;
const LEVELS = ['Atoms', 'Molecules', 'Organisms', 'Templates', 'Pages'];

describe('Atomic Design Story-Hierarchie', () => {
  const titles = Object.values(modules).map((m) => m.default.title);

  it('every story file sits on exactly one of the five levels', () => {
    expect(titles.length).toBeGreaterThan(10);
    for (const t of titles) expect(LEVELS, t).toContain(t.split('/')[0]);
  });

  it('each level has stories', () => {
    for (const l of LEVELS) expect(titles.some((t) => t.startsWith(`${l}/`)), l).toBe(true);
  });

  it('titles are unique, so no component is listed on two levels', () => {
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('has the story sets the acceptance criteria name', () => {
    const exports = (title: string) => Object.keys(Object.values(modules).find((m) => m.default.title === title)!).filter((k) => k !== 'default');
    expect(exports('Organisms/Info-Leiste')).toHaveLength(4); // four info bar states
    expect(exports('Templates/Bildschirm').length).toBeGreaterThanOrEqual(3); // leer, eins, zwei
    expect(exports('Pages/Übergänge')).toEqual(expect.arrayContaining(['FlugzeugKommt', 'FlugzeugGeht', 'FlugzeugWechselt', 'WetterWechselt', 'TageszeitWechselt']));
  });
});

describe('Tokens', () => {
  it('glow is a wide cqw-blurred, offset-free text-shadow, not a text-stroke or 8-direction outline (Safari 16)', async () => {
    const fs = await import('node:fs');
    const css = fs.readFileSync('src/client/ui/styles/ui.css', 'utf8');
    const tokens = fs.readFileSync('src/client/ui/styles/tokens.css', 'utf8');
    const blur = Number(/--pa-sky-glow-blur: ([\d.]+)cqw/.exec(tokens)?.[1]);
    expect(blur).toBeGreaterThan(0.1 * 5); // far wider than the old 0.1cqw outline
    expect(css).not.toContain('text-stroke');
    expect(css).not.toMatch(/halo/);
    expect(tokens).not.toMatch(/halo/);
    const rule = /\.pa-glow-on-light-ink[^{]*\{[^}]*text-shadow:([^;]+);/.exec(css)?.[1] ?? '';
    expect(rule).toContain('var(--pa-sky-glow-blur)');
    // every shadow layer has zero x/y offset (centred glow)
    for (const layer of rule.split(/,(?![^()]*\))/)) expect(layer.trim(), layer).toMatch(/^0 0 /);
    expect(rule.split(/,(?![^()]*\))/).length).toBeLessThanOrEqual(2);
  });

  it('css defines the sky glow tokens matching COLORS: black ~40% on light ink, white ~40% on dark ink', async () => {
    const css = (await import('node:fs')).readFileSync('src/client/ui/styles/tokens.css', 'utf8');
    expect(css).toContain(`--pa-sky-glow-on-light-ink: ${COLORS.skyGlowOnLightInk.value}`);
    expect(css).toContain(`--pa-sky-glow-on-dark-ink: ${COLORS.skyGlowOnDarkInk.value}`);
    expect(COLORS.skyGlowOnLightInk.value).toBe('rgba(0, 0, 0, 0.4)');
    expect(COLORS.skyGlowOnDarkInk.value).toBe('rgba(255, 255, 255, 0.4)');
  });

  it('Token story "Schein" shows both glow colours and the blur token, with the glow applied on both inks', () => {
    const story = (modules['../../src/client/ui/stories/tokens.stories.ts'] as unknown as { Schein: { render: () => HTMLElement } }).Schein;
    const el = story.render();
    const text = el.textContent ?? '';
    expect(text).toContain('--pa-sky-glow-blur');
    expect(text).toContain('0.8cqw');
    expect(text).toContain(COLORS.skyGlowOnLightInk.value);
    expect(text).toContain(COLORS.skyGlowOnDarkInk.value);
    expect(el.querySelector('.pa-glow-on-light-ink')).not.toBeNull();
    expect(el.querySelector('.pa-glow-on-dark-ink')).not.toBeNull();
  });

  it('GLOW_BLUR mirrors the --pa-sky-glow-blur value in tokens.css', async () => {
    const css = (await import('node:fs')).readFileSync('src/client/ui/styles/tokens.css', 'utf8');
    expect(css).toContain(`${GLOW_BLUR.token}: ${GLOW_BLUR.value}`);
  });

  it('defines the brand colours and fonts', () => {
    expect(COLORS.ink.value).toBe('#1F2A33');
    expect(COLORS.paper.value).toBe('#ECEBE3');
    expect(COLORS.paperDark.value).toBe('#D8D6CC');
    expect(COLORS.signal.value).toBe('#C8313E');
    expect(FONTS.display.weights).toEqual([900]);
    expect(FONTS.mono.weights).toEqual([400, 500]);
  });
});
