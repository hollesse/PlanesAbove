// Typquellen-Statistik (read-only evaluation of the sighting log, airspace-t4x9k). Self-contained like livery-stats.ts:
// scripts/stats-types.mjs imports this file via Node's type stripping, so no runtime imports and erasable syntax only.
// Only shown sightings (slot IS NOT NULL) count. Kept separate from livery-stats on purpose (small overlap with other stats work).

export interface StatsDb { prepare(sql: string): { all(...p: unknown[]): unknown[] } }

export interface TypeSourceCount { typeSource: string; count: number }
export interface CorrectedHex { icao24: string; typeSource: string; flightType: string | null; typklasse: string; count: number }
export interface TypeStats { bySource: TypeSourceCount[]; corrected: CorrectedHex[] }

/** A database from before migration 0007 has no type_source column: every sighting counts as 'flight'. */
export function typeStats(db: StatsDb, opts: { days: number; nowMs: number }): TypeStats {
  const since = opts.nowMs - opts.days * 86_400_000;
  let bySource: TypeSourceCount[];
  let corrected: CorrectedHex[] = [];
  try {
    bySource = db.prepare('SELECT type_source AS typeSource, COUNT(*) AS count FROM sightings WHERE slot IS NOT NULL AND last_seen_ms >= ? GROUP BY type_source ORDER BY count DESC, type_source').all(since) as TypeSourceCount[];
    corrected = db.prepare("SELECT icao24, type_source AS typeSource, type_code AS flightType, typklasse, COUNT(*) AS count FROM sightings WHERE slot IS NOT NULL AND last_seen_ms >= ? AND type_source IN ('override', 'hexdb') GROUP BY icao24, type_source, type_code, typklasse ORDER BY count DESC, icao24").all(since) as CorrectedHex[];
  } catch {
    const n = (db.prepare('SELECT COUNT(*) AS n FROM sightings WHERE slot IS NOT NULL AND last_seen_ms >= ?').all(since) as { n: number }[])[0]?.n ?? 0;
    bySource = n ? [{ typeSource: 'flight', count: n }] : [];
  }
  return { bySource, corrected };
}

export function formatTypeStats(s: TypeStats): string {
  const out: string[] = ['Sichtungen je Typquelle (gezeigte Sichtungen)'];
  for (const r of s.bySource) out.push(`  ${r.typeSource} ${r.count}`);
  out.push('', `Hex-Codes mit korrigiertem Typ (override/hexdb; Typcode der Flugquelle -> Typklasse) (${s.corrected.length})`);
  for (const c of s.corrected) out.push(`  ${c.icao24} ${c.typeSource} ${c.flightType ?? '-'} -> ${c.typklasse} ${c.count}`);
  return out.join('\n') + '\n';
}
