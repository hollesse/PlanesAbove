---
id: sighting-log-m7p2v
title: Routen-Statistik per CLI je Tag und Quelle, Liste der Unbekannten, Konflikte (nur Befunde, nie Routentext)
status: backlog
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
