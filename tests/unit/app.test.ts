import { describe, expect, it } from 'vitest';
import { startApp, type AppDeps } from '../../src/client/app/app';
import type { Timers } from '../../src/client/app/sperre';
import type { SceneState, ScenePlane } from '../../src/shared/state';

const plane = (id: string): ScenePlane => ({ icao24: id, plane: { type: 'narrowbody', livery: 'def' }, flight: { operator: 'Lufthansa', callsign: 'DLH400', aircraft: 'Airbus A320neo', registration: '', route: null, altitudeM: 11000, speedKmh: 800, phase: 'level' }, speech: { text: 't', audioUrl: `/audio/${id}.wav` } });
const state = (ids: string[], o: Partial<SceneState> = {}): SceneState => ({ buildId: 'b1', serverTime: 0, stale: false, lastSuccessAt: 0, place: 'Test', clock: '10:00', sky: { time: 'day', weather: 'clear' }, planes: ids.map(plane), client: { pollIntervalSeconds: 10, staleAfterMinutes: 5, reloadAt: '04:00', speechWatchdogSeconds: 60 }, ...o });

function rig(initial: SceneState, fetchPhotos?: AppDeps['fetchPhotos']) {
  let next: SceneState | Error = initial; let clockMs = new Date(2026, 9, 27, 10, 0).getTime(); let reloads = 0;
  const audio = { src: '', played: 0, play() { this.played++; }, pause() {}, listeners: new Map<string, () => void>(), addEventListener(e: string, f: () => void) { this.listeners.set(e, f); }, removeEventListener(e: string) { this.listeners.delete(e); } };
  const pending: { at: number; fn: () => void }[] = [];
  const timers: Timers = { setTimeout: (fn, ms) => { const t = { at: clockMs + ms, fn }; pending.push(t); return t; }, clearTimeout: (h) => { const i = pending.indexOf(h as never); if (i >= 0) pending.splice(i, 1); } };
  const root = document.createElement('div');
  const deps: AppDeps = { fetchPhotos, root, buildId: 'b1', audio, timers, now: () => new Date(clockMs), reload: () => { reloads++; }, fetchState: async () => { if (next instanceof Error) throw next; return next; } };
  const app = startApp(deps);
  return {
    root, app, audio, reloads: () => reloads,
    set(s: SceneState | Error) { next = s; },
    async advance(ms: number) { clockMs += ms; for (const t of pending.filter((p) => p.at <= clockMs).sort((a, b) => a.at - b.at)) { pending.splice(pending.indexOf(t), 1); t.fn(); await Promise.resolve(); await Promise.resolve(); } },
    flush: async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); },
  };
}

describe('startApp (client composition)', () => {
  it('renders the first state with the approved screen', async () => {
    const r = rig(state(['a'])); await r.flush();
    expect(r.root.dataset.planes).toBe('a');
    expect(r.root.querySelector('.pa-screen')).toBeTruthy();
    expect(r.root.dataset.speaking).toBe('false');
  });
  it('speaking locks the scene; a newer selection waits for the end of the audio', async () => {
    const r = rig(state(['a'])); await r.flush();
    r.app.speak(0);
    expect(r.audio.src).toBe('/audio/a.wav');
    expect(r.root.dataset.speaking).toBe('true');
    r.set(state(['b'])); await r.app.pollNow();
    expect(r.root.dataset.planes).toBe('a');
    r.audio.listeners.get('ended')!();
    expect(r.root.dataset.speaking).toBe('false');
    expect(r.root.dataset.planes).toBe('b');
  });
  it('keeps the last good scene on a failed poll and marks it stale after the threshold, then recovers', async () => {
    const r = rig(state(['a'])); await r.flush();
    r.set(new Error('offline'));
    await r.advance(10_000);
    expect(r.root.dataset.planes).toBe('a');
    expect(r.root.dataset.stale).toBe('false');
    await r.advance(6 * 60_000);
    await r.app.pollNow();
    expect(r.root.dataset.stale).toBe('true');
    expect(r.root.querySelector('.pa-scene-header')?.textContent).toContain('Letzter Stand · 10:00');
    expect(r.root.querySelector('.pa-scene-header')?.textContent).not.toContain('Live');
    expect(r.root.dataset.planes).toBe('a');
    r.set(state(['c'])); await r.app.pollNow();
    expect(r.root.dataset.stale).toBe('false');
    expect(r.root.querySelector('.pa-scene-header')?.textContent).toContain('Live · ');
    expect(r.root.dataset.planes).toBe('c');
  });
  it('shows a server-flagged stale scene immediately', async () => {
    const r = rig(state(['a'])); await r.flush();
    r.set(state(['a'], { stale: true, clock: '09:58' })); await r.app.pollNow();
    expect(r.root.dataset.stale).toBe('true');
    expect(r.root.querySelector('.pa-scene-header')?.textContent).toContain('Letzter Stand · 09:58');
  });
  it('reloads when the server reports a different buildId, but not while narrating', async () => {
    const r = rig(state(['a'])); await r.flush();
    r.app.speak(0);
    r.set(state(['a'], { buildId: 'b2' })); await r.app.pollNow();
    expect(r.reloads()).toBe(0);
    r.audio.listeners.get('ended')!();
    expect(r.reloads()).toBe(1);
    r.set(state(['a'], { buildId: 'b3' })); await r.app.pollNow();
    expect(r.reloads()).toBe(2);
  });
  it('reloads once nightly at the configured time using the injected clock', async () => {
    const r = rig(state(['a'])); await r.flush();
    await r.advance(18 * 3600_000 + 30_000); // 10:00 -> 04:00 next day (+30 s check tick)
    expect(r.reloads()).toBeGreaterThanOrEqual(1);
  });

  describe('Übergang-Sperre (ADR 0020)', () => {
    const TR = 5000 + 300;
    it('first poll renders without transition; [a]->[a,b] starts one-to-two with data-planes at once', async () => {
      const r = rig(state(['a'])); await r.flush();
      expect(r.root.dataset.transition ?? '').toBe('');
      expect(r.root.dataset.planes).toBe('a');
      r.set(state(['a', 'b'])); await r.app.pollNow();
      expect(r.root.dataset.transition).toBe('one-to-two');
      expect(r.root.dataset.planes).toBe('a,b');
      expect(r.root.dataset.speaking).toBe('false');
    });
    it('buffers polls during a transition and shows only the newest at TRANSITION_MS + 300', async () => {
      const r = rig(state(['a'])); await r.flush();
      r.set(state(['a', 'b'])); await r.app.pollNow();
      r.set(state(['a'])); await r.app.pollNow();
      r.set(state(['x'])); await r.app.pollNow();
      r.set(state(['a', 'b'], { clock: '10:05' })); await r.app.pollNow();
      expect(r.root.dataset.planes).toBe('a,b');
      expect(r.root.dataset.transition).toBe('one-to-two');
      await r.advance(TR - 100);
      expect(r.root.dataset.planes).toBe('a,b');
      r.set(state(['b', 'q'])); await r.app.pollNow();
      await r.advance(100);
      expect(r.root.dataset.planes).toBe('b,q'); // newest only; [a,b] with clock 10:05 and [a]/[x] never shown
      expect(r.root.dataset.transition).toBe(''); // cut
      expect(r.root.querySelector('.pa-scene-header')?.textContent).toContain('10:00');
    });
    it('after the transition ends the end screen is rendered and data-transition cleared', async () => {
      const r = rig(state(['a'])); await r.flush();
      r.set(state(['a', 'b'])); await r.app.pollNow();
      expect(r.root.querySelector('[data-transition]')).toBeTruthy();
      await r.advance(TR);
      expect(r.root.dataset.transition).toBe('');
      expect(r.root.querySelector('.pa-screen')).toBeTruthy();
    });
    it('a narration starting mid-transition holds a buffered state past the transition timer; the reverse waits for the transition', async () => {
      const r = rig(state(['a'])); await r.flush();
      r.set(state(['a', 'b'])); await r.app.pollNow();
      r.app.speak(1);
      expect(r.root.dataset.speaking).toBe('true');
      r.set(state(['b'])); await r.app.pollNow(); // buffered by the Vorlese-Sperre
      await r.advance(TR);
      expect(r.root.dataset.planes).toBe('a,b');
      r.audio.listeners.get('ended')!();
      expect(r.root.dataset.planes).toBe('b');
      expect(r.root.dataset.speaking).toBe('false');
      expect(r.root.dataset.transition).toBe('two-to-one-a'); // the released state starts its own transition
      // reverse: a state polled after narration end waits for the transition end
      r.set(state(['b', 'z'])); await r.app.pollNow();
      r.set(state(['z'])); await r.app.pollNow();
      expect(r.root.dataset.planes).toBe('b');
      await r.advance(TR);
      expect(r.root.dataset.planes).toBe('z');
      expect(r.root.dataset.transition).toBe('switch-one');
    });
    it('a failed poll during a transition does not replace the stage', async () => {
      const r = rig(state(['a'])); await r.flush();
      r.set(state(['a', 'b'])); await r.app.pollNow();
      const stage = r.root.firstElementChild;
      r.set(new Error('offline')); await r.app.pollNow();
      expect(r.root.firstElementChild).toBe(stage);
    });
    it('tapping the arriving plane during the transition speaks its audio (data-side=to)', async () => {
      const r = rig(state(['a'])); await r.flush();
      r.set(state(['a', 'b'])); await r.app.pollNow();
      const box = (left: number) => ({ left, top: 0, right: left + 10, bottom: 10, x: left, y: 0, width: 10, height: 10, toJSON() {} }) as DOMRect;
      r.root.querySelectorAll<HTMLElement>('.pa-slot').forEach((el) => {
        const side = el.dataset.side; const idx = Number(el.dataset.index);
        el.getBoundingClientRect = () => (side === 'to' ? box(idx * 100) : box(500));
      });
      r.root.querySelectorAll<HTMLElement>('.pa-bar, .pa-info-row').forEach((el) => { el.getBoundingClientRect = () => box(900); });
      r.root.dispatchEvent(new MouseEvent('click', { clientX: 105, clientY: 5, bubbles: true }));
      expect(r.audio.src).toBe('/audio/b.wav');
    });
  });
  describe('Foto-Overlay (Nummern-Plakette)', () => {
    const photo = (id: string) => ({ id, thumbUrl: 't', imageUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', photographer: 'P', source: 'S', pageUrl: 'example.org/' + id, licenceText: 'Foto ' + id });
    const box = (left: number, top = 0) => ({ left, top, right: left + 10, bottom: top + 10, x: left, y: top, width: 10, height: 10, toJSON() {} }) as DOMRect;
    // lay out: plane slots at x=0 / 100, badge slots at x=200 / 300 (y 0), info-row badges at 400/500 (y 50), info rows y 100 wide
    const layout = (root: HTMLElement) => {
      root.querySelectorAll<HTMLElement>('.pa-slot').forEach((el, i) => { el.getBoundingClientRect = () => box(i * 100); });
      root.querySelectorAll<HTMLElement>('.pa-badge-slot').forEach((el) => { el.getBoundingClientRect = () => box(Number(el.dataset.badge) * 100 + 100); });
      root.querySelectorAll<HTMLElement>('.pa-info-row').forEach((el, i) => { el.getBoundingClientRect = () => ({ ...box(0, 100 + i * 20), right: 1000, bottom: 110 + i * 20 }) as DOMRect; });
      root.querySelectorAll<HTMLElement>('.pa-info-row .pa-badge').forEach((el) => { el.getBoundingClientRect = () => box(Number(el.textContent) * 100 + 300, 50); });
    };
    const tap = (root: HTMLElement, x: number, y = 5) => root.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
    const two = async (fetchPhotos?: AppDeps['fetchPhotos']) => { const r = rig(state(['a', 'b']), fetchPhotos); await r.flush(); layout(r.root); return r; };

    it('tapping Plakette 2 in the scene opens the overlay for plane b without narrating; closing restores narration', async () => {
      const asked: string[] = [];
      const r = await two(async (hex) => { asked.push(hex); return [photo('1'), photo('2')]; });
      tap(r.root, 305);
      expect(r.root.querySelector('.pa-photo-overlay')?.getAttribute('data-state')).toBe('loading');
      await r.flush();
      expect(asked).toEqual(['b']);
      expect(r.root.querySelector('.pa-photo-overlay')?.getAttribute('data-state')).toBe('gallery');
      expect(r.root.querySelector('.pa-photo-caption')?.textContent).toBe('Airbus A320neo · Lufthansa');
      expect(r.audio.played).toBe(0);
      expect(r.root.dataset.speaking).toBe('false');
      r.root.querySelector<HTMLElement>('.pa-photo-close')!.click();
      expect(r.root.querySelector('.pa-photo-overlay')).toBeNull();
      tap(r.root, 5); // plane 1 narrates again
      expect(r.audio.src).toBe('/audio/a.wav');
    });
    it('tapping the Plakette in the info row opens the overlay for that plane (before the text area)', async () => {
      const asked: string[] = [];
      const r = await two(async (hex) => { asked.push(hex); return []; });
      tap(r.root, 405, 55); // badge 1 in the info row, which lies inside the row's wide box
      await r.flush();
      expect(asked).toEqual(['a']);
      expect(r.root.querySelector('.pa-photo-overlay')?.getAttribute('data-state')).toBe('empty');
      expect(r.audio.played).toBe(0);
    });
    it('a failing photo fetch or none configured shows Kein Foto', async () => {
      const r = await two(async () => { throw new Error('x'); });
      tap(r.root, 205); await r.flush();
      expect(r.root.querySelector('.pa-photo-overlay')?.getAttribute('data-state')).toBe('empty');
      const r2 = await two();
      tap(r2.root, 205); await r2.flush();
      expect(r2.root.querySelector('.pa-photo-overlay')?.getAttribute('data-state')).toBe('empty');
    });
    it('the overlay survives re-renders, transitions and the plane leaving; no auto-close; Sperre/selection untouched', async () => {
      const r = await two(async () => [photo('1')]);
      tap(r.root, 205); await r.flush();
      const overlay = r.root.querySelector('.pa-photo-overlay');
      r.set(state(['a', 'b'], { clock: '10:01' })); await r.app.pollNow(); // Takt update, full re-render
      expect(r.root.querySelector('.pa-photo-overlay')).toBe(overlay);
      r.set(state(['a'])); await r.app.pollNow(); // plane b disappears: transition stage
      expect(r.root.dataset.planes).toBe('a');
      expect(r.root.querySelector('.pa-photo-overlay')).toBe(overlay);
      expect(r.root.firstElementChild?.classList.contains('pa-photo-host')).toBe(false);
      await r.advance(60_000); await r.advance(60_000);
      expect(r.root.querySelector('.pa-photo-overlay')).toBe(overlay);
      expect(r.root.dataset.speaking).toBe('false');
    });
    it('an open overlay captures taps: nothing underneath narrates', async () => {
      const r = await two(async () => [photo('1')]);
      tap(r.root, 205); await r.flush();
      r.root.querySelector('.pa-photo-frame')!.dispatchEvent(new MouseEvent('click', { clientX: 5, clientY: 5, bubbles: true }));
      expect(r.audio.played).toBe(0);
      expect(r.root.querySelector('.pa-photo-overlay')).toBeTruthy();
    });
    it('the backdrop closes', async () => {
      const r = await two(async () => [photo('1')]);
      tap(r.root, 205); await r.flush();
      r.root.querySelector<HTMLElement>('.pa-photo-overlay')!.click();
      expect(r.root.querySelector('.pa-photo-overlay')).toBeNull();
    });
    it.each([['X', '.pa-photo-close'], ['backdrop', '.pa-photo-overlay']])('closing via %s over a plane, info row or Plakette neither narrates nor re-opens', async (_n, sel) => {
      for (const [x, y] of [[5, 5], [5, 105], [305, 5]] as const) {
        const r = await two(async () => [photo('1')]);
        tap(r.root, 205); await r.flush();
        r.root.querySelector(sel)!.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
        expect(r.root.querySelector('.pa-photo-overlay')).toBeNull();
        expect(r.audio.played).toBe(0);
        expect(r.root.dataset.speaking).toBe('false');
      }
    });
    it('every tap inside the overlay (arrow, image, frame, QR, attribution) ends there, over plane / info row / Plakette', async () => {
      for (const [x, y] of [[5, 5], [5, 105], [305, 5]] as const) {
        const r = await two(async () => [photo('1'), photo('2')]);
        tap(r.root, 205); await r.flush();
        const overlay = r.root.querySelector('.pa-photo-overlay')!;
        const counter = () => r.root.querySelector('.pa-photo-counter')?.textContent;
        const before = counter();
        const click = (sel: string) => { const el = r.root.querySelector(sel); expect(el, sel).toBeTruthy(); el!.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true })); };
        click('.pa-photo-arrow-next');
        expect(counter()).not.toBe(before);
        for (const sel of ['.pa-photo-img', '.pa-photo-frame', '.pa-photo-qr', '.pa-photo-attribution']) {
          if (r.root.querySelector(sel)) click(sel);
        }
        expect(r.root.querySelector('.pa-photo-overlay')).toBe(overlay);
        expect(r.root.querySelectorAll('.pa-photo-overlay').length).toBe(1);
        expect(r.root.querySelectorAll('.pa-photo-host').length).toBe(1);
        expect(r.audio.played).toBe(0);
      }
    });
    it('single plane: no Plakette target, a tap on the info bar only narrates', async () => {
      const asked: string[] = [];
      const r = rig(state(['a']), async (h) => { asked.push(h); return []; }); await r.flush();
      r.root.querySelectorAll<HTMLElement>('.pa-bar-single').forEach((el) => { el.getBoundingClientRect = () => ({ ...box(0), right: 1000, bottom: 1000 }) as DOMRect; });
      tap(r.root, 5);
      expect(r.audio.src).toBe('/audio/a.wav');
      expect(asked).toEqual([]);
      expect(r.root.querySelector('.pa-photo-overlay')).toBeNull();
    });
  });
});
