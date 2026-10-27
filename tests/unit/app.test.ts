import { describe, expect, it } from 'vitest';
import { startApp, type AppDeps } from '../../src/client/app/app';
import type { Timers } from '../../src/client/app/sperre';
import type { SceneState, ScenePlane } from '../../src/shared/state';

const plane = (id: string): ScenePlane => ({ icao24: id, plane: { type: 'narrowbody', livery: 'def' }, flight: { operator: 'Lufthansa', callsign: 'DLH400', aircraft: 'Airbus A320neo', registration: '', route: null, altitudeM: 11000, speedKmh: 800, phase: 'level' }, speech: { text: 't', audioUrl: `/audio/${id}.wav` } });
const state = (ids: string[], o: Partial<SceneState> = {}): SceneState => ({ buildId: 'b1', serverTime: 0, stale: false, lastSuccessAt: 0, place: 'Test', clock: '10:00', sky: { time: 'day', weather: 'clear' }, planes: ids.map(plane), client: { pollIntervalSeconds: 10, staleAfterMinutes: 5, reloadAt: '04:00', speechWatchdogSeconds: 60 }, ...o });

function rig(initial: SceneState) {
  let next: SceneState | Error = initial; let clockMs = new Date(2026, 9, 27, 10, 0).getTime(); let reloads = 0;
  const audio = { src: '', played: 0, play() { this.played++; }, pause() {}, listeners: new Map<string, () => void>(), addEventListener(e: string, f: () => void) { this.listeners.set(e, f); }, removeEventListener(e: string) { this.listeners.delete(e); } };
  const pending: { at: number; fn: () => void }[] = [];
  const timers: Timers = { setTimeout: (fn, ms) => { const t = { at: clockMs + ms, fn }; pending.push(t); return t; }, clearTimeout: (h) => { const i = pending.indexOf(h as never); if (i >= 0) pending.splice(i, 1); } };
  const root = document.createElement('div');
  const deps: AppDeps = { root, buildId: 'b1', audio, timers, now: () => new Date(clockMs), reload: () => { reloads++; }, fetchState: async () => { if (next instanceof Error) throw next; return next; } };
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
    expect(r.root.dataset.planes).toBe('a');
    r.set(state(['c'])); await r.app.pollNow();
    expect(r.root.dataset.stale).toBe('false');
    expect(r.root.dataset.planes).toBe('c');
  });
  it('shows a server-flagged stale scene immediately', async () => {
    const r = rig(state(['a'])); await r.flush();
    r.set(state(['a'], { stale: true })); await r.app.pollNow();
    expect(r.root.dataset.stale).toBe('true');
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
});
