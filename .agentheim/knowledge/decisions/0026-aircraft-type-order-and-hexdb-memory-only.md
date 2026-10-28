---
id: ADR-0026
title: Aircraft type order override > hexdb > flight source; hexdb type only in memory, own derived Typklasse and type_source may be stored
scope: airspace
status: accepted
date: 2026-10-28
supersedes: []
superseded_by: []
related_tasks: [airspace-t4x9k]
related_adrs: [0010, 0016]
related_research: []
---

# ADR-0026: Aircraft type order override > hexdb > flight source

Amends ADR 0010 (curated tables) and ADR 0016 (hexdb amendment: memory only).

## Context

The flight source (adsb.fi / adsb.lol) enriches the type from a shared aircraft database that is sometimes wrong: OE-FML (hex 4400fe, a Diamond DA42) arrived as C525 and was shown as a business jet. The silhouette is the core of the display, so a wrong type is a visible error. hexdb.io returns the correct ICAOTypeCode for the hex. hexdb states no licence and is treated like adsbdb (ADR 0016).

## Decision

1. **Order.** The type code of a hex is, in this order: (1) the own correction table `tables/type-overrides.json` (hex -> ICAO type, hand-maintained, validated at start by `loadTables`: 6-char lower-case hex, type must exist in `type-classes`; hexdb is not asked for such hexes), (2) hexdb `GET /api/v1/aircraft/{hex}` when its ICAOTypeCode differs from the flight source's, (3) the flight source. The result runs through the unchanged `resolveTypeClass`.
2. **Licence boundary.** hexdb results live only in an in-memory cache (TTL 24 h, max 5000 entries, config `sources.aircraftType.hexdb.cacheTtlHours`). They are never written to SQLite, not in `type_code`, not in `unmapped_keys` (an unmapped code is only reported when the source is `flight`), not in any other column.
3. **What is stored.** `sightings.type_code` stays the flight source's own value. New column `type_source` (`flight` | `override` | `hexdb`, migration 0007, default `flight`) and `typklasse` (our own derived classification, which was already stored). Storing the derived `typklasse` is allowed: it is our own derivation from our own table, an enum of ten silhouettes, not a copy of the hexdb record, and it cannot be turned back into hexdb's type code. If the displayed type changes during an open visit, typklasse and type_source are updated to the latest.
4. **Availability.** 404 / no type is cached (genuinely unknown). Timeout, network error, 5xx and 429 are never cached; the flight source's type is shown and the next Takt asks again. 429 starts a backoff that is ONE window shared with the hexdb route adapter (`HexdbBackoff`, created once in app.ts; same host; duration `sources.route.hexdb.backoffMinutes`): a 429 on either stops both until it ends. The lookup runs inside the Takt before the selection is shown, bounded by a hard deadline `sources.aircraftType.hexdb.timeoutMs` (default 2000, own value because it delays the Takt). A later class change of an already shown plane is allowed and logged.
5. **Switches.** `sources.aircraftType.hexdb.enabled` (default true); off in mock mode (factory `buildAircraftTypeSource`). Every correction is logged once as `aircraft type corrected` (hex, flightType, correctedType, source).

## Consequences

Only shown planes (the Auswahl) are cross-checked, which bounds the hexdb load. Rejected: persisting the hexdb type (licence), hexdb as default over the override (the operator needs a way to pin a type).
