---
id: 0010
title: Typklasse, Kategorie and airline derived from static curated tables
scope: airspace
status: accepted
date: 2026-10-26
supersedes: []
superseded_by: []
related_tasks: [airspace-h76v2]
related_research: [free-flight-weather-tts-apis-2026-10-26]
related_adrs: [0001, 0004, 0005, 0007, 0009]
---
# ADR 0010: Typklasse, Kategorie and airline derived from static curated tables

## Context
The FlightSource (ADR 0005) delivers per Flugzeug the ICAO type code (adsb.lol `t`, e.g. A388, B738), often a coarse emitter category (A1-A7, frequently absent), and the callsign, whose first three letters are the airline's ICAO prefix (e.g. DLH). Typklasse is shared language between airspace, the design system's liveries and the sighting-log. ADR 0009 fixes the ten Typklasse ids (`narrowbody`, `widebody`, `jumbo-hump`, `double-decker`, `regional-jet`, `turboprop`, `business-jet`, `light-aircraft`, `glider`, `helicopter`) and the livery catalog (ids such as `lh`, `ryan`, `ba`, plus the Standard-Lackierung `def`); `light-aircraft` and `glider` only have `def`. ADR 0001 requires free data behind an anticorruption layer; ADR 0007 forbids persisting data with restrictive terms. The research verified VRS standing-data (CC0-1.0, folders `airlines`, `model-type`, `aircraft`) as shippable; ICAO Doc 8643 reuse terms and tar1090-db/Mictronics are licence-unverified; OpenFlights airlines.dat is ODbL but a stale 2012 snapshot. This follows the architect's draft with the deviations named under "Deviations".

## Decision
1. **Three static, versioned tables shipped in the repo** (data files read at start-up inside the airspace module, validated like config per ADR 0007; not live API lookups, not DB rows):
   - `type-classes`: ICAO type designator -> `{typklasse, kategorie, besonderheit?}`. `typklasse` must be one of the ADR 0009 ids (validated at load; unknown id fails start-up). `kategorie` is a curated Steckbrief value (Kurzstrecke, Mittelstrecke, Langstrecke, Regional, Geschäftsreise, Allgemeine Luftfahrt, Segelflug, Hubschrauber), not computed from the route. Optional `besonderheit` free text (e.g. "Doppelstock").
   - `airlines`: ICAO 3-letter prefix -> `{name, country}`.
   - `airline-liveries`: ICAO prefix -> livery id of the design-system catalog (e.g. DLH -> `lh`, RYR -> `ryan`, BAW -> `ba`, EWG -> `ew`). Validated against the catalog ids at load. Kept separate from `airlines` so that naming an airline never depends on a drawn livery existing (many airlines have a name but no livery).
2. **Seeding and licence:** seed `airlines` (and, where its schema permits, type designators) from VRS standing-data (CC0-1.0); hand-curate `type-classes` for the roughly 100 types that dominate traffic and `airline-liveries` for the airlines in the design-system catalog. Do not ship ICAO Doc 8643, tar1090-db or Mictronics data until their terms are confirmed. OpenFlights is not used (stale). The VRS `model-type` schema was not read in the research; the curated Typklasse/Kategorie columns are our own work regardless of what it provides.
3. **Typklasse resolution order:** (a) exact type-code hit in `type-classes`; (b) fallback by emitter category: A1 -> `light-aircraft`, A2 -> `regional-jet`, A3 -> `narrowbody`, A4 -> `narrowbody`, A5 -> `widebody`, A6 -> `business-jet`, A7 -> `helicopter`; (c) otherwise a neutral class (`narrowbody` silhouette) with Kategorie "unbekannt". A fallback result never carries a Besonderheit and is flagged as fallback.
4. **Airline and livery resolution:** airline = lookup of the callsign's first three letters, only when the callsign matches `^[A-Z]{3}[0-9]` (avoids treating GA registrations as airline prefixes). Livery = `airline-liveries` entry if present, else `def`. The livery is forced to `def` for `light-aircraft` and `glider` (consistent with ADR 0009). Unknown prefix: Standard-Lackierung; the announcement names the airline if the `airlines` table knows it, otherwise names none.
5. **Unmapped keys are reported:** every type code or airline prefix without a table entry is recorded through the sighting-log (as a distinct "unmapped" marker with the key and count) so the builder sees what to add. Curation is a table edit plus a release.
6. **Anticorruption:** the tables are the only place that knows ICAO codes; downstream contexts (sky-scene, sighting-log, design system) receive Typklasse id, Kategorie, Besonderheit, airline name and livery id only.

## Deviations from the architect's draft
- Added the explicit `airline-liveries` table and the validation against ADR 0009 ids (the draft only said "unknown prefix -> Standard-Lackierung"); needed so the airline -> livery mapping lines up with the design-system catalog.
- Replaced the vague "seeded from public ICAO-designator data" with the licence-verified source decision (VRS CC0 yes; Doc 8643, tar1090-db, Mictronics no).
- Fixed the emitter-category fallback table concretely using the verified A1-A7 meanings (the draft only named A1, A3-A5, A7); A2/A6 added.
- Added the callsign pattern guard and the forced `def` livery for Typklassen without liveries.

## Consequences
### Positive
- Deterministic, offline, unit-testable, no extra API calls or latency; curation gaps are visible via the sighting-log.
- Table validation catches drift between airspace and the design-system catalog at start-up.
### Negative
- New types, airlines and liveries need a table edit and release.
- Callsign prefix is wrong for some GA, wet-lease and codeshare flights; the airline shown may then be incorrect.
- The emitter fallback is coarse (A3 vs A4 both map to `narrowbody`; jumbo and double-decker only via exact type code).
### Neutral
- VRS standing-data attribution/provenance must be recorded with the shipped seed; the `model-type` schema still has to be inspected when the seed is built.

## Alternatives considered
- **Live type/airline API lookups** - extra dependency and latency for static data; adsbdb terms forbid persisting (ADR 0005).
- **Heuristics on wingspan/engines** - no such data from ADS-B.
- **Merging airline name and livery into one table** - couples naming to artwork; most airlines have no drawn livery.
- **Shipping ICAO Doc 8643 / tar1090-db wholesale** - licence unverified.
