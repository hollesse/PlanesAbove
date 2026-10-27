import { describe, expect, it } from 'vitest';
import { COLORS, FONTS, GLOW_BLUR, GLOW_COLORS } from '../../src/client/ui/domain/tokens';

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
  const LAYERS = ['tight', 'mid', 'wide'] as const;
  const read = async (f: string) => (await import('node:fs')).readFileSync(f, 'utf8');

  it('Schein (variant E) is three stacked offset-free cqw text-shadows per ink, no text-stroke or 8-direction outline (Safari 16)', async () => {
    const css = await read('src/client/ui/styles/ui.css');
    expect(css).not.toContain('text-stroke');
    for (const ink of ['light', 'dark']) {
      const rule = new RegExp(`\\.pa-glow-on-${ink}-ink \\{[^}]*text-shadow:([^;]+);`).exec(css)?.[1] ?? '';
      const layers = rule.split(/,(?![^()]*\))/).map((l) => l.trim());
      expect(layers, ink).toHaveLength(3);
      layers.forEach((layer, i) => {
        expect(layer, `${ink} ${i}`).toMatch(/^0 0 /); // zero x/y offset
        expect(layer).toContain(`var(--pa-sky-glow-blur-${LAYERS[i]})`);
        expect(layer).toContain(`var(--pa-sky-glow-on-${ink}-ink-${LAYERS[i]})`);
      });
    }
  });

  it('glow tokens in css mirror the TS tokens: black 90/90/70 % on light ink, white 80/80/60 % on dark ink, radii 0.3/1/2.4cqw', async () => {
    const css = await read('src/client/ui/styles/tokens.css');
    for (const l of LAYERS) {
      expect(css).toContain(`${GLOW_BLUR[l].token}: ${GLOW_BLUR[l].value}`);
      expect(css).toContain(`${GLOW_COLORS.light[l].token}: ${GLOW_COLORS.light[l].value}`);
      expect(css).toContain(`${GLOW_COLORS.dark[l].token}: ${GLOW_COLORS.dark[l].value}`);
    }
    expect(LAYERS.map((l) => GLOW_BLUR[l].value)).toEqual(['0.3cqw', '1cqw', '2.4cqw']);
    expect(LAYERS.map((l) => GLOW_COLORS.light[l].value)).toEqual(['rgba(0, 0, 0, 0.9)', 'rgba(0, 0, 0, 0.9)', 'rgba(0, 0, 0, 0.7)']);
    expect(LAYERS.every((l) => GLOW_COLORS.dark[l].value.startsWith('rgba(255, 255, 255, '))).toBe(true);
    expect(css).not.toContain('--pa-sky-glow-blur:');
    expect(css).not.toMatch(/--pa-sky-glow-on-(light|dark)-ink:/);
  });

  it('scene header glow classes set font-weight 500; info bar classes stay without glow or weight override', async () => {
    const css = await read('src/client/ui/styles/ui.css');
    expect(css).toMatch(/\.pa-glow-on-light-ink, \.pa-glow-on-dark-ink \{ font-weight: 500; \}/);
    expect(css).not.toMatch(/\.pa-(bar|info-row|badge|meta-small|eyebrow)[^{]*\{[^}]*font-weight: 500/);
  });

  it('Token story "Schein" shows all three radii and every per-ink layer colour, with the glow applied on both inks', () => {
    const story = (modules['../../src/client/ui/stories/tokens.stories.ts'] as unknown as { Schein: { render: () => HTMLElement } }).Schein;
    const el = story.render();
    const text = el.textContent ?? '';
    for (const l of LAYERS) {
      expect(text).toContain(GLOW_BLUR[l].token);
      expect(text).toContain(GLOW_BLUR[l].value);
      expect(text).toContain(GLOW_COLORS.light[l].token);
      expect(text).toContain(GLOW_COLORS.dark[l].token);
    }
    expect(text).toContain('rgba(0, 0, 0, 0.7)');
    expect(text).toContain('rgba(255, 255, 255, 0.6)');
    expect(el.querySelector('.pa-glow-on-light-ink')).not.toBeNull();
    expect(el.querySelector('.pa-glow-on-dark-ink')).not.toBeNull();
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
