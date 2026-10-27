// RouteSource over the offline VRS standing-data snapshot (ADR 0014): in-memory index callsign -> airports, no HTTP per lookup.
import fs from 'node:fs';
import path from 'node:path';
import type { Scheduler, Cancel } from '../../../clock';
import type { Logger } from '../../../logger';
import type { Airport, Route, RouteSource } from '../model';
import type { Fetch } from './http';
import { parseCsv } from './vrs-csv';
import { downloadSnapshot, FETCHED_AT_FILE, recoverSnapshot, snapshotPaths } from './vrs-snapshot';

interface Index { routes: Map<string, string[]>; airports: Map<string, Airport> }

function* csvFiles(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* csvFiles(p);
    else if (e.name.endsWith('.csv')) yield p;
  }
}

/** Builds the index from the snapshot tree; broken rows/files are skipped, never fatal. Returns null when there is no snapshot. */
export function loadIndex(root: string): Index | null {
  const routesDir = path.join(root, 'routes', 'schema-01');
  const airportsDir = path.join(root, 'airports', 'schema-01');
  if (!fs.existsSync(routesDir) || !fs.existsSync(airportsDir)) return null;
  const routes = new Map<string, string[]>();
  const airports = new Map<string, Airport>();
  const rows = (file: string): string[][] => { try { return parseCsv(fs.readFileSync(file, 'utf8')).slice(1); } catch { return []; } };
  for (const f of csvFiles(routesDir)) {
    for (const r of rows(f)) {
      const callsign = r[0]?.trim().toUpperCase();
      const codes = r[4]?.split('-').map((c) => c.trim().toUpperCase()).filter(Boolean);
      if (callsign && codes && codes.length >= 2) routes.set(callsign, codes);
    }
  }
  for (const f of csvFiles(airportsDir)) {
    for (const r of rows(f)) {
      const icao = r[2]?.trim().toUpperCase();
      const lat = Number(r[6]);
      const lon = Number(r[7]);
      if (!icao || !r[6] || !r[7] || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      airports.set(icao, { name: r[1] || icao, city: r[4] || r[1] || icao, lat, lon });
    }
  }
  return { routes, airports };
}

export class VrsRouteSource implements RouteSource {
  readonly name = 'vrs';
  private index: Index | null = null;
  private refreshing: Promise<boolean> | null = null;
  constructor(private readonly o: { fetch: Fetch; dataDir: string; userAgent: string; timeoutMs: number; clock: Scheduler; log: Logger; refreshMs: number; url?: string }) {}

  /** Loads an existing snapshot (warn if none), starts a background refresh when none/stale, then refreshes every `refreshMs`. */
  start(): Cancel {
    const p = snapshotPaths(this.o.dataDir);
    recoverSnapshot(p);
    this.load();
    if (!this.index) this.o.log.warn('route snapshot missing: all routes unknown until the first download succeeds', { dir: p.root });
    if (!this.index || this.isStale(p.root)) void this.refresh();
    return this.o.clock.every(this.o.refreshMs, () => { void this.refresh(); });
  }

  /** Downloads and swaps the snapshot, then rebuilds the index. A failure logs `warn` and keeps the current index. */
  refresh(): Promise<boolean> {
    this.refreshing ??= (async () => {
      try {
        await downloadSnapshot({ fetch: this.o.fetch, dataDir: this.o.dataDir, userAgent: this.o.userAgent, timeoutMs: this.o.timeoutMs, now: this.o.clock.now(), url: this.o.url });
        this.load();
        this.o.log.info('route snapshot refreshed', { routes: this.index?.routes.size ?? 0 });
        return true;
      } catch (e) {
        this.o.log.warn('route snapshot refresh failed, keeping previous index', { errorClass: (e as { errorClass?: string }).errorClass ?? 'internal', detail: (e as Error).message });
        return false;
      } finally { this.refreshing = null; }
    })();
    return this.refreshing;
  }

  private load(): void {
    const idx = loadIndex(snapshotPaths(this.o.dataDir).root);
    if (idx) this.index = idx;
  }

  private isStale(root: string): boolean {
    try { return this.o.clock.now() - Number(fs.readFileSync(path.join(root, FETCHED_AT_FILE), 'utf8')) >= this.o.refreshMs; } catch { return true; }
  }

  async lookup(callsign: string): Promise<Route | null> {
    const codes = this.index?.routes.get(callsign.trim().toUpperCase());
    if (!codes) return null;
    const legs: Airport[] = [];
    for (const c of codes) { const a = this.index?.airports.get(c); if (!a) return null; legs.push(a); }
    return { from: legs[0], to: legs[legs.length - 1], legs };
  }
}
