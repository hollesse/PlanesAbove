// Shared preparation for the route/livery statistics, used by the CLI scripts and the HTTP endpoints (no sibling imports: scripts load this via Node type stripping).
export type StandortFilter = number | 'unbekannt' | 'alle';
export interface PrepDb { prepare(sql: string): { get(...p: unknown[]): unknown; all(...p: unknown[]): unknown[] } }

/** Validates the shared `days` / `standort` inputs (raw strings, as typed on a command line or in a query string). */
export function parseStatsParams(raw: { days?: string | null; standort?: string | null }): { ok: true; days: number; standort?: StandortFilter } | { ok: false; error: string } {
  const days = Number(raw.days ?? '7');
  if (raw.days === '' || !Number.isFinite(days) || days <= 0) return { ok: false, error: 'days must be a positive number' };
  let standort: StandortFilter | undefined;
  if (raw.standort !== undefined && raw.standort !== null) {
    if (raw.standort === 'alle' || raw.standort === 'unbekannt') standort = raw.standort;
    else if (/^[0-9]+$/.test(raw.standort)) standort = Number(raw.standort);
    else return { ok: false, error: 'standort must be an observation point id, "unbekannt" or "alle"' };
  }
  return { ok: true, days, standort };
}

/** Table-presence checks: `sightings` is required; `route_lookups` / `observation_points` degrade gracefully. */
export function inspectStatsDb(db: PrepDb): { ok: true; hasLookups: boolean; hasPoints: boolean; routeDb: PrepDb } | { ok: false; error: string } {
  const has = (name: string): boolean => Boolean(db.prepare('SELECT 1 FROM sqlite_master WHERE name = ?').get(name));
  if (!has('sightings')) return { ok: false, error: 'not a PlanesAbove database (no sightings table)' };
  const hasLookups = has('route_lookups');
  const routeDb: PrepDb = hasLookups ? db : { prepare: (sql) => (sql.includes('route_lookups') ? { get: () => undefined, all: () => [] } : db.prepare(sql)) };
  return { ok: true, hasLookups, hasPoints: has('observation_points'), routeDb };
}
