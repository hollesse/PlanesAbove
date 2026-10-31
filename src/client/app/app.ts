// The thin kiosk client (ADR 0004/0008): polls /api/state, renders the approved design-system screen, narrates on tap,
// holds the Vorlese-Sperre, recovers by itself. Imports UI only from the design-system barrel (ADR 0002).
import type { SceneState } from '../../shared/state';
import { TRANSITIONS, TRANSITION_MS, fitRoutesWhenMounted, playTransition, renderPhotoOverlay, renderScreen, renderTransitionStage, type ScreenPlane } from '../ui';
import type { Photo } from '../ui/domain/photo';
import { pickTransition } from './transition-plan';
import { backoffMs, badgeTarget, dayKey, reloadDue, staleSince, tapTarget, toScreenProps } from './logic';
import { Narrator, type AudioLike } from './narrator';
import { VorleseSperre, type Timers } from './sperre';

export interface AppDeps {
  root: HTMLElement;
  fetchState: () => Promise<SceneState>;
  audio: AudioLike;
  timers: Timers;
  now: () => Date;
  /** Photos of one aircraft (GET /api/photos/:icao24). Resolve [] for "Kein Foto"; a rejection is treated the same. Default: no photos. */
  fetchPhotos?: (icao24: string) => Promise<Photo[]>;
  reload: () => void;
  /** build id the loaded page was built with */
  buildId: string;
  /** Events the app subscribes to (window/document in the browser). */
  events?: { onOnline(fn: () => void): void; onVisible(fn: () => void): void };
}

export interface App { speak(index: number): void; openPhoto(index: number): void; closePhoto(): void; pollNow(): Promise<void>; readonly sperre: VorleseSperre<SceneState>; readonly uebergangSperre: VorleseSperre<SceneState> }

export function startApp(d: AppDeps): App {
  let current: SceneState | undefined;
  let failures = 0;
  let lastOkMs = d.now().getTime();
  let hiddenAtMs: number | null = null;
  let lastReloadDay: string = dayKey(d.now());
  let settings = { pollIntervalSeconds: 10, staleAfterMinutes: 5, reloadAt: '04:00', speechWatchdogSeconds: 60 };

  const stageIsTransition = (): boolean => d.root.firstElementChild?.hasAttribute('data-transition') ?? false;
  const staleNow = (s: SceneState) => staleSince(s, d.now().getTime() - lastOkMs, settings.staleAfterMinutes * 60_000);

  // Foto-Overlay: lives in its own host next to the stage (NOT inside it), re-attached after every full render so it survives Takt updates and transitions.
  let photoHost: HTMLElement | undefined;
  let photoToken = 0;
  const mount = (stage: HTMLElement): void => { if (photoHost) d.root.replaceChildren(stage, photoHost); else d.root.replaceChildren(stage); };
  const closePhoto = (): void => { photoToken++; photoHost?.remove(); photoHost = undefined; };
  const showOverlay = (photos: Photo[] | null, caption: string): void => {
    if (!photoHost) { photoHost = document.createElement('div'); photoHost.className = 'pa-screen pa-photo-host'; photoHost.addEventListener('click', (e) => e.stopPropagation()); /* a tap in the overlay (incl. the one that closes it) never reaches the scene */ d.root.append(photoHost); }
    photoHost.replaceChildren(renderPhotoOverlay({ photos, caption, onClose: closePhoto }));
  };
  const openPhoto = (i: number): void => {
    const p = current?.planes[i];
    if (!p) return;
    const caption = [p.flight.registration, p.flight.aircraft, p.flight.operator].filter(Boolean).join(' · ');
    const token = ++photoToken;
    showOverlay(null, caption);
    (d.fetchPhotos ? d.fetchPhotos(p.icao24) : Promise.resolve([] as Photo[])).catch(() => [] as Photo[]).then((photos) => { if (token === photoToken) showOverlay(photos, caption); });
  };

  const render = (): void => {
    if (!current) return;
    const stale = staleNow(current);
    const stage = renderScreen(toScreenProps(current, stale));
    mount(stage);
    fitRoutesWhenMounted(stage);
    d.root.dataset.stale = stale ? 'true' : 'false';
    d.root.dataset.planes = current.planes.map((p) => p.icao24).join(',');
    d.root.dataset.state = stage.dataset.state ?? '';
    d.root.dataset.transition = '';
  };

  // Übergang-Sperre (ADR 0020): a plane transition is never interrupted; the newest state is buffered until it ends.
  let shows = 0;
  const show = (s: SceneState): void => {
    shows++;
    const prev = current;
    current = s;
    const id = pickTransition(prev?.planes, s.planes);
    const spec = TRANSITIONS.find((t) => t.id === id);
    if (!prev || !spec) { render(); return; }
    const toScreen = (planes: SceneState['planes']): ScreenPlane[] => planes.map((p) => ({ plane: { type: p.plane.type, livery: p.plane.livery }, flight: p.flight }));
    const stale = staleNow(s);
    const stage = renderTransitionStage(spec, { from: toScreen(prev.planes), to: toScreen(s.planes), sky: s.sky, place: s.place, clock: s.clock, stale, recent: { from: prev.recent, to: s.recent } });
    mount(stage);
    fitRoutesWhenMounted(stage);
    playTransition(stage);
    d.root.dataset.stale = stale ? 'true' : 'false';
    d.root.dataset.planes = s.planes.map((p) => p.icao24).join(',');
    d.root.dataset.state = stage.dataset.state ?? '';
    d.root.dataset.transition = spec.id;
    uebergangSperre.lock(TRANSITION_MS + 300);
  };
  const uebergangSperre = new VorleseSperre<SceneState>(show, d.timers);
  { // The lock's watchdog is the end timer. On release: show the newest buffered state, or the settled end screen.
    const releaseOrig = uebergangSperre.release.bind(uebergangSperre);
    uebergangSperre.release = () => {
      if (!uebergangSperre.locked) return;
      const before = shows;
      releaseOrig();
      if (shows === before) render();
    };
  }

  const sperre = new VorleseSperre<SceneState>((s) => uebergangSperre.submit(s), d.timers);
  const syncSpeaking = (): void => { d.root.dataset.speaking = String(sperre.locked); };
  // Wrap lock/release so the DOM reflects the Vorlese-Sperre (also observable by E2E).
  const lockOrig = sperre.lock.bind(sperre); const releaseOrig = sperre.release.bind(sperre);
  sperre.lock = (ms: number) => { lockOrig(ms); syncSpeaking(); };
  sperre.release = () => { releaseOrig(); syncSpeaking(); };
  syncSpeaking();

  const narrator = new Narrator({ audio: d.audio, sperre, get watchdogSeconds() { return settings.speechWatchdogSeconds; } });

  const speak = (i: number): void => {
    const p = current?.planes[i];
    if (p) narrator.speak(p.speech.audioUrl, p.speech.durationMs);
  };

  d.root.addEventListener('click', (e) => {
    if (!current) return;
    if (photoHost && e.target instanceof Node && photoHost.contains(e.target)) return; // an open overlay captures its taps
    const stage = d.root.firstElementChild;
    if (!stage) return;
    const box = (el: Element): { left: number; top: number; right: number; bottom: number } => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
    const inTransition = stageIsTransition();
    // In a transition stage, leaving and arriving layers are stacked: only the arriving ("to") ones map to the current planes.
    const byIndex = (els: Element[]): Element[] => { const out: Element[] = []; for (const el of els) out[Number((el as HTMLElement).dataset.index ?? out.length)] = el; return out; };
    const planeEls = inTransition ? byIndex([...stage.querySelectorAll('.pa-slot[data-side="to"]')]) : [...stage.querySelectorAll('.pa-slot')];
    const planeBoxes = planeEls.map((el) => (el ? box(el) : { left: 0, top: 0, right: -1, bottom: -1 }));
    const textSel = current.planes.length === 1 ? '.pa-bar-single' : '.pa-info-row';
    const textEls = inTransition ? [...stage.querySelectorAll(`[data-side="to"]${textSel}, [data-side="to"] ${textSel}`)] : [...stage.querySelectorAll(textSel)];
    const textBoxes = textEls.map(box);
    const badgeEls = [...stage.querySelectorAll('.pa-badge-slot, .pa-info-row .pa-badge')].filter((el) => !inTransition || el.closest('[data-side]')?.getAttribute('data-side') === 'to' || el.getAttribute('data-side') === 'to');
    const b = badgeTarget(current.planes.length, { x: e.clientX, y: e.clientY }, badgeEls.map((el) => ({ n: Number((el as HTMLElement).dataset.badge ?? el.textContent), box: box(el) })));
    if (b !== undefined) { openPhoto(b); return; }
    const i = tapTarget(current.planes.length, { x: e.clientX, y: e.clientY }, planeBoxes, textBoxes);
    if (i !== undefined) speak(i);
  });

  const reloadWhenFree = (): void => sperre.whenFree(() => uebergangSperre.whenFree(d.reload));

  async function pollNow(): Promise<void> {
    try {
      const state = await d.fetchState();
      failures = 0;
      lastOkMs = d.now().getTime();
      settings = state.client;
      if (state.buildId !== d.buildId) { reloadWhenFree(); return; }
      sperre.submit(state);
    } catch {
      failures++;
      if (!uebergangSperre.locked) render(); // refreshes the stale indicator after N minutes without a successful poll
    }
  }

  const loop = async (): Promise<void> => {
    await pollNow();
    d.timers.setTimeout(() => { void loop(); }, backoffMs(failures, settings.pollIntervalSeconds * 1000));
  };
  void loop();

  // Nightly reload via the injected clock (default 04:00 local), checked every 30 s.
  const nightly = (): void => {
    const r = reloadDue(d.now(), settings.reloadAt, lastReloadDay);
    if (r.due) { lastReloadDay = r.day; reloadWhenFree(); }
    d.timers.setTimeout(nightly, 30_000);
  };
  d.timers.setTimeout(nightly, 30_000);

  d.events?.onOnline(() => { void pollNow(); reloadWhenFree(); });
  d.events?.onVisible(() => {
    const away = hiddenAtMs === null ? 0 : d.now().getTime() - hiddenAtMs;
    hiddenAtMs = null;
    if (away > settings.staleAfterMinutes * 60_000) reloadWhenFree(); else void pollNow();
  });

  return { speak, openPhoto, closePhoto, pollNow, sperre, uebergangSperre };
}
