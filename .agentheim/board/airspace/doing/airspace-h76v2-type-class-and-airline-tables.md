---
id: airspace-h76v2
title: Decide Typklasse, Kategorie and airline derivation from static curated tables
status: doing
type: decision
context: airspace
created: 2026-10-26
completed:
depends_on: []
blocks: [infrastructure-001-walking-skeleton]
tags: [foundation, enrichment, type-class]
related_adrs: [0001]
related_research: [free-flight-weather-tts-apis-2026-10-26]
prior_art: []
---

## Why
Vision open question: how the ICAO type code maps to the 10 Typklassen and a Kategorie, and how the airline is identified — shared language with liveries and sighting-log.

## What
Record the architecture decision as an ADR (scope: `airspace`), based on the architect's draft below (or the builder's amended version).

## Acceptance criteria
- [ ] ADR committed under `.agentheim/knowledge/decisions/`, status `accepted`, scope `airspace`.
- [ ] Justification matches the architect's draft (or the user-amended version); deviations are named in the ADR.
- [ ] No code change required.

## Notes
**Verified research (2026-10-26, reviewer PASS):** `../../../knowledge/research/free-flight-weather-tts-apis-2026-10-26.md`
- **Seed source:** VRS standing-data (CC0-1.0), with folders `airlines`, `model-type` and `aircraft`. It is usable offline and shippable.
- **Do not ship (licence unverified):** ICAO Doc 8643 reuse terms and tar1090-db / Mictronics.
- **OpenFlights airlines.dat** is ODbL but a 2012 snapshot, so it is outdated.
- **Emitter categories verified:** A1 light, A2 medium 1, A3 medium 2, A4 high vortex, A5 heavy, A6 high performance, A7 rotorcraft.

**Load-bearing for walking skeleton:** yes (minimal table)


### Architect's ADR draft

---
id: TBD
title: Typklasse, Kategorie and airline derived from static curated tables
scope: airspace
status: proposed
date: 2026-10-26
---

## Context
Live data gives the ICAO type code (e.g. A388, B738) and a coarse emitter category; the airline is implied by the callsign prefix (e.g. DLH). Liveries and sighting-log share Typklasse as language.

## Decision
- Versioned `type-classes` table: ICAO type designator → Typklasse, Kategorie, optional Besonderheit text (e.g. "Doppelstock"), seeded from public ICAO-designator data, hand-curated for the ~100 types that dominate traffic.
- Unknown type → fall back by emitter category (A1 light, A3–A5 large/heavy, A7 rotorcraft) to the nearest Typklasse; otherwise a neutral class and Kategorie "unbekannt".
- Static `airlines` table: ICAO 3-letter prefix → name, country. Unknown prefix → Standard-Lackierung; the announcement still names the airline if known.
- Unmapped types/airlines are recorded via the sighting-log so the builder sees what to add.

## Consequences
### Positive
- Deterministic, offline, testable, no extra API calls; curation gaps visible.
### Negative
- New types need a table edit; callsign prefix is wrong for some GA / wet-lease flights.
### Neutral
- Licensing/attribution of the seed dataset must be checked.

## Alternatives considered
- **Live type/airline API lookups** — extra dependency and latency for static data.
- **Heuristics on wingspan/engines** — no such data from ADS-B.
