---
id: airspace-b7kx2
title: Eigene Flughafenliste, damit Routen unabhängig vom Anbieter gleich aussehen
status: backlog
type: feature
context: airspace
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [captured]
related_adrs: [0005, 0010, 0016]
related_research: []
prior_art: []
---

## Why
Heute hängt der Stadtname einer Route vom Anbieter ab: adsbdb nimmt die Gemeinde, hexdb den Flughafennamen ohne „(International) Airport“, der VRS-Snapshot die Spalte „city“ der CSV-Stammdaten. Dieselbe Strecke sieht je nach Quelle anders aus.

## What
Eine eigene, kuratierte Flughafenliste (ICAO → Stadt/Name, ggf. Koordinaten), die jede Route vor der Anzeige verwendet. Egal welcher Anbieter die Route geliefert hat, die Namen sind gleich.

Skizze für die Refinement-Runde:
- `Airport` (`src/server/modules/airspace/model.ts`) bekommt ein `icao`-Feld; die drei Adapter (adsbdb, hexdb, vrs) und FlightAware setzen es.
- Statische Tabelle nach dem Muster von `tables/airlines.json` in `src/server/modules/airspace/tables/`, z. B. `airports.json`.
- `formatRoute` (`route-service.ts:9`) nimmt den Namen aus der Tabelle; unbekannte ICAO fallen auf den bisherigen Namen des Anbieters zurück.
- Ausgangsbasis für die Liste: die VRS-Stammdaten (CC0, `data/vrs-standing-data/airports/`), nur für Flughäfen, die in den Sichtungen vorkommen.

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `quick-capture` on 2026-10-27 — raw, unrefined. Needs a `modeling` refine pass before it can be promoted.

Offene Fragen für die Refinement-Runde: Soll die Liste nur Städtenamen liefern oder auch Flughafennamen? Welche Sprache (Deutsch wie bei den Typklassen-Namen)? Wer pflegt die Liste, wenn ein neuer Flughafen auftaucht (Warnung im Log oder Fallback)?
