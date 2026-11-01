// Pure gap logic (ADR 0033 §3): seen Airline x Typklasse combinations minus the local livery files.
export type SightingRow = { prefix: string; airline: string | null; typklasse: string; count: number; lastSeenMs: number; samples?: unknown };
export type SightingsResponse = { days: number; standort?: unknown; rows: SightingRow[] };
export type GapRow = { prefix: string; liveryId: string; typklasse: string; airline: string; count: number; gap: boolean };

export const UNKNOWN_AIRLINE = 'Airline fehlt im Katalog';

export function computeGaps(rows: SightingRow[], liveryFiles: Record<string, unknown>, opts: { onlyGaps: boolean }): GapRow[] {
  return rows
    .map((r): GapRow => {
      const liveryId = r.prefix.toLowerCase();
      return { prefix: r.prefix, liveryId, typklasse: r.typklasse, airline: r.airline ?? UNKNOWN_AIRLINE, count: r.count, gap: !(`${liveryId}/${r.typklasse}` in liveryFiles) };
    })
    .filter((r) => !opts.onlyGaps || r.gap)
    .sort((a, b) => b.count - a.count);
}
