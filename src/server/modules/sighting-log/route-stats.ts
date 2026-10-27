// Routen-Statistik (read-only evaluation of the sighting log). Self-contained on purpose: scripts/stats-routes.mjs imports this file
// directly via Node's type stripping, so it must not import anything at runtime and use erasable syntax only.
// Only sightings that were shown (slot IS NOT NULL) count.

export interface StatsDb { prepare(sql: string): { all(...p: unknown[]): unknown[] } }

export interface DayStat { date: string; total: number; vrs: number; adsbdb: number; hexdb: number; other: number; none: number; knownShare: number }
export interface SourceStat { source: string; hit: number; unknown: number; unavailable: number; rejected: number; chosen: number }
export interface UnknownStat { time: string; callsign: string | null; airline: string | null; typklasse: string }
export interface AirlineStat { prefix: string; total: number; unknown: number; unknownShare: number }
export interface ConflictStat { time: string; callsign: string | null; sources: string[]; chosen: string | null }
export interface StandortStat { id: number | null; place: string | null; lat: number | null; lon: number | null; radiusKm: number | null; sightings: number }
/** Which observation point to evaluate: a point id, the rows without one ('unbekannt'), or everything ('alle'). */
export type StandortFilter = number | 'unbekannt' | 'alle';
export interface RouteStats { standort: StandortFilter; standorte: StandortStat[]; days: DayStat[]; sources: SourceStat[]; unknown: UnknownStat[]; airlines: AirlineStat[]; conflicts: ConflictStat[] }

const share = (n: number, d: number): number => (d === 0 ? 0 : Math.round((n / d) * 1000) / 1000);
const prefixOf = (callsign: string | null): string => (callsign && /^[A-Z]{3}[0-9]/.test(callsign) ? callsign.slice(0, 3) : '?');

/** `hasPoints` is false for a database from before migration 0006 (no observation_points table / column): everything is "unbekannt". */
export function routeStats(db: StatsDb, opts: { days: number; nowMs: number; standort?: StandortFilter; hasPoints?: boolean }): RouteStats {
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

  const sightings = db.prepare(`SELECT s.id, s.callsign, s.airline, s.typklasse, s.route_source AS rs, s.first_seen_at AS t FROM sightings s WHERE s.slot IS NOT NULL AND s.last_seen_ms >= ?${filterSql} ORDER BY s.first_seen_at, s.id`).all(since) as { id: number; callsign: string | null; airline: string | null; typklasse: string; rs: string | null; t: string }[];

  const byDay = new Map<string, DayStat>();
  const byPrefix = new Map<string, { total: number; unknown: number }>();
  const unknown: UnknownStat[] = [];
  for (const s of sightings) {
    const date = s.t.slice(0, 10);
    const d = byDay.get(date) ?? { date, total: 0, vrs: 0, adsbdb: 0, hexdb: 0, other: 0, none: 0, knownShare: 0 };
    d.total++;
    if (s.rs === 'vrs') d.vrs++; else if (s.rs === 'adsbdb') d.adsbdb++; else if (s.rs === 'hexdb') d.hexdb++; else if (s.rs === null) d.none++; else d.other++;
    byDay.set(date, d);
    const p = prefixOf(s.callsign);
    const a = byPrefix.get(p) ?? { total: 0, unknown: 0 };
    a.total++;
    if (s.rs === null) { a.unknown++; unknown.push({ time: s.t, callsign: s.callsign, airline: s.airline, typklasse: s.typklasse }); }
    byPrefix.set(p, a);
  }
  for (const d of byDay.values()) d.knownShare = share(d.total - d.none, d.total);

  const lookups = db.prepare('SELECT l.sighting_id AS sid, l.source, l.outcome, l.conflict, l.chosen FROM route_lookups l JOIN sightings s ON s.id = l.sighting_id WHERE s.slot IS NOT NULL AND s.last_seen_ms >= ?'+filterSql+' ORDER BY l.id').all(since) as { sid: number; source: string; outcome: string; conflict: number; chosen: number }[];
  const bySource = new Map<string, SourceStat>();
  const conflictBySighting = new Map<number, { sources: Set<string>; chosen: string | null }>();
  for (const l of lookups) {
    const st = bySource.get(l.source) ?? { source: l.source, hit: 0, unknown: 0, unavailable: 0, rejected: 0, chosen: 0 };
    if (l.outcome === 'hit' || l.outcome === 'unknown' || l.outcome === 'unavailable' || l.outcome === 'rejected') st[l.outcome]++;
    if (l.chosen) st.chosen++;
    bySource.set(l.source, st);
    if (l.conflict) {
      const c = conflictBySighting.get(l.sid) ?? { sources: new Set<string>(), chosen: null };
      if (l.outcome === 'hit') c.sources.add(l.source);
      if (l.chosen) c.chosen = l.source;
      conflictBySighting.set(l.sid, c);
    }
  }
  const byId = new Map(sightings.map((s) => [s.id, s]));
  const conflicts: ConflictStat[] = [...conflictBySighting].flatMap(([sid, c]) => { const s = byId.get(sid); return s ? [{ time: s.t, callsign: s.callsign, sources: [...c.sources], chosen: c.chosen }] : []; });

  return {
    standort,
    standorte,
    days: [...byDay.values()],
    sources: [...bySource.values()].sort((a, b) => a.source.localeCompare(b.source)),
    unknown,
    airlines: [...byPrefix].map(([prefix, v]) => ({ prefix, total: v.total, unknown: v.unknown, unknownShare: share(v.unknown, v.total) })).sort((a, b) => b.unknownShare - a.unknownShare || b.total - a.total || a.prefix.localeCompare(b.prefix)),
    conflicts,
  };
}

const pct = (x: number): string => `${Math.round(x * 100)}%`;

export function formatRouteStats(s: RouteStats): string {
  const out: string[] = [];
  out.push(`Standort-Filter: ${s.standort}`, 'Standorte (Sichtungen mit Slot im Fenster)');
  for (const o of s.standorte) out.push(o.id === null ? `  unbekannt  ${o.sightings} Sichtungen` : `  ${o.id}  ${o.place}  ${o.lat}/${o.lon}  Radius ${o.radiusKm} km  ${o.sightings} Sichtungen`);
  out.push('', 'Routen je Tag (Sichtungen mit Slot, nach endgueltiger Quelle)');
  for (const d of s.days) out.push(`  ${d.date}  gesamt ${d.total}  vrs ${d.vrs}  adsbdb ${d.adsbdb}  hexdb ${d.hexdb}${d.other ? `  andere ${d.other}` : ''}  none ${d.none}  bekannt ${pct(d.knownShare)}`);
  out.push('', 'Befunde je Quelle');
  for (const r of s.sources) out.push(`  ${r.source}  hit ${r.hit}  unknown ${r.unknown}  unavailable ${r.unavailable}  rejected ${r.rejected}  gewaehlt ${r.chosen}`);
  out.push('', `Unbekannte Routen (${s.unknown.length})`);
  for (const u of s.unknown) out.push(`  ${u.time}  ${u.callsign ?? '-'}  ${u.airline ?? '-'}  ${u.typklasse}`);
  out.push('', 'Unbekannt-Anteil je Airline-Praefix');
  for (const a of s.airlines) out.push(`  ${a.prefix}  ${a.unknown}/${a.total}  ${pct(a.unknownShare)}`);
  out.push('', `Konflikte (${s.conflicts.length})`);
  for (const c of s.conflicts) out.push(`  ${c.time}  ${c.callsign ?? '-'}  ${c.sources.join(' vs ')}  gewaehlt ${c.chosen ?? '-'}`);
  return out.join('\n') + '\n';
}
