import { describe, expect, it } from 'vitest';
import { LIVERIES } from '../../src/client/ui/domain/liveries';
import { PLANE_TYPES } from '../../src/client/ui/domain/catalog';
import { PLANE_SVG } from '../../src/client/ui/assets/generated/planes';
import { LOGO_SVG } from '../../src/client/ui/assets/generated/logos';
import { anchorOf, placeLogo, resolveLivery } from '../../src/client/ui/domain/livery';
import { renderPaintedPlane } from '../../src/client/ui/molecules/painted-plane';
import { LOGO_IDS, logoContentBoxes, renderLogo } from '../../src/client/ui/atoms/logo';

describe('Lackierung', () => {
  it('catalog has 42 liveries incl. the Standard-Lackierung', () => {
    expect(LIVERIES).toHaveLength(42);
    expect(LIVERIES.find((l) => l.id === 'def')?.vars).toEqual({});
  });

  it('applies livery colours as CSS custom properties on the plane', () => {
    const el = renderPaintedPlane({ type: 'narrowbody', livery: 'condor' });
    expect(el.style.getPropertyValue('--skin-tail')).toBe('#F7A62B');
    expect(el.dataset.livery).toBe('condor');
    expect(el.dataset.planeType).toBe('narrowbody');
  });

  it('falls back to the Standard-Lackierung for an unknown or missing livery', () => {
    expect(resolveLivery('narrowbody', 'does-not-exist')).toMatchObject({ fellBack: true, available: true });
    expect(resolveLivery('narrowbody', 'does-not-exist').def.id).toBe('def');
    expect(resolveLivery('widebody', undefined).def.id).toBe('def');
    const el = renderPaintedPlane({ type: 'widebody', livery: 'nope' });
    expect(el.dataset.livery).toBe('def');
    expect(el.style.getPropertyValue('--skin-tail')).toBe('');
  });

  it('offers no airline livery for Light Aircraft and Glider (only the default)', () => {
    for (const type of ['light-aircraft', 'glider'] as const) {
      expect(resolveLivery(type, 'lh').available).toBe(false);
      expect(resolveLivery(type, 'def').available).toBe(true);
      expect(renderPaintedPlane({ type, livery: 'lh' }).className).toBe('pa-no-livery');
      expect(renderPaintedPlane({ type, livery: 'def' }).querySelector('svg')).not.toBeNull();
    }
  });

  it('every livery can be applied to every other Typklasse', () => {
    for (const t of PLANE_TYPES) for (const l of LIVERIES) expect(renderPaintedPlane({ type: t.id, livery: l.id })).toBeTruthy();
  });

  it('standardised livery variable names are the ones the plane SVGs use (no --skin-tailband)', () => {
    const used = new Set(Object.values(PLANE_SVG).flatMap((s) => [...s.matchAll(/var\((--skin-[a-z0-9-]+)/g)].map((m) => m[1])));
    const unknown = LIVERIES.flatMap((l) => Object.keys(l.vars)).filter((k) => !used.has(k));
    expect(unknown).toEqual([]);
  });
});

describe('Logo-Ankerpunkte', () => {
  it('detects the anchor a logo asset declares', () => {
    expect(anchorOf(LOGO_SVG['aerlingus'])).toBe('logo-tail-center');
    expect(anchorOf(LOGO_SVG['klm'])).toBe('logo-tail-mid');
    expect(anchorOf(LOGO_SVG['sas'])).toBe('logo-tail-base');
    expect(anchorOf(LOGO_SVG['tap'])).toBe('logo-fuselage-fwd');
    expect(anchorOf(LOGO_SVG['easyjet'])).toBe('logo-tail-lead');
    expect(anchorOf(LOGO_SVG['tap-tail'])).toBe('logo-tail-fit');
    expect(anchorOf(LOGO_SVG['lufthansa'])).toBe('logo-tail'); // no anchor: default tail position
  });

  it('puts every anchored logo into the matching group of a narrowbody', () => {
    for (const id of LOGO_IDS.filter((i) => !i.endsWith('-tail'))) {
      const anchor = anchorOf(LOGO_SVG[id]);
      const out = placeLogo(PLANE_SVG['narrowbody'], LOGO_SVG[id]);
      expect(out, id).toMatch(new RegExp(`<g class="${anchor}"[^>]*><svg`));
    }
  });

  it('puts the "-tail" companion into logo-tail-fit', () => {
    const out = placeLogo(PLANE_SVG['narrowbody'], undefined, LOGO_SVG['tap-tail']);
    expect(out).toMatch(/<g class="logo-tail-fit"[^>]*><svg/);
  });

  it('painted plane uses the livery logo, can override it and can switch it off', () => {
    expect(renderPaintedPlane({ type: 'narrowbody', livery: 'lh', logo: 'lufthansa' }).querySelector('.logo-tail svg')).not.toBeNull();
    expect(renderPaintedPlane({ type: 'narrowbody', livery: 'lh', logo: null }).querySelector('.logo-tail svg')).toBeNull();
    expect(renderPaintedPlane({ type: 'narrowbody', livery: 'klm' }).querySelector('.logo-tail-mid svg')).not.toBeNull(); // livery default logo
    expect(renderPaintedPlane({ type: 'narrowbody', livery: 'def', logo: 'sas' }).querySelector('.logo-tail-base svg')).not.toBeNull();
  });

  it('renders every logo on its own', () => {
    expect(LOGO_IDS).toHaveLength(16);
    for (const id of LOGO_IDS) expect(renderLogo({ id }).querySelector('svg')).not.toBeNull();
  });
});

describe('Logo-Assets vollstaendig und unbeschnitten', () => {
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');
  const dirs = ['src/client/ui/assets/svg/logos', 'svg/logos'];

  it('every logo SVG references a PNG that exists next to it (in the asset and the draft folder)', () => {
    for (const dir of dirs) {
      const svgs = fs.readdirSync(dir).filter((f) => f.endsWith('.svg'));
      expect(svgs.length, dir).toBeGreaterThan(10);
      for (const f of svgs) {
        const href = /<image\b[^>]*href="([^"]+)"/.exec(fs.readFileSync(path.join(dir, f), 'utf8'))?.[1];
        if (href && !href.startsWith('data:')) expect(fs.existsSync(href.includes('/') ? href : path.join(dir, href)), `${dir}/${f} -> ${href}`).toBe(true);
      }
    }
  });

  it('no generated logo falls back to the dashed missing-asset placeholder', () => {
    for (const id of LOGO_IDS) expect(LOGO_SVG[id], id).not.toContain('data-missing-asset');
  });

  it('the logo atom viewBox encloses all painted content, so no logo is clipped', () => {
    for (const id of LOGO_IDS) {
      const vb = renderLogo({ id }).querySelector('svg')!.getAttribute('viewBox')!.split(/\s+/).map(Number);
      for (const b of logoContentBoxes(LOGO_SVG[id])) {
        expect(b.x, id).toBeGreaterThanOrEqual(vb[0] - 1e-6);
        expect(b.y, id).toBeGreaterThanOrEqual(vb[1] - 1e-6);
        expect(b.x + b.w, id).toBeLessThanOrEqual(vb[0] + vb[2] + 1e-6);
        expect(b.y + b.h, id).toBeLessThanOrEqual(vb[1] + vb[3] + 1e-6);
      }
    }
  });
  it('every logo on every Typklasse is nested with overflow="visible"; only the drafts\' fin clip on logo-tail-lead crops a logo', () => {
    let seen = 0;
    for (const { id: type } of PLANE_TYPES) {
      for (const logo of LOGO_IDS) {
        const el = renderPaintedPlane({ type, livery: 'def', logo });
        for (const svg of Array.from(el.querySelectorAll('g[class^="logo-"] svg'))) {
          seen++;
          const label = `${type}/${logo}`;
          expect(svg.getAttribute('overflow'), label).toBe('visible');
          const clip = svg.closest('[clip-path]');
          if (clip) {
            // intended per the Claude Design drafts (svg/narrowbody.svg): logo-tail-lead runs along the fin's leading edge, cropped to the fin outline
            expect(svg.closest('g[class^="logo-"]')!.getAttribute('class'), `${label} clipped`).toBe('logo-tail-lead');
            expect(clip.getAttribute('clip-path'), label).toMatch(/fin-clip/);
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(100);
  });
});
