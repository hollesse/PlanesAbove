// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

describe('Plattform', () => {
  it('the component modules bundle for the client target es2020 / safari16 (iPadOS 16 baseline)', async () => {
    const result = await build({ entryPoints: ['src/client/ui/index.ts'], bundle: true, write: false, format: 'esm', target: ['es2020', 'safari16'], logLevel: 'silent' });
    expect(result.errors).toHaveLength(0);
    expect(result.outputFiles[0].text.length).toBeGreaterThan(1000);
  });

  it('fonts are shipped locally, not from Google Fonts', () => {
    const css = fs.readFileSync('src/client/ui/styles/tokens.css', 'utf8');
    expect(css).not.toMatch(/googleapis|gstatic/);
    const urls = [...css.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1]);
    expect(urls).toHaveLength(3);
    for (const u of urls) expect(fs.existsSync(path.join('src/client/ui/styles', u)), u).toBe(true);
    expect(css).toContain("font-family: 'Archivo'");
    expect(css).toContain("font-family: 'IBM Plex Mono'");
  });

  it('no component links an external font or resource', () => {
    for (const f of ['src/client/ui/styles/ui.css', '.storybook/preview.ts']) expect(fs.readFileSync(f, 'utf8')).not.toMatch(/https?:\/\//);
  });
});
