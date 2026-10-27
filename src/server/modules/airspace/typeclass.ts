// ADR 0010: Typklasse, Kategorie, airline and livery from static curated tables. The only place that knows ICAO codes.
import { PLANE_TYPE_IDS, NO_LIVERY_TYPES, type PlaneType } from '../../../client/ui/domain/catalog';
import { LIVERIES } from '../../../client/ui/domain/liveries';
import typeClassesJson from './tables/type-classes.json';
import airlinesJson from './tables/airlines.json';
import airlineLiveriesJson from './tables/airline-liveries.json';

export interface TypeClassEntry { name: string; typklasse: string; kategorie: string; besonderheit?: string }
export interface AirlineEntry { name: string; country: string }
export interface Tables {
  typeClasses: Record<string, TypeClassEntry>;
  airlines: Record<string, AirlineEntry>;
  airlineLiveries: Record<string, string>;
}

/** Validates the tables against the design-system catalog ids (ADR 0009); throws with all problems. */
export function loadTables(raw: Tables): Tables {
  const problems: string[] = [];
  for (const [code, e] of Object.entries(raw.typeClasses)) if (!PLANE_TYPE_IDS.includes(e.typklasse as PlaneType)) problems.push(`type-classes.${code}: unknown typklasse "${e.typklasse}"`);
  const liveryIds = LIVERIES.map((l) => l.id);
  for (const [prefix, id] of Object.entries(raw.airlineLiveries)) if (!liveryIds.includes(id)) problems.push(`airline-liveries.${prefix}: unknown livery "${id}"`);
  if (problems.length) throw new Error(`Invalid airspace tables:\n${problems.join('\n')}`);
  return raw;
}

export const defaultTables = (): Tables => loadTables({ typeClasses: typeClassesJson as Record<string, TypeClassEntry>, airlines: airlinesJson, airlineLiveries: airlineLiveriesJson });

export interface ResolvedTypeClass {
  typklasse: PlaneType;
  kategorie: string;
  besonderheit?: string;
  /** Curated display name, e.g. "Airbus A320neo"; absent on fallback. */
  typeName?: string;
  fallback: boolean;
  /** A type code was given but is not in the table (to be reported, ADR 0010 #5). */
  unmapped: boolean;
}

const EMITTER_FALLBACK: Record<string, PlaneType> = { A1: 'light-aircraft', A2: 'regional-jet', A3: 'narrowbody', A4: 'narrowbody', A5: 'widebody', A6: 'business-jet', A7: 'helicopter', B1: 'glider', B4: 'light-aircraft' };
// ADR 0015: B0/B5 count as "no category"; B2/B3/B6/B7 and C* never reach here (excluded in selectNearest).
const KATEGORIE_BY_CLASS: Partial<Record<PlaneType, string>> = { 'light-aircraft': 'Allgemeine Luftfahrt', glider: 'Segelflug', helicopter: 'Hubschrauber', 'business-jet': 'Geschäftsreise', 'regional-jet': 'Regional', turboprop: 'Regional' };

const NO_TYPE_PLACEHOLDER = 'ZZZZ';

export function resolveTypeClass(t: Tables, typeCode: string | undefined, emitterCategory: string | undefined): ResolvedTypeClass {
  // ICAO placeholder "ZZZZ" means "no type"; treated like an absent type code.
  if (typeCode === NO_TYPE_PLACEHOLDER) typeCode = undefined;
  const hit = typeCode ? t.typeClasses[typeCode] : undefined;
  if (hit) return { typklasse: hit.typklasse as PlaneType, kategorie: hit.kategorie, besonderheit: hit.besonderheit, typeName: hit.name, fallback: false, unmapped: false };
  const unmapped = Boolean(typeCode);
  const byEmitter = emitterCategory ? EMITTER_FALLBACK[emitterCategory] : undefined;
  if (byEmitter) return { typklasse: byEmitter, kategorie: KATEGORIE_BY_CLASS[byEmitter] ?? 'unbekannt', fallback: true, unmapped };
  return { typklasse: 'light-aircraft', kategorie: 'unbekannt', fallback: true, unmapped };
}

export interface ResolvedAirline { prefix: string; name?: string; country?: string }

/** Airline from the callsign prefix, only for callsigns shaped like ^[A-Z]{3}[0-9]. */
export function resolveAirline(t: Tables, callsign: string | undefined): ResolvedAirline | undefined {
  const cs = callsign?.trim().toUpperCase();
  if (!cs || !/^[A-Z]{3}[0-9]/.test(cs)) return undefined;
  const prefix = cs.slice(0, 3);
  const hit = t.airlines[prefix];
  return { prefix, name: hit?.name, country: hit?.country };
}

/** Livery id: the catalog livery when `enabled` and known, else the Standard-Lackierung `def`. `present` = the catalog has one for this airline and class. */
export function resolveLivery(t: Tables, prefix: string | undefined, typklasse: PlaneType, enabled: boolean): { liveryId: string; present: boolean } {
  const id = prefix ? t.airlineLiveries[prefix] : undefined;
  const present = Boolean(id) && !NO_LIVERY_TYPES.includes(typklasse);
  return { liveryId: enabled && present ? (id as string) : 'def', present };
}
