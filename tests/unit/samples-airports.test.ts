import { describe, expect, it } from 'vitest';
import airports from '../../src/server/modules/airspace/tables/airports.json';
import { SAMPLE_FLIGHTS } from '../../src/client/ui/domain/samples';

const table = airports as Record<string, { city: string; iata?: string }>;
const labels = new Set(Object.values(table).filter((a) => a.iata).map((a) => `${a.city} (${a.iata})`));
const cities = new Set(Object.values(table).map((a) => a.city));
const ICAO = ['EDDF', 'LGTS', 'MKJS', 'MUVR', 'EDFH', 'LEPA', 'LEBL', 'EDDB', 'EGKK'];

describe('SAMPLE_FLIGHTS use real airport-table labels', () => {
  it('every route end is "Stadt (IATA)" of a table entry', () => {
    const ends = Object.values(SAMPLE_FLIGHTS).flatMap((f) => (f.route ? f.route.split(' → ') : []));
    expect(ends.length).toBe(10);
    for (const e of ends) expect(labels.has(e), e).toBe(true);
  });
  it('every via city is a table city', () => {
    for (const f of Object.values(SAMPLE_FLIGHTS)) for (const v of f.via ?? []) expect(cities.has(v), v).toBe(true);
  });
  it('the sample ICAO codes map to the labels used', () => {
    const used = Object.values(SAMPLE_FLIGHTS).flatMap((f) => (f.route ? f.route.split(' → ') : []));
    for (const code of ICAO) {
      const a = table[code];
      const via = Object.values(SAMPLE_FLIGHTS).flatMap((f) => f.via ?? []);
      expect(used.includes(`${a.city} (${a.iata})`) || via.includes(a.city), code).toBe(true);
    }
  });
});
