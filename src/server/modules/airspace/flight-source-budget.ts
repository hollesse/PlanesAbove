// Persisted daily request budget for a rate-limited flight source (adsb.lol, airspace-b9r4w; ADR 0019 `blockFor` hook).
// Requests are events in flight_source_calls (migration 0005); the day is the UTC day. The server's own
// `x-ratelimit-remaining` can only raise consumption ("higher consumption wins").
import type { Clock } from '../../clock';
import type { Db } from '../../db';

const DAY_MS = 86_400_000;
export const utcDayStart = (ms: number): number => Math.floor(ms / DAY_MS) * DAY_MS;

export interface BudgetStatus { used: number; cap: number; remaining: number; resetsAt: number }

export class DailyRequestBudget {
  /** Called when the cap is reached, with the ms until 00:00 UTC (wired to FlightSourceChain.blockFor). */
  onExhausted?: (msUntilReset: number) => void;
  private floorDay = -1;
  private floorUsed = 0;

  constructor(private readonly d: { db: Db; clock: Clock; source: string; cap: number }) {
    d.db.prepare('DELETE FROM flight_source_calls WHERE source = ? AND ts < ?').run(d.source, utcDayStart(d.clock.now()) - DAY_MS);
  }

  private countToday(): number {
    return (this.d.db.prepare('SELECT COUNT(*) AS n FROM flight_source_calls WHERE source = ? AND ts >= ?').get(this.d.source, utcDayStart(this.d.clock.now())) as { n: number }).n;
  }
  status(): BudgetStatus {
    const now = this.d.clock.now();
    const day = utcDayStart(now);
    const used = Math.max(this.countToday(), this.floorDay === day ? this.floorUsed : 0);
    return { used, cap: this.d.cap, remaining: Math.max(0, this.d.cap - used), resetsAt: day + DAY_MS };
  }
  exhausted(): boolean { return this.status().remaining <= 0; }

  /** Count one request; blocks the source when the cap is now reached. */
  record(status: number | null, headerRemaining?: number): void {
    this.d.db.prepare('INSERT INTO flight_source_calls (source, ts, status) VALUES (?,?,?)').run(this.d.source, this.d.clock.now(), status);
    if (headerRemaining !== undefined && Number.isFinite(headerRemaining)) this.adopt(headerRemaining);
    this.checkExhausted();
  }
  /** Adopt the server's `x-ratelimit-remaining` if it is lower than our own computed remaining. */
  adopt(headerRemaining: number): void {
    const s = this.status();
    if (headerRemaining < s.remaining) { this.floorDay = utcDayStart(this.d.clock.now()); this.floorUsed = this.d.cap - Math.max(0, headerRemaining); }
  }
  /** Call at start: a counter persisted as exhausted blocks the source straight away. */
  checkExhausted(): void {
    const s = this.status();
    if (s.remaining <= 0) this.onExhausted?.(s.resetsAt - this.d.clock.now());
  }
}
