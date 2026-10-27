---
id: sighting-log-m7p2v
title: Routen-Statistik: je Tag und Quelle zählen, Liste der Flüge mit Route unbekannt, Konflikte zwischen Quellen
status: backlog
type: feature
context: sighting-log
created: 2026-10-27
completed:
depends_on: [airspace-r5n3k]
blocks: []
tags: [captured, statistik, routes]
related_adrs: [0007, 0016]
related_research: []
prior_art: []
---

## Why
Seit airspace-r5n3k hält `sightings.route_source` fest, welche Quelle (`vrs`, `adsbdb`, NULL) die Route geliefert hat. Der Betreiber will sehen, welche Flüge "Route unbekannt" bekommen und welcher Dienst wann liefert, um die Kette (Reihenfolge, weitere Quellen wie hexdb, ggf. ein Tracking-Dienst) datengetrieben zu entscheiden. Heute geht das nur per Hand-SQL.

## What
- Auswertung über das Sichtungsprotokoll (nur angezeigte Sichtungen, `slot IS NOT NULL`): pro Tag Anzahl je `route_source` inkl. `none`, Anteil "Route bekannt"; Liste der Sichtungen ohne Route mit Callsign, Airline, Typklasse, Zeit; optional je Airline-Präfix die Unbekannt-Quote (zeigt Charter-Airlines).
- Konflikte: wenn mehrere Quellen abgefragt wurden und plausible, aber unterschiedliche Routen lieferten, soll das als eigenes Ereignis protokolliert werden (Callsign, Antworten je Quelle, gewählte Quelle), damit die Konfliktregel aus airspace-w3k8d überprüfbar wird. Abgelehnte (unplausible) Antworten je Quelle ebenfalls zählen.
- Zugang: `GET /api/stats/routes?days=7` (JSON) und/oder ein `npm run stats:routes`; kein UI auf dem Display (Vision: keine Menüs).
- Lizenz: für adsbdb/hexdb nie Routentext speichern; die Konflikt-Protokollierung darf nur Flughafen-Codes der nicht-persistierbaren Quellen im Speicher halten oder muss sie weglassen (Entscheidung beim Refinen).

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `modeling` on 2026-10-27 — raw, unrefined. Needs a refine pass before it can be promoted. Stand 2026-10-27 12:40–13:30: 29 angezeigte Sichtungen, adsbdb 13, vrs 5, none 11.
