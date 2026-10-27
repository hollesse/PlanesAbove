// Vorlese-Sperre (ADR 0004/0012): while a narration plays, the scene does not change; the newest state is buffered and applied after it ends.
export interface Timers { setTimeout(fn: () => void, ms: number): unknown; clearTimeout(handle: unknown): void }

export class VorleseSperre<T> {
  private isLocked = false;
  private buffered: { value: T } | undefined;
  private watchdog: unknown;
  private afterRelease: (() => void)[] = [];

  constructor(private readonly apply: (state: T) => void, private readonly timers: Timers) {}

  get locked(): boolean { return this.isLocked; }

  /** A freshly polled state: shown now, or buffered (only the latest) while locked. */
  submit(state: T): void {
    if (this.isLocked) this.buffered = { value: state };
    else this.apply(state);
  }

  /** Start of playback. The watchdog releases the lock if no end event ever arrives. */
  lock(watchdogMs: number): void {
    if (this.watchdog !== undefined) this.timers.clearTimeout(this.watchdog);
    this.isLocked = true;
    this.watchdog = this.timers.setTimeout(() => this.release(), watchdogMs);
  }

  /** End (or failure) of playback: free the lock, show the buffered state, run deferred actions. */
  release(): void {
    if (this.watchdog !== undefined) { this.timers.clearTimeout(this.watchdog); this.watchdog = undefined; }
    if (!this.isLocked) return;
    this.isLocked = false;
    const pending = this.buffered;
    this.buffered = undefined;
    if (pending) this.apply(pending.value);
    const actions = this.afterRelease;
    this.afterRelease = [];
    for (const a of actions) a();
  }

  /** Run `fn` now, or after the current narration ends (reload safety, ADR 0008). */
  whenFree(fn: () => void): void {
    if (this.isLocked) this.afterRelease.push(fn);
    else fn();
  }
}
