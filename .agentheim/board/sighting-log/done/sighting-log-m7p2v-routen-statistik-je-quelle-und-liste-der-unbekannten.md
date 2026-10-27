---
id: sighting-log-m7p2v
title: Routen-Statistik per CLI je Tag und Quelle, Liste der Unbekannten, Konflikte (nur Befunde, nie Routentext)
status: done
type: feature
context: sighting-log
created: 2026-10-27
completed:
depends_on: [airspace-r5n3k]
blocks: []
tags: [statistik, routes, live-test]
related_adrs: [0007, 0016]
related_research: []
prior_art: [airspace-r5n3k]
---

## Why
Seit airspace-r5n3k hält `sightings.route_source` fest, welche Quelle (`vrs`, `adsbdb`, NULL) die Route geliefert hat. Der Betreiber will sehen, welche Flüge "Route unbekannt" bekommen und welcher Dienst wann liefert, um die Kette (Reihenfolge, hexdb aus airspace-w3k8d, ggf. ein Tracking-Dienst) datengetrieben zu entscheiden. Heute geht das nur per Hand-SQL, und `route_source` allein zeigt nicht, ob eine verworfene oder nicht erreichbare Quelle der Grund für "unbekannt" war.

## What
**Lizenzregel (verbindlich, ADR 0016):** pro Sichtung und Routenquelle wird ausschliesslich der BEFUND gespeichert: `hit` | `unknown` | `unavailable` | `rejected` (Korridor-Plausibilitätsprüfung fehlgeschlagen) plus ein Flag, ob ein Konflikt auftrat (zwei Quellen lieferten plausible, aber verschiedene Routen). Es werden NIE Flughafen-Codes oder Routentext von adsbdb/hexdb in SQLite geschrieben. VRS-Text lebt weiter wie heute nur in `sightings.route`.

1. **airspace (Daten übergeben, nicht schreiben):** `RouteInfo` aus `route-service.ts` um `attempts: Array<{source, outcome}>` und `conflict: boolean` erweitern (plain data; `source` = `adsbdb` | `vrs` | später `hexdb`; `outcome` wie oben). Die Kette befüllt das je Quelle aus dem bereits bekannten Ergebnis. Bei Cache-Treffern (kein neuer Lookup) bleibt `attempts` leer. Konflikt: zusätzlich nur die Namen der uneinigen Quellen und die gewählte Quelle (`conflict_sources`, `chosen_source`), keine Routendaten. airspace schreibt nie in die Tabelle.
2. **sighting-log (Migration 0003):** neue Tabelle `route_lookups(id, sighting_id REFERENCES sightings, source, outcome, conflict, looked_up_at)`, ggf. `conflict_sources` (kommagetrennte Quellnamen) und `chosen_source` nur an Konflikt-Zeilen; Index auf `sighting_id` und `looked_up_at`. Migration läuft über den PRAGMA-user_version-Mechanismus in `src/server/db.ts`, rein additiv.
3. **Repository:** `recordSighting(..., routeInfo, slot)` speichert `routeInfo.attempts` als `route_lookups`-Zeilen zur Sichtung, sobald welche vorliegen (Takt, in dem der Lookup lief; spätere Takte desselben Besuchs zeichnen nicht neu auf, da `attempts` dann leer ist). Neue Lesemethode(n) für die Statistik, nur `slot IS NOT NULL`.
4. **CLI-Skript** unter `scripts/` (z. B. `scripts/stats-routes.ts`), verdrahtet als `npm run stats:routes -- --db data/planesabove.db --days 7 [--json]`. Liest die SQLite-Datei direkt (read-only), kein HTTP-Endpoint, kein Display-UI (Vision: keine Menüs). Ausgabe als lesbare Tabellen, `--json` für Maschinen:
   - je Tag: Anzahl je finalem `route_source` (`vrs`, `adsbdb`, `hexdb`, `none`) und Anteil "Route bekannt";
   - je Quelle: Zähler `hit`/`unknown`/`unavailable`/`rejected`;
   - Liste der Sichtungen mit Route unbekannt: Zeit, Callsign, Airline, Typklasse;
   - je Airline-Präfix die Unbekannt-Quote (zeigt Charter-Airlines);
   - Konflikte: Anzahl, je Konflikt Callsign, welche Quellen uneins waren, welche gewählt wurde.
5. **README-Abschnitt** zur Nutzung des Skripts und zur Lizenzregel (Befunde statt Inhalte).

## Acceptance criteria
- [ ] Migration 0003 legt `route_lookups` an und läuft auf einer DB im Stand von Migration 0002 (mit vorhandenen Sichtungen) ohne Datenverlust; `user_version` ist danach 3; erneuter Start ist idempotent.
- [ ] `RouteInfo` trägt `attempts` und `conflict`; ein Test der Quellenkette mit Fake-Quellen belegt je Outcome `hit`, `unknown`, `unavailable`, `rejected` die korrekten `attempts`, und bei zwei plausiblen, verschiedenen Routen `conflict = true` samt uneinigen und gewählter Quelle.
- [ ] Auf dem echten SkyService-Pfad (Fake-Kette, die alle vier Outcomes und einen Konflikt liefert) entstehen `route_lookups`-Zeilen zur angezeigten Sichtung mit korrektem `source`, `outcome`, `conflict`, `looked_up_at`.
- [ ] Cache-Treffer und spätere Takte desselben Besuchs erzeugen keine zusätzlichen `route_lookups`-Zeilen (genau ein Lookup-Satz je Callsign und Positiv-TTL).
- [ ] Lizenztest: Nach einem Lauf mit adsbdb-/hexdb-Fixtures, die eindeutige Flughafen-Codes und Routentext enthalten, enthält die SQLite-Datei (Rohbytes/Dump aller Tabellen) keinen dieser Codes oder Texte; VRS-Text steht weiter nur in `sightings.route`.
- [ ] `route_lookups` enthält ausschliesslich Spalten für Befund, Quellname, Konflikt-Flag, Zeit und Sichtungsbezug (Schema-Test gegen `PRAGMA table_info`; keine Routen-/Code-/Textspalte).
- [ ] `npm run stats:routes -- --db <seeded.db>` endet mit Exit-Code 0 und gibt aus einer vorbereiteten DB die Tagestabelle (Zähler je `route_source` inkl. `none` und Anteil "Route bekannt"), die Je-Quelle-Tabelle, die Unbekannt-Liste (Zeit, Callsign, Airline, Typklasse) und die Konfliktliste aus; Werte stimmen mit dem Seed überein.
- [ ] Die Statistik zählt nur Sichtungen mit `slot IS NOT NULL`; ein Seed mit nicht angezeigten Sichtungen belegt, dass sie ausgeschlossen sind.
- [ ] Die Unbekannt-Quote je Airline-Präfix wird korrekt berechnet (Seed mit mindestens zwei Präfixen und unterschiedlichen Quoten).
- [ ] `--json` liefert ein stabiles Schema (Top-Level-Schlüssel `days`, `sources`, `unknown`, `airlines`, `conflicts`; Snapshot-/Schema-Test auf Seed-DB) und ist gültiges JSON ohne weitere Ausgabe auf stdout.
- [ ] `--days N` filtert auf die letzten N Tage (Seed mit Sichtungen innerhalb und ausserhalb des Fensters); fehlende/ungültige `--db` oder fehlende Datei führt zu verständlicher Fehlermeldung und Exit-Code ungleich 0.
- [ ] `npm run typecheck` (bzw. tsc) und die komplette Testsuite sind grün; README-Abschnitt zum Skript und zur Lizenzregel ist vorhanden.

## Notes
Captured via `modeling` am 2026-10-27, am selben Tag refined. Ausgangslage 2026-10-27 12:40-13:30: 29 angezeigte Sichtungen, adsbdb 13, vrs 5, none 11.

Builder-Entscheidungen (final): (1) nur Befunde, nie adsbdb/hexdb-Inhalte persistieren; (2) Zugang nur per CLI-Skript auf die SQLite-Datei, kein HTTP, kein UI; (3) Scope nur angezeigte Sichtungen. Kein neuer ADR nötig: ADR 0007 (BC-eigene Tabellen) und ADR 0016 (adsbdb nie persistiert) decken es ab; die Befund-Ausnahme ist hier festgehalten.

Abhängigkeit zu airspace-w3k8d (hexdb als zweite Quelle, Konfliktregel): `source` ist ein offener Quellname, hexdb ergänzt sich ohne Schemaänderung; ohne w3k8d tritt `conflict` praktisch nie auf, die Spalten und Tests bleiben trotzdem gültig. Reihenfolge der Umsetzung ist unabhängig. Findings werden nur im Takt des echten Lookups aufgezeichnet, weil nur ein Lookup je Callsign und Positiv-TTL stattfindet (In-Memory-Cache).

## Verifier note (iteration 1)
**REASONS:**
- Criterion 1 (migration 0003 on a 0002-level DB with sightings, no data loss, user_version 3, idempotent): no new test — the only new migration test opens a fresh `:memory:` DB and checks the table exists. Follow the 0002 pattern in adsbdb-route-source.test.ts:155 (raw DB, earlier migrations, set user_version, reopen).
- Criterion 3 (live SkyService path with a fake chain producing all four outcomes and a conflict): only partly covered — the SkyService test uses a 2-source chain (unknown + hit) with compareAll off; `unavailable`, `rejected` and a conflict never flow through the live path, and `conflict`/`looked_up_at` are never asserted there.
- Criterion 6 (schema test via `PRAGMA table_info(route_lookups)` whitelisting columns): no test at all (schema itself is licence-clean).
- Criterion 5 (licence scan): only one adsbdb city string checked; no hexdb fixture with route text, no airport codes, no assertion that VRS text appears only in sightings.route.
- Criterion 9 (unknown share per airline prefix): only `airlines[0]` asserted; the second prefix (DLH 0/2) is never checked.
- Context: npm test green (271), typecheck clean, CLI runs under Node 26. RouteLookup instead of RouteInfo extension keeps the intent. The `looked_up_at` index named in What was not added (only the sighting_id index exists) — add it.

**SUGGESTED_FIX:** Add tests to tests/unit/server/route-lookups.test.ts, production code mostly as is: (1) 0002-level DB with sightings migrated to user_version 3, no rows lost, idempotent reopen; (2) PRAGMA table_info column whitelist; (3) SkyService run with compareAll on and a chain covering unavailable, unknown, rejected and two differing hits, asserting conflict and looked_up_at; (4) licence scan widened to all fixture codes/texts incl. a hexdb fixture, plus VRS-text-only-in-sightings.route; (5) assert the second airline prefix. Add the looked_up_at index in migration 0003.

**ITERATION_HINT:** likely-fixable

## Verifier note (iteration 2)
**REASONS:**
- Criterion 12 second half / What item 5: root README.md has no section on using `npm run stats:routes` (flags `--db`, `--days`, `--json` with keys days/sources/unknown/airlines/conflicts, read-only, only shown sightings) and no mention of the licence rule for `route_lookups` (findings only, never adsbdb/hexdb codes or route text; VRS text only in `sightings.route`). Only a one-line comment in the command list was added. `compareAll` (conflicts recorded only when `sources.route.compareAll: true`) is documented only in config.example.yaml.
- All iteration-1 findings are fixed; npm test 275 green, tsc clean.

**SUGGESTED_FIX:** Add a README.md section "Routen-Statistik" covering the script usage, the JSON keys, the licence rule, and the compareAll switch. No production or test changes needed.

**ITERATION_HINT:** likely-fixable

## Outcome

Routen-Befund implemented. Migration 0003 (src/server/migrations/0003-route-lookups.ts) adds route_lookups(id, sighting_id, source, outcome, conflict, chosen, looked_up_at); source is free text, so hexdb etc. need no schema change. airspace: RouteService gets lookupFor() returning RouteLookup {info, attempts: {source, outcome}[], conflict, chosen, fresh}; routeInfoFor() delegates and still returns the unchanged RouteInfo {text, source} (existing tests use toEqual on it, so attempts/conflict live on RouteLookup, not RouteInfo - deliberate deviation from the brief). SkyService calls lookupFor and, only when fresh (real lookup, not cache hit), hands the attempts to the new SightingRepository.recordLookup(), which writes one row per asked source against the visit's latest sighting. Findings only; the licence test scans the DB file for adsbdb route text.

Conflict detection: default mode keeps the early break at the first plausible hit, so conflict is always false and no extra network calls happen. Conflict becomes meaningful only when the chain consults all sources: opt-in config sources.route.compareAll (default false, in config.ts, config.example.yaml, wired in app.ts) asks every source, sets conflict when 2+ plausible routes differ in text, still chooses the first in order. Both modes tested. Note: with compareAll an agreeing second source is also asked (extra requests).

CLI: npm run stats:routes -- --db <file> --days N [--json]; scripts/stats-routes.mjs (better-sqlite3 read-only) imports src/server/modules/sighting-log/route-stats.ts via Node type stripping (Node 26; the module is self-contained, no runtime imports, so no build step). Output: per-day counts by final route_source incl. none + known share, per-source outcome counts (+ chosen), unknown list (time, callsign, airline, typklasse), unknown share per callsign prefix, conflicts. Only slot IS NOT NULL sightings within the window (last_seen_ms). JSON keys: days, sources, unknown, airlines, conflicts. Missing --db / file / non-sightings DB exits 1; a pre-0003 DB still works. Iteration 2 added the looked_up_at index (route_lookups_time) and tests: 0002-to-0003 upgrade (user_version 3, no rows lost, idempotent reopen), column whitelist + index list, live compareAll Takt with unavailable/unknown/rejected/two differing hits (conflict, chosen, looked_up_at), widened licence scan (adsbdb+hexdb codes/texts absent, VRS text only in sightings.route), second airline prefix share. Tests: tests/unit/server/route-lookups.test.ts (17); suite 275 green, typecheck green.

Airspace README wording needed (not edited by me): RouteService additionally exposes lookupFor() with per-source findings (hit/unknown/unavailable/rejected) and a conflict flag; opt-in sources.route.compareAll consults all sources. Iteration 3 added the "Routen-Statistik" section to the root README.md (usage, tables, --json keys, licence rule, compareAll note). Notes: an all-unavailable lookup records its findings but is not cached, so it writes a new row set each Takt while the sources stay down; package.json on main carries uncommitted changes of its own, only the stats:routes script line is mine.
