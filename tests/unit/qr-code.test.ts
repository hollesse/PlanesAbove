import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import { SAMPLE_PHOTOS } from '../../src/client/ui/domain/photo';
import { qrMatrix } from '../../src/client/ui/domain/qr';
import { renderQrCode } from '../../src/client/ui/atoms/qr-code';
import { renderPhotoOverlay } from '../../src/client/ui/organisms/photo-overlay';

/** Rastert die Modulmatrix (mit Ruhezone) in RGBA-Pixel; jsdom hat kein Canvas. */
const rasterize = (m: boolean[][], scale = 6, quiet = 4) => {
  const n = (m.length + quiet * 2) * scale;
  const data = new Uint8ClampedArray(n * n * 4).fill(255);
  m.forEach((row, y) => row.forEach((dark, x) => {
    if (!dark) return;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const i = (((y + quiet) * scale + dy) * n + (x + quiet) * scale + dx) * 4;
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }));
  return { data, n };
};
const decode = (text: string): string | undefined => {
  const { data, n } = rasterize(qrMatrix(text));
  return jsQR(data, n, n)?.data;
};

describe('QR-Encoder', () => {
  it.each([
    'https://www.planespotters.net/photo/1234567/d-aibi-lufthansa-airbus-a320-271n',
    'beispiel.example/foto/1',
    'https://example.com/a?b=c&d=e#äöü',
    'x',
    'https://www.planespotters.net/' + 'a'.repeat(180),
  ])('decodes back to the input: %s', (url) => {
    expect(decode(url)).toBe(url);
  });

  it('rejects text that does not fit', () => {
    expect(() => qrMatrix('a'.repeat(1000))).toThrow();
  });
});

describe('QR-Link-back im Foto-Overlay', () => {
  /** Liest das gerenderte SVG zurueck: viewBox + <path>-Module -> Raster (inkl. Ruhezone). */
  const parseSvg = (qr: HTMLElement) => {
    const svg = qr.querySelector('svg')!;
    const n = Number(svg.getAttribute('viewBox')!.split(' ')[2]);
    const dark = [...(svg.querySelector('path')!.getAttribute('d')!.matchAll(/M(\d+) (\d+)h1v1h-1z/g))].map((m) => [Number(m[1]), Number(m[2])]);
    return { n, dark };
  };
  const decodeRendered = (qr: HTMLElement): string | undefined => {
    const { n, dark } = parseSvg(qr);
    const scale = 6, px = n * scale;
    const data = new Uint8ClampedArray(px * px * 4).fill(255);
    for (const [x, y] of dark) for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const i = ((y * scale + dy) * px + x * scale + dx) * 4;
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
    return jsQR(data, px, px)?.data;
  };

  it('single photo: the rendered SVG decodes (jsqr) to its pageUrl', () => {
    const el = renderPhotoOverlay({ photos: [SAMPLE_PHOTOS[0]], caption: 'x', onClose: () => {} });
    const qr = el.querySelector('.pa-photo-qr') as HTMLElement;
    expect(qr.getAttribute('aria-label')).toMatch(/QR/);
    expect(decodeRendered(qr)).toBe(SAMPLE_PHOTOS[0].pageUrl);
  });

  it('gallery: the rendered SVG decodes to the current photo pageUrl, before and after next', () => {
    expect(SAMPLE_PHOTOS.length).toBeGreaterThan(1);
    expect(new Set(SAMPLE_PHOTOS.map((p) => p.pageUrl)).size).toBe(SAMPLE_PHOTOS.length);
    const el = renderPhotoOverlay({ photos: SAMPLE_PHOTOS, caption: 'x', onClose: () => {} });
    for (const p of SAMPLE_PHOTOS) {
      expect(decodeRendered(el.querySelector('.pa-photo-qr') as HTMLElement)).toBe(p.pageUrl);
      (el.querySelector('.pa-photo-zone-next') as HTMLElement).click();
    }
  });

  it('rendered SVG has a 4-module quiet zone (viewBox = matrix + 8, no dark module in the border)', () => {
    const el = renderPhotoOverlay({ photos: [SAMPLE_PHOTOS[0]], caption: 'x', onClose: () => {} });
    const { n, dark } = parseSvg(el.querySelector('.pa-photo-qr') as HTMLElement);
    expect(n).toBe(qrMatrix(SAMPLE_PHOTOS[0].pageUrl).length + 8);
    expect(dark.length).toBeGreaterThan(0);
    for (const [x, y] of dark) {
      expect(x).toBeGreaterThanOrEqual(4); expect(x).toBeLessThan(n - 4);
      expect(y).toBeGreaterThanOrEqual(4); expect(y).toBeLessThan(n - 4);
    }
  });

  it('QR is part of the fixed-height meta zone, so image and arrows do not move', () => {
    const el = renderPhotoOverlay({ photos: SAMPLE_PHOTOS, caption: 'x', onClose: () => {} });
    expect(el.querySelector('.pa-photo-meta .pa-photo-qr')).not.toBeNull();
  });

  it('QR slot has a fixed size that fits the fixed meta height', async () => {
    const css = (await import('node:fs')).readFileSync('src/client/ui/styles/ui.css', 'utf8');
    const meta = Number(/\.pa-photo-meta \{[^}]*height: ([\d.]+)cqw/.exec(css)![1]);
    const slot = /\.pa-photo-qr-slot \{[^}]*width: ([\d.]+)cqw; height: ([\d.]+)cqw/.exec(css)!;
    expect(Number(slot[1])).toBe(Number(slot[2]));
    expect(Number(slot[2])).toBeLessThanOrEqual(meta);
    expect(Number(slot[1])).toBeGreaterThanOrEqual(10);
  });

  it('shows no QR in loading and empty states', () => {
    for (const photos of [null, []]) expect(renderPhotoOverlay({ photos, onClose: () => {} }).querySelector('.pa-photo-qr')).toBeNull();
  });

  it('renderQrCode draws dark modules on a white quiet zone', () => {
    const el = renderQrCode('abc');
    expect(el.innerHTML).toMatch(/fill="#fff/);
    expect(el.innerHTML).toMatch(/<path/);
  });
});
