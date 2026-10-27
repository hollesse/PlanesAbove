import { describe, expect, it } from 'vitest';
import { Narrator, type AudioLike } from '../../src/client/app/narrator';
import { VorleseSperre, type Timers } from '../../src/client/app/sperre';

class FakeAudio implements AudioLike {
  src = ''; played = 0; playResult: Promise<void> | void = undefined;
  private l = new Map<string, Set<() => void>>();
  play() { this.played++; return this.playResult; }
  pause() {}
  addEventListener(e: string, fn: () => void) { (this.l.get(e) ?? this.l.set(e, new Set()).get(e)!).add(fn); }
  removeEventListener(e: string, fn: () => void) { this.l.get(e)?.delete(fn); }
  emit(e: string) { [...(this.l.get(e) ?? [])].forEach((f) => f()); }
}
const timers = (): Timers & { last?: number } => { const t: Timers & { last?: number } = { setTimeout: (_fn, ms) => { t.last = ms; return 1; }, clearTimeout: () => {} }; return t; };
function rig() {
  const audio = new FakeAudio(); const t = timers(); const applied: string[] = [];
  const sperre = new VorleseSperre<string>((s) => applied.push(s), t);
  return { audio, t, applied, sperre, narrator: new Narrator({ audio, sperre, watchdogSeconds: 60 }) };
}

describe('Narrator (<audio> + Vorlese-Sperre)', () => {
  it('plays the URL synchronously inside the tap and locks the scene', () => {
    const { audio, narrator, sperre } = rig();
    narrator.speak('/audio/x.wav');
    expect(audio.src).toBe('/audio/x.wav');
    expect(audio.played).toBe(1);
    expect(sperre.locked).toBe(true);
  });
  it('releases the lock when playback ends and shows the buffered selection', () => {
    const { audio, narrator, sperre, applied } = rig();
    narrator.speak('/a.wav'); sperre.submit('B');
    expect(applied).toEqual([]);
    audio.emit('ended');
    expect(sperre.locked).toBe(false);
    expect(applied).toEqual(['B']);
  });
  it.each(['error', 'stalled'])('releases the lock on %s so a failure never holds the scene', (ev) => {
    const { audio, narrator, sperre } = rig();
    narrator.speak('/a.wav'); audio.emit(ev);
    expect(sperre.locked).toBe(false);
  });
  it('releases when play() is rejected (e.g. no audio / blocked)', async () => {
    const { audio, narrator, sperre } = rig();
    audio.playResult = Promise.reject(new Error('NotAllowedError'));
    narrator.speak('/a.wav');
    await Promise.resolve(); await Promise.resolve();
    expect(sperre.locked).toBe(false);
  });
  it('ignores a second tap while narrating', () => {
    const { audio, narrator } = rig();
    narrator.speak('/a.wav'); narrator.speak('/b.wav');
    expect(audio.played).toBe(1);
    expect(audio.src).toBe('/a.wav');
  });
  it('watchdog: known duration plus margin, else the configured default', () => {
    const a = rig(); a.narrator.speak('/a.wav', 4000);
    expect(a.t.last).toBe(4000 + 5000);
    const b = rig(); b.narrator.speak('/a.wav');
    expect(b.t.last).toBe(60_000);
  });
  it('can narrate again after the previous playback ended', () => {
    const { audio, narrator } = rig();
    narrator.speak('/a.wav'); audio.emit('ended'); narrator.speak('/b.wav');
    expect(audio.played).toBe(2);
    expect(audio.src).toBe('/b.wav');
  });
});
