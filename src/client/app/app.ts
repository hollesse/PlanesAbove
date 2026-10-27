// The thin kiosk client (ADR 0004/0008): polls /api/state, renders the approved design-system screen, narrates on tap,
// holds the Vorlese-Sperre, recovers by itself. Imports UI only from the design-system barrel (ADR 0002).
import type { SceneState } from '../../shared/state';
import { renderScreen } from '../ui';
import { backoffMs, dayKey, reloadDue, staleText, tapTarget, toScreenProps } from './logic';
import { Narrator, type AudioLike } from './narrator';
import { VorleseSperre, type Timers } from './sperre';

export interface AppDeps {
  root: HTMLElement;
  fetchState: () => Promise<SceneState>;
  audio: AudioLike;
  timers: Timers;
  now: () => Date;
  reload: () => void;
  /** build id the loaded page was built with */
  buildId: string;
  /** Events the app subscribes to (window/document in the browser). */
  events?: { onOnline(fn: () => void): void; onVisible(fn: () => void): void };
}

export interface App { speak(index: number): void; pollNow(): Promise<void>; readonly sperre: VorleseSperre<SceneState> }

export function startApp(d: AppDeps): App {
  let current: SceneState | undefined;
  let failures = 0;
  let lastOkMs = d.now().getTime();
  let hiddenAtMs: number | null = null;
  let lastReloadDay: string = dayKey(d.now());
  let settings = { pollIntervalSeconds: 10, staleAfterMinutes: 5, reloadAt: '04:00', speechWatchdogSeconds: 60 };

  const render = (): void => {
    if (!current) return;
    const stale = staleText(current, d.now().getTime() - lastOkMs, settings.staleAfterMinutes * 60_000);
    const stage = renderScreen(toScreenProps(current, stale));
    d.root.replaceChildren(stage);
    d.root.dataset.stale = stale ? 'true' : 'false';
    d.root.dataset.planes = current.planes.map((p) => p.icao24).join(',');
    d.root.dataset.state = stage.dataset.state ?? '';
  };

  const sperre = new VorleseSperre<SceneState>((s) => { current = s; render(); }, d.timers);
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
    const stage = d.root.firstElementChild;
    if (!stage) return;
    const box = (el: Element): { left: number; top: number; right: number; bottom: number } => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
    const planeBoxes = [...stage.querySelectorAll('.pa-slot')].map(box);
    const textBoxes = current.planes.length === 1 ? [...stage.querySelectorAll('.pa-bar-single')].map(box) : [...stage.querySelectorAll('.pa-info-row')].map(box);
    const i = tapTarget(current.planes.length, { x: e.clientX, y: e.clientY }, planeBoxes, textBoxes);
    if (i !== undefined) speak(i);
  });

  const reloadWhenFree = (): void => sperre.whenFree(d.reload);

  async function pollNow(): Promise<void> {
    try {
      const state = await d.fetchState();
      failures = 0;
      lastOkMs = d.now().getTime();
      settings = state.client;
      if (state.buildId !== d.buildId) { reloadWhenFree(); return; }
      if (sperre.locked) sperre.submit(state); else { current = state; render(); }
    } catch {
      failures++;
      render(); // refreshes the stale indicator after N minutes without a successful poll
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

  return { speak, pollNow, sperre };
}
