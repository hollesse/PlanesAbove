// The airspace BC's own call-event log for FlightAware AeroAPI (ADR 0018, table flightaware_calls from migration 0004).
// Every call, successful or not, is one row; the budget is derived from these events, not from a counter.
import type { Db } from '../../db';

export interface FlightAwareCall { ts: number; endpoint: 'flights' | 'usage'; status: number | null; resultSets: number; costUsd: number }

export class FlightAwareCallLog {
  constructor(private readonly db: Db) {}
  record(c: FlightAwareCall): void {
    this.db.prepare('INSERT INTO flightaware_calls (ts, endpoint, status, result_sets, cost_usd) VALUES (?,?,?,?,?)').run(c.ts, c.endpoint, c.status, c.resultSets, c.costUsd);
  }
  /** Own cost in USD of calls at or after `sinceMs`. */
  costSince(sinceMs: number): number {
    return (this.db.prepare('SELECT COALESCE(SUM(cost_usd), 0) AS v FROM flightaware_calls WHERE ts >= ?').get(sinceMs) as { v: number }).v;
  }
  resultSetsSince(sinceMs: number): number {
    return (this.db.prepare('SELECT COALESCE(SUM(result_sets), 0) AS v FROM flightaware_calls WHERE ts >= ?').get(sinceMs) as { v: number }).v;
  }
  /** Housekeeping: drop events before the current billing period. */
  pruneBefore(ms: number): void { this.db.prepare('DELETE FROM flightaware_calls WHERE ts < ?').run(ms); }
  count(): number { return (this.db.prepare('SELECT COUNT(*) AS n FROM flightaware_calls').get() as { n: number }).n; }
}
