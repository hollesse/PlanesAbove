// RouteSource over FlightAware AeroAPI (ADR 0018): budgeted, opt-in, last-resort and filtered. The only paid source.
// The API key is handed in by the composition root from the environment (ADR 0007); it is never logged and never part of an error message.
import type { Cancel, Scheduler } from '../../../clock';
import type { Logger } from '../../../logger';
import type { FlightAwareCallLog } from '../flightaware-call-log';
import { SourceError, type Airport, type LatLon, type LookupContext, type Route, type RouteSource } from '../model';
import type { Fetch } from './http';

const BASE = 'https://aeroapi.flightaware.com/aeroapi';
const DAY_MS = 86_400_000;
/** One result set (one page, max_pages=1) costs this much on the Personal tier. */
export const COST_PER_RESULT_SET_USD = 0.005;
/** Typklassen from narrowbody upwards; everything else is never asked (ADR 0018). */
export const PAID_LOOKUP_CLASSES: readonly string[] = ['narrowbody', 'widebody', 'jumbo-hump', 'double-decker'];

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);
const iso = (ms: number): string => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

/** Start of the billing period containing `nowMs` (UTC, day `startDay` 1..28 at 00:00). */
export function periodStart(nowMs: number, startDay: number): number {
  const d = new Date(nowMs);
  let y = d.getUTCFullYear(), m = d.getUTCMonth();
  if (d.getUTCDate() < startDay) { m -= 1; if (m < 0) { m = 11; y -= 1; } }
  return Date.UTC(y, m, startDay);
}

/** Pick the flight: one in the air (actual_off set, actual_on null), else the most recent actual_off. Flights that never departed are ignored. */
export function pickFlight(flights: unknown): Record<string, unknown> | null {
  if (!Array.isArray(flights)) return null;
  const departed = flights.map(obj).filter((f): f is Record<string, unknown> => f !== null && typeof f.actual_off === 'string').sort((a, b) => Date.parse(b.actual_off as string) - Date.parse(a.actual_off as string));
  return departed.find((f) => f.actual_on == null) ?? departed[0] ?? null;
}

function toAirport(v: unknown): Airport | null {
  const a = obj(v);
  if (!a) return null;
  const icao = str(a.code_icao) ?? str(a.code);
  const city = str(a.city) ?? str(a.name) ?? icao;
  if (!city) return null;
  const iata = str(a.code_iata);
  return { name: str(a.name) ?? city, city, ...(icao && { icao }), ...(iata && { iata }) };
}

/** Route of a chosen flight; null for "no flight plan" (position_only) or a missing end. */
export function flightToRoute(f: Record<string, unknown> | null): Route | null {
  if (!f || f.position_only === true) return null;
  const from = toAirport(f.origin), to = toAirport(f.destination);
  if (!from || !to) return null;
  return { from, to, legs: [from, to], source: 'flightaware' };
}

export interface FlightAwareOptions {
  fetch: Fetch;
  apiKey: string;
  clock: Scheduler;
  log: Logger;
  calls: FlightAwareCallLog;
  timeoutMs: number;
  monthlyBudgetUsd: number;
  monthlyRequestCap: number;
  usageSyncMinutes: number;
  usageLagMinutes: number;
  billingPeriodStartDay: number;
  baseUrl?: string;
}

export class FlightAwareRouteSource implements RouteSource {
  readonly name = 'flightaware';
  readonly lastResort = true;
  private blocked = false;
  private sync: { periodStart: number; totalCost: number } | null = null;
  private warnedPeriod: number | null = null;
  constructor(private readonly o: FlightAwareOptions) {}

  /** Usage-sync at startup (the adapter stays closed if it fails), then every `usageSyncMinutes`. */
  async start(): Promise<Cancel> {
    await this.syncUsage();
    return this.o.clock.every(this.o.usageSyncMinutes * 60_000, () => { void this.syncUsage(); });
  }

  /** GET /account/usage for the current period (0 USD). Returns whether it succeeded. Never throws. */
  async syncUsage(): Promise<boolean> {
    if (this.blocked) return false;
    const now = this.o.clock.now();
    const ps = periodStart(now, this.o.billingPeriodStartDay);
    const r = await this.request('usage', `/account/usage?start=${encodeURIComponent(iso(ps))}&end=${encodeURIComponent(iso(now))}`, 0);
    if (r.status !== 200) { this.o.log.warn('flightaware usage sync failed', { status: r.status }); return false; }
    try {
      const total = Number(obj(JSON.parse(r.body))?.total_cost);
      if (!Number.isFinite(total) || total < 0) throw new Error('no total_cost');
      this.sync = { periodStart: ps, totalCost: total };
      return true;
    } catch {
      this.o.log.warn('flightaware usage sync failed', { reason: 'unparseable response' });
      return false;
    }
  }

  /** Estimated spend of the current period: max(own events, last sync total + own events of the lag window). */
  estimateUsd(now = this.o.clock.now()): number {
    const ps = periodStart(now, this.o.billingPeriodStartDay);
    const own = this.o.calls.costSince(ps);
    const lag = this.o.calls.costSince(Math.max(ps, now - this.o.usageLagMinutes * 60_000));
    const synced = this.sync && this.sync.periodStart === ps ? this.sync.totalCost + lag : 0;
    return Math.round(Math.max(own, synced) * 1e6) / 1e6;
  }

  eligible(ctx?: LookupContext): boolean {
    if (this.blocked || !this.sync) return false;
    if (!ctx || !ctx.airlineKnown || !PAID_LOOKUP_CLASSES.includes(ctx.typklasse)) return false;
    const now = this.o.clock.now();
    const ps = periodStart(now, this.o.billingPeriodStartDay);
    this.o.calls.pruneBefore(ps);
    const micro = (v: number): number => Math.round(v * 1e6);
    const within = micro(this.estimateUsd(now) + COST_PER_RESULT_SET_USD) < micro(this.o.monthlyBudgetUsd) && this.o.calls.resultSetsSince(ps) < this.o.monthlyRequestCap;
    if (!within && this.warnedPeriod !== ps) {
      this.warnedPeriod = ps;
      this.o.log.warn('flightaware budget exhausted, no paid lookups until the next billing period', { periodStart: iso(ps), estimatedUsd: this.estimateUsd(now), monthlyBudgetUsd: this.o.monthlyBudgetUsd, monthlyRequestCap: this.o.monthlyRequestCap });
    }
    return within;
  }

  async lookup(callsign: string, _position?: LatLon, ctx?: LookupContext): Promise<Route | null> {
    if (!this.eligible(ctx)) throw new SourceError('unavailable', 'flightaware not eligible');
    const now = this.o.clock.now();
    const path = `/flights/${encodeURIComponent(callsign.trim().toUpperCase())}?ident_type=designator&max_pages=1&start=${encodeURIComponent(iso(now - DAY_MS))}&end=${encodeURIComponent(iso(now + DAY_MS))}`;
    const r = await this.request('flights', path, COST_PER_RESULT_SET_USD);
    if (r.status === 401 || r.status === 403) throw new SourceError('http-403', `HTTP ${r.status}`);
    if (r.status === 429) throw new SourceError('http-429');
    if (r.status === null) throw new SourceError(r.timedOut ? 'timeout' : 'network', 'flightaware request failed');
    if (r.status >= 500) throw new SourceError('http-5xx', `HTTP ${r.status}`);
    if (r.status !== 200) throw new SourceError('http-4xx', `HTTP ${r.status}`);
    let body: unknown;
    try { body = JSON.parse(r.body); } catch { throw new SourceError('parse', 'flightaware: invalid JSON'); }
    return flightToRoute(pickFlight(obj(body)?.flights));
  }

  /** One HTTP call, logged as exactly one event. Cost applies to a 200 only; 401/403 permanently close the adapter until restart. Never throws. */
  private async request(endpoint: 'flights' | 'usage', path: string, costOnOk: number): Promise<{ status: number | null; body: string; timedOut: boolean }> {
    let status: number | null = null, body = '', timedOut = false;
    try {
      const res = await this.o.fetch((this.o.baseUrl ?? BASE) + path, { headers: { 'x-apikey': this.o.apiKey, Accept: 'application/json' }, signal: AbortSignal.timeout(this.o.timeoutMs) });
      status = res.status;
      body = await res.text();
    } catch (e) {
      const n = (e as { name?: string }).name;
      timedOut = n === 'TimeoutError' || n === 'AbortError';
    }
    const ok = status === 200;
    this.o.calls.record({ ts: this.o.clock.now(), endpoint, status, resultSets: ok && endpoint === 'flights' ? 1 : 0, costUsd: ok ? costOnOk : 0 });
    if (status === 401 || status === 403) {
      if (!this.blocked) this.o.log.error('flightaware rejected the credentials, adapter disabled until restart', { status });
      this.blocked = true;
    }
    return { status, body, timedOut };
  }
}
