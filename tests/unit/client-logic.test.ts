import { describe, expect, it } from 'vitest';
import { backoffMs, reloadDue, staleSince, toScreenProps, tapTarget } from '../../src/client/app/logic';
import type { SceneState } from '../../src/shared/state';
import { renderScreen } from '../../src/client/ui';

describe('backoffMs (capped exponential, ADR 0008)', () => {
  it('uses the normal cadence without failures and doubles up to the cap', () => {
    expect(backoffMs(0, 10_000)).toBe(10_000);
    expect(backoffMs(1, 10_000)).toBe(20_000);
    expect(backoffMs(2, 10_000)).toBe(40_000);
    expect(backoffMs(3, 10_000)).toBe(60_000);
    expect(backoffMs(9, 10_000)).toBe(60_000);
  });
});

describe('reloadDue (nightly reload via injectable clock)', () => {
  it('is due once after the configured local time each day', () => {
    expect(reloadDue(new Date(2026, 9, 27, 3, 59), '04:00', null).due).toBe(false);
    const r = reloadDue(new Date(2026, 9, 27, 4, 0), '04:00', null);
    expect(r.due).toBe(true);
    expect(reloadDue(new Date(2026, 9, 27, 12, 0), '04:00', r.day).due).toBe(false);
    expect(reloadDue(new Date(2026, 9, 28, 4, 1), '04:00', r.day).due).toBe(true);
  });
  it('does not reload at startup times before reloadAt on the first day when the page loaded after it', () => {
    expect(reloadDue(new Date(2026, 9, 27, 9, 0), '04:00', '2026-10-27').due).toBe(false);
  });
});

const state = (o: Partial<SceneState> = {}): SceneState => ({ buildId: 'b', serverTime: 0, stale: false, lastSuccessAt: 0, place: 'Test', clock: '10:08', sky: { time: 'day', weather: 'clear' }, planes: [], client: { pollIntervalSeconds: 10, staleAfterMinutes: 5, reloadAt: '04:00', speechWatchdogSeconds: 60 }, ...o });

describe('staleSince', () => {
  it('shows nothing for a fresh scene', () => { expect(staleSince(state(), 0, 1000)).toBeUndefined(); });
  it('marks a server-flagged stale scene immediately with the time of the last good data', () => {
    expect(staleSince(state({ stale: true }), 0, 1000)).toEqual({ since: '10:08' });
  });
  it('marks the scene stale when the server itself was unreachable for longer than the threshold', () => {
    expect(staleSince(state(), 5 * 60_000 + 1, 5 * 60_000)).toEqual({ since: '10:08' });
    expect(staleSince(state(), 5 * 60_000 - 1, 5 * 60_000)).toBeUndefined();
  });
});

describe('toScreenProps -> design-system screen', () => {
  it('empty sky shows the "Zuletzt" bar, two planes show two rows, stale turns the Kopfzeile into "Letzter Stand"', () => {
    const f = { operator: 'Lufthansa', callsign: 'DLH400', aircraft: 'Airbus A320neo', registration: '', route: null, altitudeM: 11000, speedKmh: 800, phase: 'level' as const };
    const sp = (id: string) => ({ icao24: id, plane: { type: 'narrowbody' as const, livery: 'def' }, flight: f, speech: { text: 't', audioUrl: '/audio/x.wav' } });
    const empty = renderScreen(toScreenProps(state({ recent: 'Zuletzt: Lufthansa DLH400 · vor 6 Min' }), undefined));
    expect(empty.dataset.state).toBe('empty');
    expect(empty.querySelector('.pa-bar-recent')?.textContent).toContain('vor 6 Min');
    const two = renderScreen(toScreenProps(state({ planes: [sp('a'), sp('b')] }), { since: '10:08' }));
    expect(two.dataset.state).toBe('two');
    expect(two.querySelectorAll('.pa-info-row')).toHaveLength(2);
    expect(two.querySelector('.pa-scene-header')?.textContent).toContain('Letzter Stand · 10:08');
    expect(empty.querySelector('.pa-scene-header')?.textContent).toContain('Live · 10:08');
    expect(document.querySelector('.pa-stale-notice')).toBeNull();
    expect(two.querySelector('.pa-plane')?.getAttribute('data-livery')).toBe('def');
  });
});

describe('tapTarget (which plane was tapped)', () => {
  const rect = (l: number, t: number, w: number, h: number) => ({ left: l, top: t, right: l + w, bottom: t + h });
  it('single plane: any tap on the plane or the bar', () => {
    expect(tapTarget(1, { x: 50, y: 50 }, [rect(0, 0, 100, 100)], [rect(0, 100, 200, 50)])).toBe(0);
    expect(tapTarget(1, { x: 50, y: 120 }, [rect(0, 0, 100, 100)], [rect(0, 100, 200, 50)])).toBe(0);
  });
  it('two planes: the tapped plane silhouette or info row picks plane 1 or 2', () => {
    const planes = [rect(0, 0, 100, 100), rect(120, 40, 80, 60)];
    const rows = [rect(0, 100, 200, 25), rect(0, 125, 200, 25)];
    expect(tapTarget(2, { x: 10, y: 10 }, planes, rows)).toBe(0);
    expect(tapTarget(2, { x: 150, y: 60 }, planes, rows)).toBe(1);
    expect(tapTarget(2, { x: 10, y: 110 }, planes, rows)).toBe(0);
    expect(tapTarget(2, { x: 10, y: 140 }, planes, rows)).toBe(1);
  });
  it('nothing for taps on the empty sky or with no planes', () => {
    expect(tapTarget(2, { x: 190, y: 10 }, [rect(0, 0, 100, 100), rect(120, 40, 80, 60)], [])).toBeUndefined();
    expect(tapTarget(0, { x: 1, y: 1 }, [], [])).toBeUndefined();
  });
});
