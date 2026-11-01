// Pure gap logic (ADR 0033 §3): seen Airline x Typklasse combinations minus the local livery files, grouped per airline.
export type SightingSample = { icao24: string; registration?: string | null };
export type SightingRow = { prefix: string; airline: string | null; typklasse: string; count: number; lastSeenMs: number; samples?: SightingSample[] };
export type SightingsResponse = { days: number; standort?: unknown; rows: SightingRow[] };
export type TypeSighting = { typklasse: string; count: number; gap: boolean };
export type AirlineGroup = { prefix: string; liveryId: string; airline: string; total: number; types: TypeSighting[]; gaps: number; seenTypes: number };
export type TypeOption = { value: string; label: string; disabled?: boolean };

export const UNKNOWN_AIRLINE = 'Airline fehlt im Katalog';

export function groupByAirline(rows: SightingRow[], liveryFiles: Record<string, unknown>): AirlineGroup[] {
  const byPrefix = new Map<string, AirlineGroup>();
  for (const r of rows) {
    const liveryId = r.prefix.toLowerCase();
    let g = byPrefix.get(r.prefix);
    if (!g) { g = { prefix: r.prefix, liveryId, airline: r.airline ?? UNKNOWN_AIRLINE, total: 0, types: [], gaps: 0, seenTypes: 0 }; byPrefix.set(r.prefix, g); }
    else if (r.airline && g.airline === UNKNOWN_AIRLINE) g.airline = r.airline;
    g.total += r.count;
    g.types.push({ typklasse: r.typklasse, count: r.count, gap: !(`${liveryId}/${r.typklasse}` in liveryFiles) });
  }
  const groups = [...byPrefix.values()];
  for (const g of groups) {
    g.types.sort((a, b) => b.count - a.count);
    g.seenTypes = g.types.length;
    g.gaps = g.types.filter((t) => t.gap).length;
  }
  return groups.sort((a, b) => b.total - a.total);
}

export function typeOptions(group: AirlineGroup | null, allTypes: readonly string[], drawable: readonly string[] = allTypes): { options: TypeOption[]; preselected: string | null } {
  if (!group) return { options: allTypes.map((t) => ({ value: t, label: t })), preselected: null };
  const canDraw = new Set(drawable);
  const seen = new Set(group.types.map((t) => t.typklasse));
  const options: TypeOption[] = [
    ...group.types.map((t) => {
      const base = `${t.typklasse} · ${t.count} Sichtungen · ${t.gap ? 'fehlt' : 'vorhanden'}`;
      return canDraw.has(t.typklasse) ? { value: t.typklasse, label: base } : { value: t.typklasse, label: `${base} · keine Silhouette`, disabled: true };
    }),
    ...allTypes.filter((t) => !seen.has(t)).map((t) => ({ value: t, label: t })),
  ];
  const usable = group.types.filter((t) => canDraw.has(t.typklasse));
  const pre = usable.find((t) => t.gap)?.typklasse ?? usable[0]?.typklasse ?? allTypes.find((t) => canDraw.has(t)) ?? null;
  return { options, preselected: pre };
}
