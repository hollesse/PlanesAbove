---
id: sighting-log-r3m8x
title: Routen- und Lackierungs-Statistik als API-Endpunkt des Dienstes, damit die Auswertung auf dem Heimserver ohne Node und ohne DB-Kopie im Browser abrufbar ist
status: done
type: feature
context: sighting-log
created: 2026-10-28
completed:
depends_on: []
blocks: []
tags: [statistik, stats, routes, liveries, api, zimaos]
related_adrs: [0016, 0007]
related_research: []
prior_art: [sighting-log-k4m7q]
---

## Why
Befund (c) der Geräteabnahme (infrastructure-d3v7k) braucht den Routenanteil aus einer Stunde Live-Betrieb auf dem Heimserver. Bisher geht das nur über `npm run stats:routes -- --db <file>`. Auf ZimaOS gibt es weder Node/npm auf dem Host noch `scripts/` im Dienst-Image. Der Betreiber will die Auswertung deshalb als API des laufenden Dienstes (Entscheidung 2026-10-28).

## What
Zwei lesende Endpunkte im Dienst, beide unter dem bestehenden HTTP-Server in `src/server/app.ts`:
- `GET /api/stats/routes?days=<N>&standort=<id|unbekannt|alle>` gibt das JSON von `routeStats(...)` zurück, also dieselbe Struktur wie `npm run stats:routes -- --json`.
- `GET /api/stats/liveries?days=<N>&standort=<…>` gibt entsprechend das JSON der Lackierungs-Statistik zurück (`livery-stats.ts`).
- Defaults wie im Skript (`days=7`, ohne `standort` die Standardgruppierung). Ungültige Parameter (`days` ≤ 0 oder keine Zahl, `standort` keine Ganzzahl, nicht `unbekannt` und nicht `alle`) ergeben HTTP 400 mit einer Fehlermeldung im JSON.
- Optional `?format=text` liefert die Textausgabe (`formatRouteStats` bzw. das Pendant), damit der Betreiber sie direkt im Browser lesen kann.
- Die Auswertungslogik bleibt in `route-stats.ts`/`livery-stats.ts`. Der Endpunkt nutzt die laufende Datenbankverbindung des Sichtungslogs und schreibt nichts. Die Prüfungen aus dem Skript (fehlende Tabelle `route_lookups`, fehlende `observation_points`) gelten genauso. Die gemeinsame Vorbereitung wird nicht kopiert, sondern so herausgezogen, dass Skript und Endpunkt sie beide nutzen.
- Die Skripte `stats:routes`/`stats:liveries` bleiben für den Entwicklungsrechner erhalten.
- README: Abschnitt Routen-Statistik und Betriebsschritt 7 (Befund c) nennen `http://<server>:8080/api/stats/routes?days=1&format=text` als Weg auf dem Heimserver.

## Acceptance criteria
- [x] `GET /api/stats/routes?days=1` liefert 200 mit `application/json`. Der Inhalt ist für denselben Datenbestand gleich dem Ergebnis von `routeStats` mit denselben Optionen. Ein Unit-/Integrationstest prüft das gegen eine In-Memory- oder temporäre SQLite-Datenbank mit Sichtungen und Routen-Befunden.
- [x] `GET /api/stats/liveries?days=1` liefert 200 mit dem JSON der Lackierungs-Statistik. Ein Test deckt das ab.
- [x] `standort=alle`, `standort=unbekannt` und `standort=<id>` werden genauso ausgewertet wie im Skript. Ungültige `days`/`standort` ergeben 400. Tests decken das ab.
- [x] `?format=text` liefert `text/plain` mit der formatierten Ausgabe. Ein Test deckt das ab.
- [x] Die Endpunkte schreiben nichts in die Datenbank (Test: die Zeilenzahlen aller Tabellen sind vorher und nachher gleich).
- [x] Die Skripte `npm run stats:routes` / `stats:liveries` funktionieren unverändert (bestehende Tests grün). Skript und Endpunkt teilen sich die Vorbereitungslogik; der Tabellen-Check ist nicht doppelt implementiert.
- [x] README: Routen-Statistik und Betriebsschritt 7 nennen den API-Weg für den Heimserver.

## Notes
- Der Dienst ist nur im LAN per HTTP erreichbar (ADR 0008). Die Statistik enthält keine personenbezogenen Daten, deshalb braucht sie keine Authentifizierung.
- Keine UI. Das ist ein reiner JSON-/Text-Endpunkt, das Styleguide-Gate gilt nicht.
- Entstanden in der Modeling-Session „auf das Homelab deployen“ (2026-10-28). Damit kann Befund (c) aus infrastructure-d3v7k auf dem Server erhoben werden.

## Verifier note (iteration 1)
**REASONS:**
- Check 1, criterion 1 not fully covered: the criterion requires a test against a SQLite DB "mit Sichtungen und Routen-Befunden". In tests/unit/server/stats-api.test.ts `boot()` (~lines 26-33) inserts only two `sightings` rows and no `route_lookups` rows, so "routes: 200 JSON equal to routeStats" compares two outputs whose per-source / conflict sections are empty on both sides — it would pass even if handleStatsRequest always used the no-lookups stub from inspectStatsDb instead of the real handle.
- Weaker, same cause: the standort alle/unbekannt/id test inserts sightings with observation_point_id NULL, so `standort=1` compares two empty results and never shows the id filter selecting real rows.
- Everything else passed: vitest 540 passed, tsc 0, both scripts run read-only against the real DB, `--standort x` error intact, scope clean, Statistik-API term in readmeDelta, ADR 0016/0007 honored.

**SUGGESTED_FIX:** In the test fixture insert `route_lookups` rows (several sources, hit/unknown results, at least one conflict) and give some sightings `observation_point_id = 1` (with a matching observation_points row), so the JSON-equality and standort tests compare non-empty route findings and a real id filter.

**ITERATION_HINT:** likely-fixable

## Outcome

Added `GET /api/stats/routes` and `GET /api/stats/liveries` to the service. `src/server/modules/sighting-log/stats-api.ts` handles them (JSON by default, `format=text` gives text/plain, 400 JSON error on invalid `days`/`standort`) on the running DB handle, read-only; `app.ts` only gained one import and one dispatch line. The shared preparation (days/standort parsing, sightings/route_lookups/observation_points table checks) was extracted to `stats-common.ts` and is used by both scripts and the API; the scripts keep their CLI behaviour. Tests: `tests/unit/server/stats-api.test.ts` uses a fixture with route_lookups rows (three sources, hit/unknown/unavailable, a conflict, a chosen source) and two of three sightings at observation point 1; the route test asserts non-empty per-source and conflict sections before comparing JSON with routeStats, the standort test asserts alle / unbekannt / 1 select 3 / 1 / 2 real sightings; further tests cover liveries JSON, 400s, text format and no-writes. README Routen-Statistik and Betriebsschritt 7 name the API path (`http://<server>:8080/api/stats/routes?days=1&format=text`). npm test 540, typecheck clean. Verification PASS in iteration 2 (iteration 1: fixture lacked route findings).

