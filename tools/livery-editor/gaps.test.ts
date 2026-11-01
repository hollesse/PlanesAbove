import { describe, expect, it } from 'vitest';
import { computeGaps, UNKNOWN_AIRLINE, type SightingRow } from './gaps';

const row = (prefix: string, typklasse: string, count: number, airline: string | null = 'X'): SightingRow => ({ prefix, airline, typklasse, count, lastSeenMs: 0, samples: [] });
const files = { 'spike/narrowbody': {} };

describe('computeGaps', () => {
  const rows = [row('SPIKE', 'narrowbody', 9), row('DLH', 'narrowbody', 5, 'Lufthansa'), row('ZZZ', 'regional', 7, null)];
  it('marks exactly the combinations without a local file as gap (prefix lower-cased)', () => {
    const all = computeGaps(rows, files, { onlyGaps: false });
    expect(all.map((r) => [r.prefix, r.gap])).toEqual([['SPIKE', false], ['ZZZ', true], ['DLH', true]]);
    expect(all[0].liveryId).toBe('spike');
  });
  it('same prefix, other Typklasse is still a gap', () => {
    expect(computeGaps([row('SPIKE', 'regional', 1)], files, { onlyGaps: false })[0].gap).toBe(true);
  });
  it('filters with onlyGaps and sorts by count descending', () => {
    expect(computeGaps(rows, files, { onlyGaps: true }).map((r) => r.prefix)).toEqual(['ZZZ', 'DLH']);
  });
  it('maps airline null to the catalog hint', () => {
    expect(computeGaps(rows, files, { onlyGaps: true })[0].airline).toBe(UNKNOWN_AIRLINE);
    expect(UNKNOWN_AIRLINE).toBe('Airline fehlt im Katalog');
  });
});
