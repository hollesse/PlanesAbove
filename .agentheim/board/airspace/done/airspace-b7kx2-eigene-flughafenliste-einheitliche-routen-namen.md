---
id: airspace-b7kx2
title: Eigene Flughafenliste, damit Routen unabhängig vom Anbieter gleich aussehen
status: done
type: feature
context: airspace
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [airports, routes]
related_adrs: [0010, 0014, 0016, 0021]
related_research: []
prior_art: []
---

## Why
Heute hängt der Stadtname einer Route vom Anbieter ab: adsbdb nimmt die Gemeinde (`municipality`), hexdb den Flughafennamen ohne „(International) Airport“, der VRS-Snapshot die Spalte „Location“ der CSV-Stammdaten. Dieselbe Strecke sieht je nach Quelle anders aus, und ein Flughafen kann je nach Antwort zwei Namen haben.

## What
Eine eigene, statische Flughafen-Tabelle (ICAO → Stadt + IATA). Jede Route wird vor der Anzeige über ihre ICAO-Codes namensgleich dargestellt, egal welche Quelle sie geliefert hat. Anzeigeformat: `Frankfurt (FRA) → Lissabon (LIS)`. Hat ein Flughafen keinen IATA-Code, steht nur die Stadt da (`Stadt → …`).

Umsetzung:
- `Airport` (`src/server/modules/airspace/model.ts`) bekommt ein Feld `icao` (optional, damit bestehende Tests und Fixtures ohne Änderung gültig bleiben). Die Adapter setzen es aus der Quelle: adsbdb `icao_code`, hexdb `icao`, VRS-Snapshot Spalte `ICAO` (Schlüssel der Airport-Map), FlightAware `code_icao`/`code`. Der IATA-Code kommt ebenfalls aus der Quelle, soweit geliefert: adsbdb `iata_code`, hexdb `iata`, VRS-Snapshot Spalte `IATA`.
- Neue Tabelle `src/server/modules/airspace/tables/airports.json`: ICAO → `{ "city": "…", "iata": "…" }` (`iata` optional), nach dem Muster von `tables/airlines.json` und über `loadTables`/`defaultTables` geladen (ADR 0010).
- `formatRoute` (`route-service.ts:9`) baut je Endpunkt `Stadt (IATA)` aus der Tabelle. Ohne Tabelleneintrag bleibt der Anbieter-Name stehen, und der ICAO-Code wird einmal je Prozess als Warnung ins Log geschrieben, damit die Lücke sichtbar wird.
- Startbestand der Tabelle: alle Flughäfen, die in den VRS-Routen zu den Rufzeichen der heutigen Sichtungen vorkommen (Quelle: `data/vrs-standing-data/`). Stadt aus der VRS-Spalte „Location“, IATA aus „IATA“. Nur Korrekturen, wo der VRS-Name offensichtlich nicht der übliche Stadtname ist, werden von Hand gesetzt.
- Gespeicherte Routentexte (`sightings.route`, nur bei VRS) werden nicht nachträglich umgeschrieben. Neue Sichtungen bekommen das einheitliche Format, alte behalten ihren Text. Kein Backfill.

## Acceptance criteria
- [ ] `Airport` hat das optionale Feld `icao`; alle vier Adapter (adsbdb, hexdb, vrs, flightaware) setzen es. Je Adapter gibt es einen Test, der den ICAO-Code aus einer Fixture-Antwort prüft.
- [ ] Eine Fixture-Route (dieselbe Strecke) liefert über adsbdb, hexdb und den VRS-Snapshot denselben Routentext aus `formatRoute`, im Format `Frankfurt (FRA) → …`, wenn die Tabelle Einträge für ihre ICAO-Codes hat. Ein Test prüft das.
- [ ] Ein Flughafen ohne IATA-Code wird ohne Klammer angezeigt. Ein Test prüft das.
- [ ] Ohne Tabelleneintrag wird der Anbieter-Name verwendet und genau eine Warnung je ICAO-Code und Prozess geschrieben. Ein Test prüft Fallback und die einmalige Warnung.
- [ ] `tables/airports.json` ist über `defaultTables()` erreichbar und wird beim Laden validiert (Schlüssel ist ein 4-stelliger ICAO-Code, `city` ist nicht leer, `iata` ist, falls vorhanden, ein 3-stelliger Code). Ein Test prüft Gültigkeit und das Laden.
- [ ] Ein Skript oder Test zeigt, dass jeder ICAO-Code aus den VRS-Routen der heutigen Sichtungen in der Tabelle steht; die Liste der fehlenden Codes ist leer.
- [ ] `npm test` und `npm run typecheck` sind grün.

## Notes
- Refine 2026-10-27 (modeling, REFINE). Die offenen Fragen aus dem Capture sind mit Defaults entschieden:
  - **Stadt plus IATA-Code.** Die Anzeige zeigt die Stadt, ergänzt um den IATA-Code in Klammern (`Frankfurt (FRA)`), wie vom Betreiber gewünscht. Der IATA-Code kommt aus der Tabelle, nicht aus der Quelle, damit alle Anbieter gleich aussehen. Flughafennamen (z. B. „Frankfurt Airport“) werden nicht angezeigt.
  - **Sprache: wie im VRS-Snapshot** (meist englisch oder lokal), nur Korrekturen von Hand. Eine deutsche Namensliste wäre eine eigene Übersetzungsarbeit und ist nicht nötig, um die Gleichheit zwischen Anbietern herzustellen.
  - **Pflege:** Die Tabelle ist im Repo versioniert. Unbekannte ICAO-Codes erscheinen als Warnung im Log, die Ergänzung passiert per Commit. Kein automatisches Nachladen.
- Die Live-Quellen (adsbdb, hexdb) speichern nichts (ADR 0016). Die Tabelle wirkt deshalb nur auf die Anzeige und die neuen VRS-Sichtungen, nicht auf gespeicherte Altdaten.
- Refinement ohne Orchestrator: der Umfang ist auf `src/server/modules/airspace/` begrenzt; die Specialists wären hier nur Kosten ohne Erkenntnisgewinn.

## Verifier note (iteration 1)
**REASONS:**
- Criterion 6 (jeder ICAO-Code aus den VRS-Routen der Sichtungen steht in der Tabelle) ist nicht erfüllt: `PA_DATA_DIR=<main>/data npx vitest run tests/unit/server/airport-table.test.ts` → `expected [ 'LRTR' ] to deeply equal []`. LRTR (Timişoara, TSR) fehlt in `tables/airports.json`.
- Ursache: Sichtung id 635, Rufzeichen WMT448 (20:31:24Z), kam nach dem Seed-Lauf in die Live-DB.
- Robustheit: Der Test prüft die wachsende Live-DB; jede neue Sichtung mit neuem Flughafen lässt ihn wieder rot werden, sobald PA_DATA_DIR gesetzt ist. Im Standard-`npm test` ohne data/ wird er übersprungen.
- Sonst alles grün: `npm test` (475 passed, 1 skipped), `npm run typecheck` exit 0, keine `.agentheim/`-Pfade im Diff.

**SUGGESTED_FIX:** `node scripts/airports-seed.mjs <main>/data --write` erneut laufen lassen (fügt LRTR und ggf. weitere Codes hinzu), neue Stadtnamen prüfen, Seed-Coverage-Test mit PA_DATA_DIR erneut ausführen. Überlegen, ob das Kriterium gegen einen festen Sichtungsstand (Snapshot) statt der wachsenden Live-DB prüfen sollte.

**ITERATION_HINT:** likely-fixable

## Outcome

Own airport table `src/server/modules/airspace/tables/airports.json` (209 airports, seeded from VRS for all callsigns in the sightings DB first seen up to the fixed cutoff 2026-10-27T20:40:00Z (same constant `SEED_CUTOFF` in `scripts/airports-seed.mjs` and the coverage test, so the criterion stays reproducible while the live DB grows), ~20 hand-corrected city names) wired through `loadTables`/`defaultTables` with validation. `Airport` has optional `icao`/`iata`, set by the adsbdb, hexdb, VRS and FlightAware adapters. `formatRoute(route, table?, onMissing?)` renders `Stadt (IATA)`; `RouteService` takes `airports` (passed in `app.ts`) and warns once per ICAO. `scripts/airports-seed.mjs` regenerates/extends the table. Tests: `tests/unit/server/airport-table.test.ts` (seed coverage test runs when `data/` exists or `PA_DATA_DIR` is set, empty missing list verified). ADR-0021 provisional. 476 tests green, typecheck clean.
