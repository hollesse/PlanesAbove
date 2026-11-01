// Sichtungen je Airline x Typklasse (read-only, ADR 0033). Self-contained like livery-stats.ts: no runtime imports, erasable syntax only.
// Counts every shown sighting (slot IS NOT NULL) in the window regardless of livery_present; light-aircraft / glider are excluded.

export interface StatsDb { prepare(sql: string): { all(...p: unknown[]): unknown[] } }
export type StandortFilter = number | 'unbekannt' | 'alle';
export interface SightingSample { icao24: string; registration: string | null; callsign: string | null; lastSeenMs: number }
export interface SightingsByClassRow { prefix: string; airline: string | null; typklasse: string; count: number; lastSeenMs: number; samples: SightingSample[] }
export interface SightingsByClass { days: number; standort: StandortFilter; rows: SightingsByClassRow[] }

const prefixOf = (callsign: string | null): string => (callsign && /^[A-Z]{3}[0-9]/.test(callsign) ? callsign.slice(0, 3) : '?');
const MAX_SAMPLES = 3;

/** Same Standort semantics as liveryStats; `hasPoints` false = database from before migration 0006. */
export function sightingsByClass(db: StatsDb, opts: { days: number; nowMs: number; standort?: StandortFilter; hasPoints?: boolean }): SightingsByClass {
  const since = opts.nowMs - opts.days * 86_400_000;
  const hasPoints = opts.hasPoints ?? true;
  let standort: StandortFilter = opts.standort ?? 'alle';
  if (opts.standort === undefined && hasPoints) {
    const newest = db.prepare('SELECT observation_point_id AS pid FROM sightings ORDER BY last_seen_ms DESC, id DESC LIMIT 1').all() as { pid: number | null }[];
    standort = newest.length === 0 ? 'alle' : newest[0].pid === null ? 'unbekannt' : newest[0].pid;
  } else if (opts.standort === undefined) standort = 'unbekannt';
  const pidCol = hasPoints ? 's.observation_point_id' : 'NULL';
  const filterSql = standort === 'alle' ? '' : standort === 'unbekannt' ? ` AND ${pidCol} IS NULL` : ` AND ${pidCol} = ${Number(standort)}`;

  const found = db.prepare(`SELECT s.icao24, s.callsign, s.airline, s.typklasse, s.last_seen_ms AS lastSeenMs FROM sightings s WHERE s.slot IS NOT NULL AND s.last_seen_ms >= ? AND s.typklasse NOT IN ('light-aircraft', 'glider')${filterSql} ORDER BY s.last_seen_ms DESC, s.id DESC`).all(since) as { icao24: string; callsign: string | null; airline: string | null; typklasse: string; lastSeenMs: number }[];

  // rows arrive newest first: the first sighting of a group gives lastSeenMs, and the first non-null airline is the most recent name
  const groups = new Map<string, SightingsByClassRow>();
  for (const r of found) {
    const prefix = prefixOf(r.callsign);
    const key = `${prefix}\u0000${r.typklasse}`;
    let g = groups.get(key);
    if (!g) { g = { prefix, airline: null, typklasse: r.typklasse, count: 0, lastSeenMs: r.lastSeenMs, samples: [] }; groups.set(key, g); }
    g.count++;
    if (g.airline === null) g.airline = r.airline;
    // the sightings table does not store a registration yet; the field stays in the contract (ADR 0033)
    if (g.samples.length < MAX_SAMPLES) g.samples.push({ icao24: r.icao24, registration: null, callsign: r.callsign, lastSeenMs: r.lastSeenMs });
  }
  return {
    days: opts.days,
    standort,
    rows: [...groups.values()].sort((a, b) => b.count - a.count || b.lastSeenMs - a.lastSeenMs || a.prefix.localeCompare(b.prefix) || a.typklasse.localeCompare(b.typklasse)),
  };
}
