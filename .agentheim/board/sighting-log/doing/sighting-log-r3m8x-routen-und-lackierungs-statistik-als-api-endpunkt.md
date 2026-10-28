---
id: sighting-log-r3m8x
title: Routen- und Lackierungs-Statistik als API-Endpunkt des Dienstes, damit die Auswertung auf dem Heimserver ohne Node und ohne DB-Kopie im Browser abrufbar ist
status: doing
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
- [ ] `GET /api/stats/routes?days=1` liefert 200 mit `application/json`. Der Inhalt ist für denselben Datenbestand gleich dem Ergebnis von `routeStats` mit denselben Optionen. Ein Unit-/Integrationstest prüft das gegen eine In-Memory- oder temporäre SQLite-Datenbank mit Sichtungen und Routen-Befunden.
- [ ] `GET /api/stats/liveries?days=1` liefert 200 mit dem JSON der Lackierungs-Statistik. Ein Test deckt das ab.
- [ ] `standort=alle`, `standort=unbekannt` und `standort=<id>` werden genauso ausgewertet wie im Skript. Ungültige `days`/`standort` ergeben 400. Tests decken das ab.
- [ ] `?format=text` liefert `text/plain` mit der formatierten Ausgabe. Ein Test deckt das ab.
- [ ] Die Endpunkte schreiben nichts in die Datenbank (Test: die Zeilenzahlen aller Tabellen sind vorher und nachher gleich).
- [ ] Die Skripte `npm run stats:routes` / `stats:liveries` funktionieren unverändert (bestehende Tests grün). Skript und Endpunkt teilen sich die Vorbereitungslogik; der Tabellen-Check ist nicht doppelt implementiert.
- [ ] README: Routen-Statistik und Betriebsschritt 7 nennen den API-Weg für den Heimserver.

## Notes
- Der Dienst ist nur im LAN per HTTP erreichbar (ADR 0008). Die Statistik enthält keine personenbezogenen Daten, deshalb braucht sie keine Authentifizierung.
- Keine UI. Das ist ein reiner JSON-/Text-Endpunkt, das Styleguide-Gate gilt nicht.
- Entstanden in der Modeling-Session „auf das Homelab deployen“ (2026-10-28). Damit kann Befund (c) aus infrastructure-d3v7k auf dem Server erhoben werden.
