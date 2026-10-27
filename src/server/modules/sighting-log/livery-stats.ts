// Lackierungs-Statistik (read-only evaluation of the sighting log). Self-contained on purpose: scripts/stats-liveries.mjs imports this file
// directly via Node's type stripping, so it must not import anything at runtime and use erasable syntax only.
// Only sightings that were shown (slot IS NOT NULL) count; light-aircraft / glider never have a livery (ADR 0009) and are excluded.

export interface StatsDb { prepare(sql: string): { all(...p: unknown[]): unknown[] } }

export interface LiveryAirlineStat { name: string; prefix: string; count: number; byTypklasse: Record<string, number> }
export interface UnmappedPrefixStat { prefix: string; count: number }
export interface StandortStat { id: number | null; place: string | null; lat: number | null; lon: number | null; radiusKm: number | null; sightings: number }
/** Which observation point to evaluate: a point id, the rows without one ('unbekannt'), or everything ('alle'). */
export type StandortFilter = number | 'unbekannt' | 'alle';
export interface LiveryStats { standort: StandortFilter; standorte: StandortStat[]; airlines: LiveryAirlineStat[]; unmappedPrefixes: UnmappedPrefixStat[]; withoutAirline: number; presentShare: number }

const share = (n: number, d: number): number => (d === 0 ? 0 : Math.round((n / d) * 1000) / 1000);
const prefixOf = (callsign: string | null): string => (callsign && /^[A-Z]{3}[0-9]/.test(callsign) ? callsign.slice(0, 3) : '?');

/** `hasPoints` is false for a database from before migration 0006 (no observation_points table / column): everything is "unbekannt". */
export function liveryStats(db: StatsDb, opts: { days: number; nowMs: number; standort?: StandortFilter; hasPoints?: boolean }): LiveryStats {
  const since = opts.nowMs - opts.days * 86_400_000;
  const hasPoints = opts.hasPoints ?? true;
  let standort: StandortFilter = opts.standort ?? 'alle';
  if (opts.standort === undefined && hasPoints) {
    const newest = db.prepare('SELECT observation_point_id AS pid FROM sightings ORDER BY last_seen_ms DESC, id DESC LIMIT 1').all() as { pid: number | null }[];
    standort = newest.length === 0 || newest[0].pid === null ? (newest.length === 0 ? 'alle' : 'unbekannt') : newest[0].pid;
  } else if (opts.standort === undefined) standort = 'unbekannt';
  const pidCol = hasPoints ? 's.observation_point_id' : 'NULL';
  const filterSql = standort === 'alle' ? '' : standort === 'unbekannt' ? ` AND ${pidCol} IS NULL` : ` AND ${pidCol} = ${Number(standort)}`;

  const counts = new Map<number | null, number>();
  for (const r of db.prepare(`SELECT ${pidCol} AS pid, COUNT(*) AS n FROM sightings s WHERE s.slot IS NOT NULL AND s.last_seen_ms >= ? GROUP BY ${pidCol}`).all(since) as { pid: number | null; n: number }[]) counts.set(r.pid, r.n);
  const standorte: StandortStat[] = hasPoints
    ? (db.prepare('SELECT id, place, lat, lon, radius_km AS radiusKm FROM observation_points ORDER BY id').all() as Omit<StandortStat, 'sightings'>[]).map((p) => ({ ...p, sightings: counts.get(p.id) ?? 0 }))
    : [];
  standorte.push({ id: null, place: null, lat: null, lon: null, radiusKm: null, sightings: counts.get(null) ?? 0 });

  const rows = db.prepare(`SELECT s.callsign, s.airline, s.typklasse, s.livery_present AS lp FROM sightings s WHERE s.slot IS NOT NULL AND s.last_seen_ms >= ? AND s.typklasse NOT IN ('light-aircraft', 'glider')${filterSql}`).all(since) as { callsign: string | null; airline: string | null; typklasse: string; lp: number }[];

  let present = 0, withoutAirline = 0;
  const byAirline = new Map<string, LiveryAirlineStat>();
  for (const r of rows) {
    if (r.lp) present++;
    if (r.airline === null) { if (!r.lp) withoutAirline++; continue; }
    if (r.lp) continue;
    const prefix = prefixOf(r.callsign);
    const key = `${r.airline}\u0000${prefix}`;
    const a = byAirline.get(key) ?? { name: r.airline, prefix, count: 0, byTypklasse: {} };
    a.count++;
    a.byTypklasse[r.typklasse] = (a.byTypklasse[r.typklasse] ?? 0) + 1;
    byAirline.set(key, a);
  }

  let unmappedPrefixes: UnmappedPrefixStat[] = [];
  try {
    unmappedPrefixes = (db.prepare("SELECT key AS prefix, count FROM unmapped_keys WHERE kind = 'airline' ORDER BY count DESC, key").all() as UnmappedPrefixStat[]);
  } catch { /* old database without unmapped_keys: section stays empty */ }

  return {
    standort,
    standorte,
    airlines: [...byAirline.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name) || a.prefix.localeCompare(b.prefix)),
    unmappedPrefixes,
    withoutAirline,
    presentShare: share(present, rows.length),
  };
}

const pct = (x: number): string => `${Math.round(x * 100)}%`;

export function formatLiveryStats(s: LiveryStats): string {
  const out: string[] = [];
  const total = s.standorte.reduce((n, o) => n + o.sightings, 0);
  out.push(`Standort-Filter: ${s.standort}`, `Lackierung vorhanden: ${pct(s.presentShare)} (Sichtungen mit Slot, ohne light-aircraft/glider; Sichtungen aller Standorte im Fenster: ${total})`);
  out.push('', `Airlines mit Standard-Lackierung (${s.airlines.length})`);
  for (const a of s.airlines) out.push(`  ${a.name} ${a.prefix} ${a.count} (${Object.entries(a.byTypklasse).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([t, n]) => `${t} ${n}`).join(', ')})`);
  out.push('', `Praefixe ohne Airline-Eintrag (${s.unmappedPrefixes.length}; fallen auf die Standard-Lackierung)`);
  for (const u of s.unmappedPrefixes) out.push(`  ${u.prefix} ${u.count}`);
  out.push('', `Sichtungen ohne Airline (Standard-Lackierung): ${s.withoutAirline}`);
  return out.join('\n') + '\n';
}
