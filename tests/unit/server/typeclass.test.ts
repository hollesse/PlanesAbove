// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { loadTables, resolveAirline, resolveLivery, resolveTypeClass, defaultTables } from '../../../src/server/modules/airspace/typeclass';
import { PLANE_TYPE_IDS } from '../../../src/client/ui/domain/catalog';

const T = defaultTables();

describe('resolveTypeClass (ADR 0010)', () => {
  it('maps an exact type code via the curated table', () => {
    expect(resolveTypeClass(T, 'A20N', undefined)).toMatchObject({ typklasse: 'narrowbody', typeName: 'Airbus A320neo', fallback: false, unmapped: false });
    expect(resolveTypeClass(T, 'A388', 'A5')).toMatchObject({ typklasse: 'double-decker', besonderheit: 'Doppelstock' });
    expect(resolveTypeClass(T, 'B744', undefined).typklasse).toBe('jumbo-hump');
    expect(resolveTypeClass(T, 'EC45', 'A7').typklasse).toBe('helicopter');
  });
  it('falls back to the emitter category when the type is unknown, flagged as fallback without Besonderheit', () => {
    const r = resolveTypeClass(T, 'ZZZZ', 'A5');
    expect(r).toMatchObject({ typklasse: 'widebody', fallback: true, unmapped: true });
    expect(r.besonderheit).toBeUndefined();
    expect(resolveTypeClass(T, undefined, 'A1').typklasse).toBe('light-aircraft');
    expect(resolveTypeClass(T, undefined, 'A2').typklasse).toBe('regional-jet');
    expect(resolveTypeClass(T, undefined, 'A3').typklasse).toBe('narrowbody');
    expect(resolveTypeClass(T, undefined, 'A4').typklasse).toBe('narrowbody');
    expect(resolveTypeClass(T, undefined, 'A6').typklasse).toBe('business-jet');
    expect(resolveTypeClass(T, undefined, 'A7').typklasse).toBe('helicopter');
  });
  it('uses the neutral narrowbody silhouette with Kategorie "unbekannt" when nothing is known', () => {
    expect(resolveTypeClass(T, undefined, undefined)).toMatchObject({ typklasse: 'narrowbody', kategorie: 'unbekannt', fallback: true, unmapped: false });
    expect(resolveTypeClass(T, 'ZZZZ', undefined)).toMatchObject({ typklasse: 'narrowbody', kategorie: 'unbekannt', unmapped: true });
  });
  it('only ever yields Typklasse ids of the design-system catalog', () => {
    for (const e of Object.values(T.typeClasses)) expect(PLANE_TYPE_IDS).toContain(e.typklasse);
  });
});

describe('loadTables validation', () => {
  it('rejects an unknown Typklasse id', () => {
    expect(() => loadTables({ typeClasses: { X1: { name: 'x', typklasse: 'zeppelin', kategorie: 'k' } }, airlines: {}, airlineLiveries: {} })).toThrow(/zeppelin/);
  });
  it('rejects a livery id that is not in the catalog', () => {
    expect(() => loadTables({ typeClasses: {}, airlines: {}, airlineLiveries: { DLH: 'nonexistent' } })).toThrow(/nonexistent/);
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
  it('forces def for classes without liveries', () => {
    expect(resolveLivery(T, 'DLH', 'light-aircraft', true)).toEqual({ liveryId: 'def', present: false });
    expect(resolveLivery(T, 'DLH', 'glider', true)).toEqual({ liveryId: 'def', present: false });
  });
});
