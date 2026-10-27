---
id: airspace-b7kx2
title: Eigene Flughafenliste, damit Routen unabhängig vom Anbieter gleich aussehen
status: todo
type: feature
context: airspace
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [airports, routes]
related_adrs: [0010, 0014, 0016]
related_research: []
prior_art: []
---

## Why
Heute hängt der Stadtname einer Route vom Anbieter ab: adsbdb nimmt die Gemeinde (`municipality`), hexdb den Flughafennamen ohne „(International) Airport“, der VRS-Snapshot die Spalte „city“ der CSV-Stammdaten. Dieselbe Strecke sieht je nach Quelle anders aus, und ein Flughafen kann je nach Antwort zwei Namen haben.

## What
Eine eigene, statische Flughafen-Tabelle (ICAO → Stadt). Jede Route wird vor der Anzeige über ihre ICAO-Codes namensgleich dargestellt, egal welche Quelle sie geliefert hat.

Umsetzung:
- `Airport` (`src/server/modules/airspace/model.ts`) bekommt ein Feld `icao` (optional, damit bestehende Tests und Fixtures ohne Änderung gültig bleiben). Die Adapter setzen es aus der Quelle: adsbdb `icao_code`, hexdb `icao`, VRS-Snapshot Spalte 2 (Schlüssel der Airport-Map), FlightAware `code_icao`/`code`.
- Neue Tabelle `src/server/modules/airspace/tables/airports.json`: ICAO → `{ "city": "…" }`, nach dem Muster von `tables/airlines.json` und über `loadTables`/`defaultTables` geladen (ADR 0010).
- `formatRoute` (`route-service.ts:9`) nimmt für jeden Endpunkt mit ICAO den Stadtnamen aus der Tabelle. Ohne Tabelleneintrag bleibt der bisherige Anbieter-Name stehen, und der ICAO-Code wird einmal je Prozess als Warnung ins Log geschrieben, damit die Lücke sichtbar wird.
- Startbestand der Tabelle: alle Flughäfen, die in den VRS-Routen zu den Rufzeichen der heutigen Sichtungen vorkommen (Quelle: `data/vrs-standing-data/`). Der Name wird aus der VRS-Spalte „city“ übernommen. Nur Korrekturen, wo der VRS-Name offensichtlich nicht der übliche Stadtname ist, werden von Hand gesetzt.
- Gespeicherte Routentexte (`sightings.route`, nur bei VRS) werden nicht nachträglich umgeschrieben. Neue Sichtungen bekommen die einheitlichen Namen, alte behalten ihren Text. Kein Backfill.

## Acceptance criteria
- [ ] `Airport` hat das optionale Feld `icao`; alle vier Adapter (adsbdb, hexdb, vrs, flightaware) setzen es. Je Adapter gibt es einen Test, der den ICAO-Code aus einer Fixture-Antwort prüft.
- [ ] Eine Fixture-Route (dieselbe Strecke) liefert über adsbdb, hexdb und den VRS-Snapshot denselben Routentext aus `formatRoute`, wenn die Tabelle Einträge für ihre ICAO-Codes hat. Ein Test prüft das.
- [ ] Ohne Tabelleneintrag wird der Anbieter-Name verwendet und genau eine Warnung je ICAO-Code und Prozess geschrieben. Ein Test prüft Fallback und die einmalige Warnung.
- [ ] `tables/airports.json` ist über `defaultTables()` erreichbar und wird beim Laden validiert (Schlüssel ist ein 4-stelliger ICAO-Code, `city` ist nicht leer). Ein Test prüft Gültigkeit und das Laden.
- [ ] Ein Skript oder Test zeigt, dass jeder ICAO-Code aus den VRS-Routen der heutigen Sichtungen in der Tabelle steht; die Liste der fehlenden Codes ist leer.
- [ ] `npm test` und `npm run typecheck` sind grün.

## Notes
- Refine 2026-10-27 (modeling, REFINE). Die offenen Fragen aus dem Capture sind mit Defaults entschieden:
  - **Stadt, nicht Flughafenname.** Die Anzeige zeigt heute schon nur Städte (`formatRoute` nimmt `city`). Die Tabelle liefert deshalb nur `city`. Ein späterer Flughafenname kann als zusätzliches Feld kommen.
  - **Sprache: wie im VRS-Snapshot** (meist englisch oder lokal), nur Korrekturen von Hand. Eine deutsche Namensliste wäre eine eigene Übersetzungsarbeit und ist nicht nötig, um die Gleichheit zwischen Anbietern herzustellen.
  - **Pflege:** Die Tabelle ist im Repo versioniert. Unbekannte ICAO-Codes erscheinen als Warnung im Log, die Ergänzung passiert per Commit. Kein automatisches Nachladen.
- Die Live-Quellen (adsbdb, hexdb) speichern nichts (ADR 0016). Die Tabelle wirkt deshalb nur auf die Anzeige und die neuen VRS-Sichtungen, nicht auf gespeicherte Altdaten.
- Refinement ohne Orchestrator: der Umfang ist auf `src/server/modules/airspace/` begrenzt; die Specialists wären hier nur Kosten ohne Erkenntnisgewinn.
