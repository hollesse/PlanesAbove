---
id: airspace-yvdbz
title: Referenzfoto-Endpunkt GET /api/photos/reference und Fotopanel im Lackierungs-Editor (ADR 0033)
status: backlog
type: feature
context: airspace
created: 2026-11-01
completed:
depends_on: [sighting-log-js2t1]
blocks: []
tags: [editor, fotos]
related_adrs: [0029, 0033]
related_research: []
prior_art: [airspace-hejpw-airport-data-ausbauen-planespotters-nur-als-fallback]
---

## Why
Beim Zeichnen will Papa ein echtes Foto der Airline auf dieser Typklasse neben dem Brett sehen (README: „Referenzfoto“).

## What
`GET /api/photos/reference?icao24=&registration=` nach ADR 0033 Punkt 2: antwortet nur für Hexes, die in `sightings` vorkommen, liefert wie ADR 0029 nur Foto-URL, Attribution und Link über die bestehende Fotokette (Commons, Planespotters als Fallback). Im Editor: Fotopanel neben dem Brett, das für die gewählte Kombination die `samples` aus der Sichtungsliste durchgeht und das erste gefundene Foto mit Attribution und Link zeigt.

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured 2026-11-01 als dritter Teil der Editor-Sichtungs-Anbindung; braucht Refine (Fotokette, Caching, Rate-Limits). Bewusst ins Backlog.
