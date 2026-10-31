import { h } from '../dom';
import type { Photo } from '../domain/photo';

export type PhotoOverlayState = 'single' | 'gallery' | 'loading' | 'empty';

export interface PhotoOverlayProps {
  /** `null` = Ladezustand; leeres Array = "Kein Foto". */
  photos: Photo[] | null;
  /** Zeile unter dem Foto: Kennzeichen · Typ · Airline. */
  caption?: string;
  startIndex?: number;
  onClose: () => void;
  /** Kiosk-Rücksicht: schliesst das Overlay nach dieser Zeit von selbst. */
  autoCloseMs?: number;
}

export const NO_PHOTO_TEXT = 'Zu diesem Flugzeug haben wir leider kein Foto.';
export const LOADING_TEXT = 'Foto wird geladen …';
/** Mindestweg einer Wischgeste in px. */
export const SWIPE_MIN_PX = 40;

export const photoOverlayState = (photos: Photo[] | null): PhotoOverlayState => (photos === null ? 'loading' : photos.length === 0 ? 'empty' : photos.length === 1 ? 'single' : 'gallery');

/** Index nach Blättern um `delta`; am Anfang/Ende wird nicht weitergeblättert. */
export const stepIndex = (index: number, delta: number, count: number): number => Math.min(count - 1, Math.max(0, index + delta));

/** Organism: Vollbild-Overlay mit Foto-Galerie ueber der Szene (absolut in einem `.pa-screen`). */
export function renderPhotoOverlay(props: PhotoOverlayProps): HTMLElement {
  const state = photoOverlayState(props.photos);
  const photos = props.photos ?? [];
  let index = Math.min(Math.max(props.startIndex ?? 0, 0), Math.max(photos.length - 1, 0));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const close = (): void => {
    if (timer) clearTimeout(timer);
    props.onClose();
  };

  const root = h('div', { class: 'pa-photo-overlay', data: { state, index: String(index) }, attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Foto' } });
  // Tippen auf die abgedunkelte Flaeche ausserhalb des Fotos schliesst.
  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });

  const closeBtn = h('button', { class: 'pa-photo-close', attrs: { type: 'button', 'aria-label': 'Schließen' }, html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 L19 19 M19 5 L5 19" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>' });
  closeBtn.addEventListener('click', close);

  const frame = h('div', { class: 'pa-photo-frame' });
  const caption = h('div', { class: 'pa-photo-caption pa-meta-small', text: props.caption ?? '' });
  const attribution = h('div', { class: 'pa-photo-attribution pa-meta-small' });
  const counter = h('div', { class: 'pa-photo-counter pa-meta-small' });
  const dots = h('div', { class: 'pa-photo-dots' });
  const arrowSvg = (dir: 'prev' | 'next'): string => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${dir === 'prev' ? 'M15 5 L8 12 L15 19' : 'M9 5 L16 12 L9 19'}" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
  const arrowPrev = h('button', { class: 'pa-photo-arrow pa-photo-arrow-prev', attrs: { type: 'button', 'aria-label': 'Voriges Foto' }, html: arrowSvg('prev') });
  const arrowNext = h('button', { class: 'pa-photo-arrow pa-photo-arrow-next', attrs: { type: 'button', 'aria-label': 'Nächstes Foto' }, html: arrowSvg('next') });
  const row = h('div', { class: 'pa-photo-row' });
  const meta = h('div', { class: 'pa-photo-meta' }, caption, attribution);

  if (state === 'loading') {
    frame.append(h('div', { class: 'pa-photo-status pa-photo-loading', text: LOADING_TEXT }));
  } else if (state === 'empty') {
    frame.append(h('div', { class: 'pa-photo-status pa-photo-empty', text: NO_PHOTO_TEXT }));
  } else {
    const img = h('img', { class: 'pa-photo-img', attrs: { alt: props.caption ?? 'Foto des Flugzeugs', draggable: 'false' } });
    img.addEventListener('load', () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) frame.style.setProperty('--pa-photo-ratio', (img.naturalWidth / img.naturalHeight).toFixed(4));
    });
    frame.append(img);
    const update = (): void => {
      const p = photos[index];
      img.src = p.imageUrl;
      attribution.replaceChildren(h('span', { class: 'pa-photo-licence', text: p.licenceText }), ' · ', h('span', { class: 'pa-photo-link', text: p.pageUrl }));
      root.dataset.index = String(index);
      if (state === 'gallery') {
        counter.textContent = `${index + 1} / ${photos.length}`;
        dots.replaceChildren(...photos.map((_, i) => h('span', { class: `pa-photo-dot${i === index ? ' pa-photo-dot-on' : ''}` })));
        arrowPrev.disabled = index === 0;
        arrowNext.disabled = index === photos.length - 1;
      }
    };
    update();
    if (state === 'gallery') {
      const go = (d: number): void => {
        index = stepIndex(index, d, photos.length);
        update();
      };
      const zone = (side: 'prev' | 'next', d: number): HTMLElement => {
        const z = h('button', { class: `pa-photo-zone pa-photo-zone-${side}`, attrs: { type: 'button', 'aria-label': side === 'prev' ? 'Voriges Foto' : 'Nächstes Foto' } });
        z.addEventListener('click', () => go(d));
        return z;
      };
      frame.append(zone('prev', -1), zone('next', 1), counter);
      arrowPrev.addEventListener('click', () => go(-1));
      arrowNext.addEventListener('click', () => go(1));
      row.classList.add('pa-photo-row-gallery');
      row.append(arrowPrev);
      meta.append(dots);
      let startX: number | null = null;
      frame.addEventListener('touchstart', (e) => {
        startX = e.touches[0]?.clientX ?? null;
      });
      frame.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0]?.clientX;
        if (startX !== null && endX !== undefined && Math.abs(endX - startX) >= SWIPE_MIN_PX) {
          go(endX < startX ? 1 : -1);
          e.preventDefault(); // kein zusaetzlicher Klick auf die Zone
        }
        startX = null;
      });
    }
  }

  row.append(frame);
  if (state === 'gallery') row.append(arrowNext);
  root.append(row, meta, closeBtn);
  if (props.autoCloseMs && props.autoCloseMs > 0) timer = setTimeout(close, props.autoCloseMs);
  return root;
}
