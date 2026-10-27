// Injectable clock (ADR 0004): all time-dependent server code takes a Clock/Scheduler; mock mode and tests use FakeClock.
export interface Clock { now(): number }

export interface Cancel { (): void }

export interface Scheduler extends Clock {
  /** Run `fn` every `ms` (first run after `ms`). The returned function cancels it. */
  every(ms: number, fn: () => void | Promise<void>): Cancel;
}

export class SystemClock implements Scheduler {
  now = (): number => Date.now();
  every(ms: number, fn: () => void | Promise<void>): Cancel {
    const t = setInterval(() => { void fn(); }, ms);
    return () => clearInterval(t);
  }
}

/** Manually advanced clock: `advance(ms)` runs every due timer in time order and awaits async callbacks. */
export class FakeClock implements Scheduler {
  private t: number;
  private timers: { at: number; every: number; fn: () => void | Promise<void>; live: boolean }[] = [];
  constructor(startMs: number) { this.t = startMs; }
  now = (): number => this.t;
  every(ms: number, fn: () => void | Promise<void>): Cancel {
    const timer = { at: this.t + ms, every: ms, fn, live: true };
    this.timers.push(timer);
    return () => { timer.live = false; this.timers = this.timers.filter((x) => x !== timer); };
  }
  async advance(ms: number): Promise<void> {
    const target = this.t + ms;
    for (;;) {
      const due = this.timers.filter((x) => x.live && x.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      this.t = due.at;
      due.at += due.every;
      await due.fn();
    }
    this.t = target;
  }
}
