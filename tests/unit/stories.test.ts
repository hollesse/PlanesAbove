import { describe, expect, it } from 'vitest';
import { COLORS, FONTS } from '../../src/client/ui/domain/tokens';

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
  it('halo is a cqw-scaled text-shadow, not a text-stroke (Safari 16, even outline)', async () => {
    const css = (await import('node:fs')).readFileSync('src/client/ui/styles/ui.css', 'utf8');
    expect(css).toMatch(/--pa-halo-w: [\d.]+cqw/);
    expect(css).not.toContain('text-stroke');
  });

  it('css defines the sky-ink halo tokens matching COLORS', async () => {
    const css = (await import('node:fs')).readFileSync('src/client/ui/styles/tokens.css', 'utf8');
    expect(css).toContain(`--pa-sky-ink-dark-halo: ${COLORS.skyInkDarkHalo.value}`);
    expect(css).toContain(`--pa-sky-ink-light-halo: ${COLORS.skyInkLightHalo.value}`);
  });

  it('defines the brand colours and fonts', () => {
    expect(COLORS.ink.value).toBe('#1F2A33');
    expect(COLORS.paper.value).toBe('#ECEBE3');
    expect(COLORS.paperDark.value).toBe('#D8D6CC');
    expect(COLORS.signal.value).toBe('#C8313E');
    expect(COLORS.skyInkDarkHalo.value).toBe('#F6EEDC');
    expect(COLORS.skyInkLightHalo.value).toBe('#1F2A33');
    expect(FONTS.display.weights).toEqual([900]);
    expect(FONTS.mono.weights).toEqual([400, 500]);
  });
});
