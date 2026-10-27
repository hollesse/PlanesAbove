---
id: airspace-m3w9c
title: VRS standing-data (CC0) als einzige Standard-RouteSource mit Offline-Snapshot, routeset entfernen
status: done
type: feature
context: airspace
created: 2026-10-27
depends_on: [infrastructure-001-walking-skeleton]
blocks: []
tags: [routes, follow-up]
related_adrs: [0005, 0007, 0010, 0013, 0014]
related_research: []
prior_art: [infrastructure-001-walking-skeleton]
---

## Why
Der Live-Test vom 2026-10-27 (176 Sichtungen, 0 mit Route) zeigte: `POST adsb.lol/api/0/routeset` liefert fuer jeden Callsign HTTP 201 mit leerem Body, der Endpunkt ist tot. ADR 0014 macht deshalb den offline VRS-standing-data-Snapshot (CC0) zur einzigen Standard-Routenquelle und entfernt den routeset-Adapter. Lokaler Snapshot: kein Rate-Limit, keine Weitergabe-Risiken, funktioniert offline. Luecken (z. B. EWG9UX, LOT1RF, CFG068) bleiben real, `Route unbekannt` ist weiterhin ein regulaerer Zustand.

## What
- **Snapshot-Download:** periodisch `routes/schema-01/` und `airports/schema-01/` aus `vradarserver/standing-data` (GitHub-Tarball oder nur diese Baeume, ~22 MB) nach `dataDir`; Schreiben in ein temporaeres Verzeichnis, dann atomarer Austausch (rename).
- **Index im Speicher** beim Start: Callsign -> Route. Kein HTTP pro Lookup.
- **Layout:** `routes/schema-01/<erster Buchstabe>/<AirlineCode>-all.csv`, grosse Airlines geteilt in `<AirlineCode>-1.csv` ... `-9.csv`. Header `Callsign,Code,Number,AirlineCode,AirportCodes`; `AirportCodes` = ICAO-Codes mit `-`, auch mehr als zwei Legs. Airports: `airports/schema-01/<L>/<LL>.csv`, Header `Code,Name,ICAO,IATA,Location,CountryISO2,Latitude,Longitude,AltitudeFeet`. Alle Dateien beginnen mit UTF-8-BOM.
- **Aufloesung** der Flughaefen zu Stadtnamen (`Location`) und Koordinaten; `formatRoute` ("Stadt -> Stadt") und `isPlausibleRoute` (Korridor-Check ueber Koordinaten) arbeiten weiter.
- **Entfernen:** `adapters/adsb-lol-routeset.ts`, dessen Fixture und Contract-Tests; Verdrahtung in `app.ts`.
- **Config** `sources.route`: `order` (nur `vrs`, optional `adsbdb`; Default `[vrs]`) und ein Refresh-Intervall-Schluessel (z. B. `snapshotRefreshHours`, Default 24).
- **Logging:** fehlgeschlagener Refresh und fehlender Snapshot als `warn`.
- README: Quellenangabe "VRS standing-data (CC0)" mit Herkunft; routeset-Hinweise entfernen.
- Persistierter Routen-Cache ist ausgelagert nach airspace-p2v6d (ADR 0014).

## Acceptance criteria
- [ ] Snapshot-Download legt `routes/` und `airports/` in `dataDir` ab; der Austausch ist atomar (Test: bei abgebrochenem Download bleibt der alte Snapshot unveraendert und lesbar).
- [ ] Config-Schluessel fuer das Refresh-Intervall existiert, ist validiert (positiv) und hat einen Default; Test, dass ein Refresh nach Ablauf (FakeClock) angestossen wird.
- [ ] Start ohne Netz mit vorhandenem Snapshot baut den Index und liefert Routen (Test mit fehlschlagendem fetch).
- [ ] Start ohne jeden Snapshot und ohne Netz: Service startet, loggt `warn`, jede Abfrage ergibt `Route unbekannt` (Test).
- [ ] Fehlgeschlagener Snapshot-Refresh loggt `warn` und behaelt den bisherigen Index (Test).
- [ ] CSV-Parser: UTF-8-BOM wird entfernt; geteilte Dateien (`RYR-1..-9`) und `-all` werden zusammengefuehrt; mehrlegige `AirportCodes` ergeben eine Route mit allen Legs; kaputte/unvollstaendige Zeilen werden uebersprungen ohne Absturz (Unit-Tests).
- [ ] Airport-Aufloesung ICAO -> Stadtname und Koordinaten aus den Airports-CSVs; unbekannter ICAO ergibt `Route unbekannt` statt Fehler (Test).
- [ ] `isPlausibleRoute` nutzt weiterhin die Airport-Koordinaten; unplausible Route wird als `Route unbekannt` ausgegeben (Test).
- [ ] Contract-Tests gegen eine eingecheckte, aufgezeichnete Fixture-Teilmenge unter `tests/fixtures/` (inkl. BOM, geteilte Airline, Multi-Leg, Callsign ohne Treffer): bekannt (RYR6ZM, DLH400), unbekannt (EWG9UX), kaputte Zeile.
- [ ] `sources.route.order` akzeptiert nur `vrs` und optional `adsbdb`; jeder andere Wert (z. B. `adsblol`) wird von der Config-Validierung abgelehnt (Test).
- [ ] `adapters/adsb-lol-routeset.ts`, seine Fixture und Tests sind geloescht; kein Verweis mehr im Code (`grep -ri routeset src tests` leer).
- [ ] README nennt "VRS standing-data (CC0)" als Quelle samt Link; Typecheck, Lint und Tests gruen.

## Notes
- adsbdb-Adapter ist nicht Teil dieser Task; `adsbdb` in `order` ist nur als Config-Wert vorgesehen (Online-Lookup, nie persistiert, ADR 0005/0014). Ist kein Adapter verdrahtet, wird der Eintrag mit `warn` ignoriert.
- Verifizierte VRS-Fakten: 1576 Routen-Dateien (~19 MB), 659 Airport-Dateien (~2.5 MB), Repo taeglich aktualisiert, Lizenz CC0-1.0, GitHub-Tarball des ganzen Repos ~50 MB (daher besser nur `routes/` und `airports/`).
- Befund Live-Test 2026-10-27 (Oberweyer, echter Betrieb): routeset antwortet fuer jeden Callsign mit 201 und leerem Body (DLH400, RYR6ZM); Request entspricht OpenAPI (`{"planes":[{"callsign","lat","lng"}]}`) und `api_routes.py`. Nicht erneut dagegen bauen.
- Der deprecated `GET /api/0/route/{callsign}` leitet per 302 auf einen statischen VRS-Spiegel um: `https://vrs-standing-data.adsb.lol/routes/<erste zwei Zeichen>/<CALLSIGN>.json` (z. B. `RY/RYR6ZM.json` -> LEAL-EGBB, `DL/DLH400.json` -> EDDF-KJFK; Felder `callsign`, `number`, `airline_code`, `airport_codes`, `_airport_codes_iata`, `_airports[]`; unbekannt = 404 mit HTML). Gleiche Datenbasis; moeglicher Online-Fallback oder Fixture-Quelle, ersetzt den Snapshot nicht.
- Luecken am Testtag: EWG9UX, LOT1RF, CFG068 fehlen; RYR6ZM, DLH400 vorhanden.

## Verifier note (iteration 1)
**REASONS:**
- Criterion 2 ("Test, dass ein Refresh nach Ablauf (FakeClock) angestossen wird") has no test that can fail: `tests/unit/server/vrs-route-source.test.ts` 'triggers a refresh after the configured interval (FakeClock)' calls `await clock.advance(2 * 3_600_000)` and then `await src.refresh()` directly before asserting `calls >= 1`, so the assertion passes whether the scheduler fired or not. Mutation check: replacing `return this.o.clock.every(this.o.refreshMs, () => { void this.refresh(); });` with `return () => {};` in `vrs-route-source.ts` left all 13 tests green.
- Secondary: the BC README's `Routenquelle (RouteSource)` bullet still lists "adsb.lol routeset" as an adapter; readmeDelta has only two `append` ops and no `replace` op removing routeset from that bullet.
- Minor: root README.md has a stray unclosed opening parenthesis in the new fixture sentence ("Details in `vrs/README.txt`; (`adsblol-point-frankfurt.json` ...").
- Passed: `npm test` exit 0 (210 tests), `tsc` clean, `grep -ri routeset src tests` empty, atomic swap / offline start / no-snapshot warn / failed-refresh keeps index / config rejects `adsblol` all have real offline tests.

**SUGGESTED_FIX:** Rewrite the FakeClock refresh test: drop the direct `src.refresh()` call and assert `calls` goes 0 -> 1 using only `clock.advance` past `refreshMs` (await a microtask flush or the `refreshing` promise if needed) so the test fails when `clock.every` is not wired. Add a `replace` op to README_DELTA for the **Routenquelle (RouteSource)** bullet that removes "adsb.lol routeset". Fix the stray parenthesis in README.md.

**ITERATION_HINT:** likely-fixable

## Outcome

VRS standing-data (CC0) ist als einzige Standard-RouteSource umgesetzt: Offline-Snapshot (routes/airports) wird atomar getauscht und im Speicher indexiert (VrsRouteSource in src/server/modules/airspace/adapters/vrs-route-source.ts), periodisch ueber die Clock aktualisiert; mehrlegige Routen werden unterstuetzt; der adsb.lol-routeset-Adapter ist entfernt. Tests in tests/unit/server/vrs-route-source.test.ts (Refresh-Test in Iteration 2 so umgebaut, dass nur clock.advance den Refresh ausloest), Fixtures in tests/fixtures/vrs/, Root-README aktualisiert.
