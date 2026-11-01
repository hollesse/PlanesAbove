---
id: sighting-log-js2t1
title: Endpunkt GET /api/stats/sightings-by-class — Sichtungen je Airline × Typklasse (ADR 0033)
status: done
type: feature
context: sighting-log
created: 2026-11-01
completed:
depends_on: [infrastructure-cc9gq]
blocks: []
tags: [editor, stats, api]
related_adrs: [0033]
related_research: []
prior_art: []
---

## Why
Der Lackierungs-Editor soll Airline und Typklasse aus den echten Sichtungen wählen und Lücken anzeigen (ADR 0033). Dafür fehlt der lesende Endpunkt auf dem Heimserver.

## What
`GET /api/stats/sightings-by-class?days=&standort=` in `src/server/modules/sighting-log/` neben `/api/stats/routes` und `/api/stats/liveries` (`stats-api.ts`, gleiche `parseStatsParams`-Logik, gleiche Standort-Semantik wie `liveryStats`). Antwort: `{ days, standort, rows: [{ prefix, airline, typklasse, count, lastSeenMs, samples }] }`, `rows` absteigend nach `count`, dann `lastSeenMs`. `prefix` = ICAO-Präfix aus dem Callsign (wie `prefixOf` in `livery-stats.ts`, `'?'` wenn keiner), `airline` = aufgelöster Name oder `null` (dann „Airline fehlt im Katalog“ im Editor). Zählt alle Sichtungen im Zeitfenster unabhängig von `livery_present`, nur angezeigte (`slot IS NOT NULL`), ohne `light-aircraft`/`glider`. `samples`: höchstens 3 Beispiel-Sichtungen `{ icao24, registration, callsign, lastSeenMs }` (die jüngsten). Logik als reine Funktion `sightingsByClass(db, opts)` in `sightings-by-class.ts` nach dem Muster von `livery-stats.ts` (importfrei, Node-strippbar), damit auch ein `scripts/stats-*`-Aufruf möglich wäre.

## Acceptance criteria
- [ ] `sightingsByClass` liefert je Kombination Präfix × Typklasse genau einen Eintrag mit korrektem `count`, `lastSeenMs` und höchstens 3 jüngsten `samples`; Sortierung count desc, lastSeenMs desc (Unit-Tests mit In-Memory-SQLite wie in den bestehenden Stats-Tests).
- [ ] Sichtungen außerhalb `days`, ohne `slot`, oder mit Typklasse `light-aircraft`/`glider` zählen nicht; `standort`-Filter wirkt wie bei `/api/stats/liveries` (Unit-Tests).
- [ ] `GET /api/stats/sightings-by-class` antwortet mit JSON im beschriebenen Format, `days` Default und Grenzen wie die Nachbar-Endpunkte; unbekannter Präfix erscheint mit `airline: null` (Server-Contract-Test).
- [ ] `npm test` und `npm run typecheck` grün.

## Notes
ADR 0033 Punkt 1. Keine Lückenlogik im Server (Punkt 3). Reale config.yaml anpassen: nein.

## Verifier note (iteration 1)

REASONS:
- Criterion 3 ("unbekannter Präfix erscheint mit `airline: null` (Server-Contract-Test)") is not covered at the server-contract layer: the new stats-api.test.ts test never asserts `airline: null`; the fixture seeds only non-null airlines, and the one unknown-prefix assertion rewrites a callsign to 'ZZ1' and asserts the '?' row has airline 'Emirates'. Test name and assertions disagree.
- null-airline behaviour is covered only at unit level (sightings-by-class.test.ts, XYZ → null).
- Criteria 1, 2 covered by unit tests; days default/limits via parseStatsParams tested; npm test (758 passed) and typecheck green. The `samples[].registration = null` deviation is acceptable (documented, field stays `string | null`).

SUGGESTED_FIX: In stats-api.test.ts, insert/update a sighting with an unknown callsign prefix AND a null stored airline (e.g. set `airline = NULL` on the 'ZZ1' row), then assert GET /api/stats/sightings-by-class returns that row with `airline: null`. Drop or fix the contradictory "'?' row is Emirates" assertion.

ITERATION_HINT: likely-fixable

## Outcome
Added the pure function `sightingsByClass(db, opts)` in `src/server/modules/sighting-log/sightings-by-class.ts` (one row per ICAO prefix x typklasse with count, lastSeenMs, up to 3 newest samples; sorted count desc then lastSeenMs desc; excludes out-of-window, slot-less, light-aircraft/glider; Standort semantics like liveryStats). Wired `GET /api/stats/sightings-by-class` in `stats-api.ts` using `parseStatsParams`. Unit tests in `tests/unit/server/sightings-by-class.test.ts`; server contract test in `tests/unit/server/stats-api.test.ts` (JSON equals function output, 400 on bad input, and an unknown-prefix sighting with NULL airline is returned as `airline: null`). `samples[].registration` is null (no registration column; field stays string | null). npm test and typecheck green.
