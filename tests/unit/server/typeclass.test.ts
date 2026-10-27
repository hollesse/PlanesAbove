// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { loadTables, resolveAirline, resolveLivery, resolveTypeClass, defaultTables } from '../../../src/server/modules/airspace/typeclass';
import { PLANE_TYPE_IDS } from '../../../src/client/ui/domain/catalog';
import { LIVERIES } from '../../../src/client/ui/domain/liveries';

const T = defaultTables();

describe('resolveTypeClass (ADR 0010)', () => {
  it('maps an exact type code via the curated table', () => {
    expect(resolveTypeClass(T, 'A20N', undefined)).toMatchObject({ typklasse: 'narrowbody', typeName: 'Airbus A320neo', fallback: false, unmapped: false });
    expect(resolveTypeClass(T, 'A388', 'A5')).toMatchObject({ typklasse: 'double-decker', besonderheit: 'Doppelstock' });
    expect(resolveTypeClass(T, 'B744', undefined).typklasse).toBe('jumbo-hump');
    expect(resolveTypeClass(T, 'EC45', 'A7').typklasse).toBe('helicopter');
  });
  it('falls back to the emitter category when the type is unknown, flagged as fallback without Besonderheit', () => {
    const r = resolveTypeClass(T, 'XXXX', 'A5');
    expect(r).toMatchObject({ typklasse: 'widebody', fallback: true, unmapped: true });
    expect(r.besonderheit).toBeUndefined();
    expect(resolveTypeClass(T, undefined, 'A1').typklasse).toBe('light-aircraft');
    expect(resolveTypeClass(T, undefined, 'A2').typklasse).toBe('regional-jet');
    expect(resolveTypeClass(T, undefined, 'A3').typklasse).toBe('narrowbody');
    expect(resolveTypeClass(T, undefined, 'A4').typklasse).toBe('narrowbody');
    expect(resolveTypeClass(T, undefined, 'A6').typklasse).toBe('business-jet');
    expect(resolveTypeClass(T, undefined, 'A7').typklasse).toBe('helicopter');
  });
  it('maps B emitter categories in the fallback (ADR 0015): B1 glider, B4 light-aircraft', () => {
    expect(resolveTypeClass(T, 'XXXX', 'B1')).toMatchObject({ typklasse: 'glider', fallback: true, unmapped: true });
    expect(resolveTypeClass(T, 'XXXX', 'B4')).toMatchObject({ typklasse: 'light-aircraft', fallback: true, unmapped: true });
  });
  it('treats B0/B5 like "no category"', () => {
    for (const c of ['B0', 'B5']) expect(resolveTypeClass(T, 'XXXX', c)).toEqual(resolveTypeClass(T, 'XXXX', undefined));
  });
  it('falls back to light-aircraft "unbekannt" when nothing is known (ADR 0015)', () => {
    expect(resolveTypeClass(T, undefined, undefined)).toMatchObject({ typklasse: 'light-aircraft', kategorie: 'unbekannt', fallback: true, unmapped: false });
    expect(resolveTypeClass(T, 'XXXX', undefined)).toMatchObject({ typklasse: 'light-aircraft', kategorie: 'unbekannt', unmapped: true });
  });
  it('contains the live-test additions with valid curated Kategorien', () => {
    const curated = ['Allgemeine Luftfahrt', 'Geschäftsreise', 'Hubschrauber', 'Kurzstrecke', 'Langstrecke', 'Mittelstrecke', 'Regional', 'Segelflug'];
    const expected: Record<string, string> = { C42: 'light-aircraft', FDCT: 'light-aircraft', PC12: 'turboprop', C82R: 'light-aircraft', DV20: 'light-aircraft', B36T: 'light-aircraft', C560: 'business-jet', C295: 'turboprop', C27J: 'turboprop', H47: 'helicopter', TAMP: 'light-aircraft', LGND: 'light-aircraft', A210: 'light-aircraft', CTSW: 'light-aircraft', EV97: 'light-aircraft', AAT3: 'light-aircraft', DA62: 'light-aircraft' };
    for (const [code, klass] of Object.entries(expected)) {
      expect(T.typeClasses[code], code).toBeDefined();
      expect(T.typeClasses[code].typklasse).toBe(klass);
      expect(PLANE_TYPE_IDS).toContain(T.typeClasses[code].typklasse);
      expect(curated).toContain(T.typeClasses[code].kategorie);
      expect(resolveTypeClass(T, code, 'B4')).toMatchObject({ fallback: false, unmapped: false });
    }
  });
  it('only ever yields Typklasse ids of the design-system catalog', () => {
    for (const e of Object.values(T.typeClasses)) expect(PLANE_TYPE_IDS).toContain(e.typklasse);
  });
});

describe('loadTables validation', () => {
  it('rejects an unknown Typklasse id', () => {
    expect(() => loadTables({ typeClasses: { X1: { name: 'x', typklasse: 'zeppelin', kategorie: 'k' } }, airlines: {}, airports: {}, airlineLiveries: {} })).toThrow(/zeppelin/);
  });
  it('rejects a livery id that is not in the catalog', () => {
    expect(() => loadTables({ typeClasses: {}, airlines: {}, airports: {}, airlineLiveries: { DLH: 'nonexistent' } })).toThrow(/nonexistent/);
  });
});

describe('resolveAirline', () => {
  it('names the airline from the 3-letter callsign prefix', () => {
    expect(resolveAirline(T, 'DLH400')).toMatchObject({ prefix: 'DLH', name: 'Lufthansa' });
    expect(resolveAirline(T, 'EZY25YP')).toMatchObject({ name: 'easyJet' });
  });
  it('ignores callsigns that do not look like airline callsigns (GA registrations)', () => {
    expect(resolveAirline(T, 'DHYAV')).toBeUndefined();
    expect(resolveAirline(T, 'CHX77')?.name).toBeUndefined();
    expect(resolveAirline(T, undefined)).toBeUndefined();
  });
  it('reports an unknown but well-formed prefix as unmapped without a name', () => {
    expect(resolveAirline(T, 'QQQ123')).toMatchObject({ prefix: 'QQQ', name: undefined });
  });
});

describe('resolveLivery', () => {
  it('uses the catalog livery when enabled, else the Standard-Lackierung; present tells whether one exists', () => {
    expect(resolveLivery(T, 'DLH', 'narrowbody', true)).toEqual({ liveryId: 'lh', present: true });
    expect(resolveLivery(T, 'DLH', 'narrowbody', false)).toEqual({ liveryId: 'def', present: true });
    expect(resolveLivery(T, 'QQQ', 'narrowbody', true)).toEqual({ liveryId: 'def', present: false });
    expect(resolveLivery(T, undefined, 'narrowbody', true)).toEqual({ liveryId: 'def', present: false });
  });
  it('resolves the completed mapping (airspace-f9cjz)', () => {
    expect(resolveLivery(T, 'UAE', 'double-decker', true)).toEqual({ liveryId: 'emirates', present: true });
    expect(resolveLivery(T, 'EXS', 'narrowbody', true)).toEqual({ liveryId: 'jet2', present: true });
  });
  it('references every catalog livery except def by at least one prefix', () => {
    const used = new Set(Object.values(T.airlineLiveries));
    const missing = LIVERIES.map((l) => l.id).filter((id) => id !== 'def' && !used.has(id));
    expect(missing).toEqual([]);
  });
  it('names every prefix of airline-liveries in airlines', () => {
    const missing = Object.keys(T.airlineLiveries).filter((p) => !T.airlines[p]?.name);
    expect(missing).toEqual([]);
  });
  it('forces def for classes without liveries', () => {
    expect(resolveLivery(T, 'DLH', 'light-aircraft', true)).toEqual({ liveryId: 'def', present: false });
    expect(resolveLivery(T, 'DLH', 'glider', true)).toEqual({ liveryId: 'def', present: false });
  });
});

describe('curation from live operation (airspace-n8c4t)', () => {
  const AIRLINES: Record<string, string> = { EXS: 'Jet2', KLC: 'KLM Cityhopper', LHX: 'Lufthansa City Airlines', TKJ: 'AJet', TOM: 'TUI Airways', AEE: 'Aegean Airlines', CAI: 'Corendon Airlines', CXI: 'Corendon Airlines Europe', NJE: 'NetJets Europe', VIR: 'Virgin Atlantic', BOX: 'AeroLogic', WMT: 'Wizz Air Malta', WUK: 'Wizz Air UK', JAF: 'TUI fly Belgium', CCA: 'Air China', CAO: 'Air China Cargo', DLA: 'Air Dolomiti', GFA: 'Gulf Air', HOP: 'HOP!', RJA: 'Royal Jordanian', SEH: 'Sky Express', THA: 'Thai Airways', ABY: 'Air Arabia', AIC: 'Air India', LBT: 'Nouvelair', MSC: 'Air Cairo' };
  it('has the curated airlines with name and two-letter country', () => {
    for (const [prefix, name] of Object.entries(AIRLINES)) {
      expect(T.airlines[prefix]?.name, prefix).toBe(name);
      expect(T.airlines[prefix].country, prefix).toMatch(/^[A-Z]{2}$/);
      expect(resolveAirline(T, `${prefix}123`)?.name).toBe(name);
    }
  });
  it('has the curated type codes with valid Typklasse and Kategorie', () => {
    const curated = ['Allgemeine Luftfahrt', 'Geschäftsreise', 'Hubschrauber', 'Kurzstrecke', 'Langstrecke', 'Mittelstrecke', 'Regional', 'Segelflug'];
    const expected: Record<string, string> = { P208: 'light-aircraft', C550: 'business-jet', BE20: 'turboprop', C150: 'light-aircraft', E35L: 'business-jet', G3: 'business-jet', J328: 'regional-jet', M20T: 'light-aircraft', K35R: 'narrowbody', A124: 'widebody', T6: 'light-aircraft' };
    for (const [code, klass] of Object.entries(expected)) {
      const r = resolveTypeClass(T, code, undefined);
      expect(r, code).toMatchObject({ typklasse: klass, fallback: false, unmapped: false });
      expect(r.typeName, code).toBeTruthy();
      expect(curated).toContain(r.kategorie);
    }
    expect(resolveTypeClass(T, 'K35R', undefined)).toMatchObject({ kategorie: 'Langstrecke', besonderheit: 'Militärischer Tanker' });
  });
  it('treats ZZZZ as "no type code" (ADR 0010 placeholder)', () => {
    expect(resolveTypeClass(T, 'ZZZZ', 'A1')).toEqual(resolveTypeClass(T, undefined, 'A1'));
    expect(resolveTypeClass(T, 'ZZZZ', 'A1')).toMatchObject({ typklasse: 'light-aircraft', unmapped: false });
    expect(resolveTypeClass(T, 'ZZZZ', undefined)).toMatchObject({ typklasse: 'light-aircraft', kategorie: 'unbekannt', unmapped: false });
    expect(T.typeClasses).not.toHaveProperty('ZZZZ');
  });
});
