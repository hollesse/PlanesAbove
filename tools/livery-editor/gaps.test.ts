import { describe, expect, it } from 'vitest';
import { groupByAirline, typeOptions, UNKNOWN_AIRLINE, type SightingRow } from './gaps';

const row = (prefix: string, typklasse: string, count: number, airline: string | null = 'X'): SightingRow => ({ prefix, airline, typklasse, count, lastSeenMs: 0, samples: [] });
const files = { 'spike/narrowbody': {} };
const rows = [row('SPIKE', 'narrowbody', 9), row('SPIKE', 'regional', 12), row('DLH', 'narrowbody', 5, 'Lufthansa'), row('ZZZ', 'regional', 30, null)];

describe('groupByAirline', () => {
  const groups = groupByAirline(rows, files);
  it('aggregates per prefix, sorted by total descending', () => {
    expect(groups.map((g) => [g.prefix, g.total])).toEqual([['ZZZ', 30], ['SPIKE', 21], ['DLH', 5]]);
    expect(groups[1].liveryId).toBe('spike');
  });
  it('sorts types by count and marks gaps against <liveryId>/<typklasse>', () => {
    const s = groups[1];
    expect(s.types).toEqual([{ typklasse: 'regional', count: 12, gap: true }, { typklasse: 'narrowbody', count: 9, gap: false }]);
    expect(s.gaps).toBe(1);
    expect(s.seenTypes).toBe(2);
  });
  it('maps airline null to the catalog hint', () => {
    expect(groups[0].airline).toBe(UNKNOWN_AIRLINE);
    expect(UNKNOWN_AIRLINE).toBe('Airline fehlt im Katalog');
  });
});

describe('typeOptions', () => {
  const all = ['narrowbody', 'widebody', 'regional'];
  it('lists seen types first with count and status, unseen plain after, preselects most-seen gap', () => {
    const { options, preselected } = typeOptions(groupByAirline(rows, files)[1], all);
    expect(options).toEqual([
      { value: 'regional', label: 'regional · 12 Sichtungen · fehlt' },
      { value: 'narrowbody', label: 'narrowbody · 9 Sichtungen · vorhanden' },
      { value: 'widebody', label: 'widebody' },
    ]);
    expect(preselected).toBe('regional');
  });
  it('preselects the most-seen type when none is a gap', () => {
    const g = groupByAirline([row('SPIKE', 'narrowbody', 3)], files)[0];
    expect(typeOptions(g, all).preselected).toBe('narrowbody');
  });
  it('disables seen types without silhouette and never preselects them', () => {
    const g = groupByAirline([row('SPIKE', 'regional', 20), row('SPIKE', 'narrowbody', 5)], {})[0];
    const { options, preselected } = typeOptions(g, ['narrowbody', 'widebody'], ['narrowbody', 'widebody']);
    expect(options[0]).toEqual({ value: 'regional', label: 'regional · 20 Sichtungen · fehlt · keine Silhouette', disabled: true });
    expect(preselected).toBe('narrowbody');
  });
  it('falls back to the first drawable type when no seen type is drawable', () => {
    const g = groupByAirline([row('SPIKE', 'regional', 20)], {})[0];
    expect(typeOptions(g, ['narrowbody'], ['narrowbody']).preselected).toBe('narrowbody');
  });
  it('without a group: plain options, no preselection', () => {
    expect(typeOptions(null, all)).toEqual({ options: all.map((t) => ({ value: t, label: t })), preselected: null });
  });
});
