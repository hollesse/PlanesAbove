import { afterEach, describe, expect, it, vi } from 'vitest';
import { SAMPLE_PHOTOS } from '../../src/client/ui/domain/photo';
import { NO_PHOTO_TEXT, photoOverlayState, renderPhotoOverlay, stepIndex } from '../../src/client/ui/organisms/photo-overlay';

const mount = (photos: Parameters<typeof renderPhotoOverlay>[0]['photos'], extra: Partial<Parameters<typeof renderPhotoOverlay>[0]> = {}) => {
  const onClose = vi.fn();
  const el = renderPhotoOverlay({ photos, caption: 'D-AIBI · A320neo · Lufthansa', onClose, ...extra });
  return { el, onClose };
};
const q = (el: HTMLElement, sel: string) => el.querySelector(sel) as HTMLElement;
const css = async () => (await import('node:fs')).readFileSync('src/client/ui/styles/ui.css', 'utf8');

afterEach(() => vi.useRealTimers());

describe('Foto-Overlay', () => {
  it('derives the four states', () => {
    expect(photoOverlayState(null)).toBe('loading');
    expect(photoOverlayState([])).toBe('empty');
    expect(photoOverlayState([SAMPLE_PHOTOS[0]])).toBe('single');
    expect(photoOverlayState(SAMPLE_PHOTOS)).toBe('gallery');
  });

  it('close button fires close; so does a tap on the dark area, but not a tap on the photo', () => {
    const a = mount(SAMPLE_PHOTOS);
    q(a.el, '.pa-photo-close').click();
    expect(a.onClose).toHaveBeenCalledTimes(1);
    const b = mount(SAMPLE_PHOTOS);
    b.el.click();
    expect(b.onClose).toHaveBeenCalledTimes(1);
    q(b.el, '.pa-photo-img').click();
    expect(b.onClose).toHaveBeenCalledTimes(1);
  });

  it('close target is at least 64px and sits top right', async () => {
    const rule = /\.pa-photo-close \{([^}]*)\}/.exec(await css())![1];
    expect(rule).toMatch(/width: max\(64px,/);
    expect(rule).toMatch(/height: max\(64px,/);
    expect(rule).toMatch(/top: [\d.]+cqw/);
    expect(rule).toMatch(/right: [\d.]+cqw/);
  });

  it('gallery: right/left half pages, counter and dots follow, no paging past the ends', () => {
    const { el } = mount(SAMPLE_PHOTOS);
    const counter = () => q(el, '.pa-photo-counter').textContent;
    const on = () => [...el.querySelectorAll('.pa-photo-dot')].findIndex((d) => d.classList.contains('pa-photo-dot-on'));
    expect(counter()).toBe('1 / 3');
    expect(el.querySelectorAll('.pa-photo-dot')).toHaveLength(3);
    q(el, '.pa-photo-zone-prev').click(); // am Anfang: bleibt
    expect(counter()).toBe('1 / 3');
    q(el, '.pa-photo-zone-next').click();
    expect([counter(), on()]).toEqual(['2 / 3', 1]);
    q(el, '.pa-photo-zone-next').click();
    q(el, '.pa-photo-zone-next').click(); // am Ende: bleibt
    expect([counter(), on()]).toEqual(['3 / 3', 2]);
    q(el, '.pa-photo-zone-prev').click();
    expect(counter()).toBe('2 / 3');
    expect(stepIndex(2, 1, 3)).toBe(2);
    expect(stepIndex(0, -1, 3)).toBe(0);
  });

  it('gallery: swiping pages', () => {
    const { el } = mount(SAMPLE_PHOTOS);
    const frame = q(el, '.pa-photo-frame');
    const touch = (type: string, x: number) => {
      const ev = new Event(type, { cancelable: true }) as Event & { touches: unknown; changedTouches: unknown };
      ev.touches = [{ clientX: x }];
      ev.changedTouches = [{ clientX: x }];
      frame.dispatchEvent(ev);
    };
    touch('touchstart', 300);
    touch('touchend', 100); // nach links wischen = naechstes
    expect(q(el, '.pa-photo-counter').textContent).toBe('2 / 3');
    touch('touchstart', 100);
    touch('touchend', 300);
    expect(q(el, '.pa-photo-counter').textContent).toBe('1 / 3');
    touch('touchstart', 100);
    touch('touchend', 110); // zu kurz
    expect(q(el, '.pa-photo-counter').textContent).toBe('1 / 3');
  });

  it('every photo view shows licenceText verbatim and the page link as text', () => {
    const { el } = mount(SAMPLE_PHOTOS);
    for (const p of SAMPLE_PHOTOS) {
      expect(q(el, '.pa-photo-licence').textContent).toBe(p.licenceText);
      expect(q(el, '.pa-photo-link').textContent).toBe(p.pageUrl);
      expect((q(el, '.pa-photo-img') as HTMLImageElement).src).toBe(p.imageUrl);
      q(el, '.pa-photo-zone-next').click();
    }
    const single = mount([SAMPLE_PHOTOS[1]]).el;
    expect(q(single, '.pa-photo-licence').textContent).toBe(SAMPLE_PHOTOS[1].licenceText);
    expect(single.querySelector('.pa-photo-counter')).toBeNull();
    expect(single.querySelector('.pa-photo-zone')).toBeNull();
  });

  it('loading and empty states show a hint instead of an empty frame', () => {
    expect(q(mount(null).el, '.pa-photo-loading').textContent).toMatch(/geladen/);
    const empty = mount([]).el;
    expect(q(empty, '.pa-photo-empty').textContent).toBe(NO_PHOTO_TEXT);
    expect(empty.querySelector('img')).toBeNull();
    expect(q(empty, '.pa-photo-close')).not.toBeNull();
  });

  it('autoCloseMs closes by itself; a manual close cancels the timer', () => {
    vi.useFakeTimers();
    const a = mount(SAMPLE_PHOTOS, { autoCloseMs: 5000 });
    vi.advanceTimersByTime(4999);
    expect(a.onClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(a.onClose).toHaveBeenCalledTimes(1);
    const b = mount(SAMPLE_PHOTOS, { autoCloseMs: 5000 });
    q(b.el, '.pa-photo-close').click();
    vi.advanceTimersByTime(6000);
    expect(b.onClose).toHaveBeenCalledTimes(1);
  });

  it('uses only Safari-16-safe CSS: no dialog element, no :has()', async () => {
    const c = await css();
    expect(c).not.toMatch(/:has\(/);
    expect(mount(SAMPLE_PHOTOS).el.tagName).toBe('DIV');
  });

  it('sample photos are marked placeholders, no http hotlinks', () => {
    for (const p of SAMPLE_PHOTOS) {
      expect(p.imageUrl.startsWith('data:')).toBe(true);
      expect(p.thumbUrl.startsWith('data:')).toBe(true);
    }
  });
});

describe('Foto-Overlay: Rahmen folgt dem Bild', () => {
  it('sets --pa-photo-ratio from the loaded image so the frame has no letterbox', async () => {
    const { renderPhotoOverlay } = await import('../../src/client/ui/organisms/photo-overlay');
    const { SAMPLE_PHOTOS } = await import('../../src/client/ui/domain/photo');
    const el = renderPhotoOverlay({ photos: SAMPLE_PHOTOS, onClose: () => {} });
    const img = el.querySelector('.pa-photo-img') as HTMLImageElement;
    Object.defineProperty(img, 'naturalWidth', { value: 498 });
    Object.defineProperty(img, 'naturalHeight', { value: 280 });
    img.dispatchEvent(new Event('load'));
    const frame = el.querySelector('.pa-photo-frame') as HTMLElement;
    expect(frame.style.getPropertyValue('--pa-photo-ratio')).toBe((498 / 280).toFixed(4));
    const css = (await import('node:fs')).readFileSync('src/client/ui/styles/ui.css', 'utf8');
    expect(css).toMatch(/\.pa-photo-frame \{[^}]*var\(--pa-photo-ratio\)/);
    expect(css).not.toMatch(/\.pa-photo-frame \{[^}]*aspect-ratio: 4 \/ 3/);
  });
});

describe('Foto-Overlay: Pfeil-Knöpfe neben dem Bild', () => {
  it('gallery has prev/next arrow buttons beside the frame; they page and grey out at the ends', async () => {
    const { renderPhotoOverlay } = await import('../../src/client/ui/organisms/photo-overlay');
    const { SAMPLE_PHOTOS } = await import('../../src/client/ui/domain/photo');
    const el = renderPhotoOverlay({ photos: SAMPLE_PHOTOS, onClose: () => {} });
    const row = el.querySelector('.pa-photo-row') as HTMLElement;
    const prev = row.querySelector('.pa-photo-arrow-prev') as HTMLButtonElement;
    const next = row.querySelector('.pa-photo-arrow-next') as HTMLButtonElement;
    expect(row.firstElementChild).toBe(prev);
    expect(row.lastElementChild).toBe(next);
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    next.click();
    expect(el.querySelector('.pa-photo-counter')?.textContent).toBe('2 / 3');
    expect(prev.disabled).toBe(false);
    next.click();
    expect(next.disabled).toBe(true);
    prev.click();
    expect(el.querySelector('.pa-photo-counter')?.textContent).toBe('2 / 3');
    const single = renderPhotoOverlay({ photos: [SAMPLE_PHOTOS[0]], onClose: () => {} });
    expect(single.querySelector('.pa-photo-arrow')).toBeNull();
    const css = (await import('node:fs')).readFileSync('src/client/ui/styles/ui.css', 'utf8');
    expect(css).toMatch(/\.pa-photo-arrow \{[^}]*max\(64px/);
  });
});
