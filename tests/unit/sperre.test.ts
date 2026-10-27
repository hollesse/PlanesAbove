import { describe, expect, it } from 'vitest';
import { VorleseSperre, type Timers } from '../../src/client/app/sperre';

function fakeTimers() {
  let t = 0; let id = 0; const pending = new Map<number, { at: number; fn: () => void }>();
  const timers: Timers = { setTimeout: (fn, ms) => { pending.set(++id, { at: t + ms, fn }); return id; }, clearTimeout: (h) => { pending.delete(h as number); } };
  return { timers, advance(ms: number) { t += ms; for (const [k, v] of [...pending]) if (v.at <= t) { pending.delete(k); v.fn(); } }, count: () => pending.size };
}

describe('VorleseSperre (Vorlese-Sperre, ADR 0004/0012)', () => {
  it('applies a submitted selection immediately while unlocked', () => {
    const applied: string[] = [];
    new VorleseSperre<string>((s) => applied.push(s), fakeTimers().timers).submit('A');
    expect(applied).toEqual(['A']);
  });
  it('holds back a newer selection while audio plays and applies only the latest after release', () => {
    const applied: string[] = []; const s = new VorleseSperre<string>((x) => applied.push(x), fakeTimers().timers);
    s.submit('A'); s.lock(60_000);
    s.submit('B'); s.submit('C');
    expect(applied).toEqual(['A']);
    s.release();
    expect(applied).toEqual(['A', 'C']);
    expect(s.locked).toBe(false);
  });
  it('release without a buffered selection applies nothing', () => {
    const applied: string[] = []; const s = new VorleseSperre<string>((x) => applied.push(x), fakeTimers().timers);
    s.submit('A'); s.lock(1000); s.release();
    expect(applied).toEqual(['A']);
  });
  it('the watchdog frees a hanging playback', () => {
    const f = fakeTimers(); const applied: string[] = []; const s = new VorleseSperre<string>((x) => applied.push(x), f.timers);
    s.lock(60_000); s.submit('B');
    f.advance(59_999); expect(s.locked).toBe(true);
    f.advance(1);
    expect(s.locked).toBe(false);
    expect(applied).toEqual(['B']);
  });
  it('a normal release cancels the watchdog and a second release is harmless', () => {
    const f = fakeTimers(); const s = new VorleseSperre<string>(() => {}, f.timers);
    s.lock(60_000); s.release(); s.release();
    expect(f.count()).toBe(0);
  });
  it('whenFree runs actions (e.g. a page reload) now if unlocked, otherwise after release', () => {
    const s = new VorleseSperre<string>(() => {}, fakeTimers().timers); const ran: string[] = [];
    s.whenFree(() => ran.push('now'));
    s.lock(1000); s.whenFree(() => ran.push('later'));
    expect(ran).toEqual(['now']);
    s.release();
    expect(ran).toEqual(['now', 'later']);
  });
});
