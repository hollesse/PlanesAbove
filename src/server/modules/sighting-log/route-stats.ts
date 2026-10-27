// Routen-Statistik (read-only evaluation of the sighting log). Self-contained on purpose: scripts/stats-routes.mjs imports this file
// directly via Node's type stripping, so it must not import anything at runtime and use erasable syntax only.
// Only sightings that were shown (slot IS NOT NULL) count.

export interface StatsDb { prepare(sql: string): { all(...p: unknown[]): unknown[] } }

export interface DayStat { date: string; total: number; vrs: number; adsbdb: number; other: number; none: number; knownShare: number }
export interface SourceStat { source: string; hit: number; unknown: number; unavailable: number; rejected: number; chosen: number }
export interface UnknownStat { time: string; callsign: string | null; airline: string | null; typklasse: string }
export interface AirlineStat { prefix: string; total: number; unknown: number; unknownShare: number }
export interface ConflictStat { time: string; callsign: string | null; sources: string[]; chosen: string | null }
export interface RouteStats { days: DayStat[]; sources: SourceStat[]; unknown: UnknownStat[]; airlines: AirlineStat[]; conflicts: ConflictStat[] }

const share = (n: number, d: number): number => (d === 0 ? 0 : Math.round((n / d) * 1000) / 1000);
const prefixOf = (callsign: string | null): string => (callsign && /^[A-Z]{3}[0-9]/.test(callsign) ? callsign.slice(0, 3) : '?');

export function routeStats(db: StatsDb, opts: { days: number; nowMs: number }): RouteStats {
  const since = opts.nowMs - opts.days * 86_400_000;
  const sightings = db.prepare('SELECT id, callsign, airline, typklasse, route_source AS rs, first_seen_at AS t FROM sightings WHERE slot IS NOT NULL AND last_seen_ms >= ? ORDER BY first_seen_at, id').all(since) as { id: number; callsign: string | null; airline: string | null; typklasse: string; rs: string | null; t: string }[];

  const byDay = new Map<string, DayStat>();
  const byPrefix = new Map<string, { total: number; unknown: number }>();
  const unknown: UnknownStat[] = [];
  for (const s of sightings) {
    const date = s.t.slice(0, 10);
    const d = byDay.get(date) ?? { date, total: 0, vrs: 0, adsbdb: 0, other: 0, none: 0, knownShare: 0 };
    d.total++;
    if (s.rs === 'vrs') d.vrs++; else if (s.rs === 'adsbdb') d.adsbdb++; else if (s.rs === null) d.none++; else d.other++;
    byDay.set(date, d);
    const p = prefixOf(s.callsign);
    const a = byPrefix.get(p) ?? { total: 0, unknown: 0 };
    a.total++;
    if (s.rs === null) { a.unknown++; unknown.push({ time: s.t, callsign: s.callsign, airline: s.airline, typklasse: s.typklasse }); }
    byPrefix.set(p, a);
  }
  for (const d of byDay.values()) d.knownShare = share(d.total - d.none, d.total);

  const lookups = db.prepare('SELECT l.sighting_id AS sid, l.source, l.outcome, l.conflict, l.chosen FROM route_lookups l JOIN sightings s ON s.id = l.sighting_id WHERE s.slot IS NOT NULL AND s.last_seen_ms >= ? ORDER BY l.id').all(since) as { sid: number; source: string; outcome: string; conflict: number; chosen: number }[];
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
  out.push('Routen je Tag (Sichtungen mit Slot, nach endgueltiger Quelle)');
  for (const d of s.days) out.push(`  ${d.date}  gesamt ${d.total}  vrs ${d.vrs}  adsbdb ${d.adsbdb}${d.other ? `  andere ${d.other}` : ''}  none ${d.none}  bekannt ${pct(d.knownShare)}`);
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
