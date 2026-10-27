---
id: sighting-log-k4m7q
title: Beobachtungsstandort je Sichtung mitloggen
status: backlog
type: feature
context: sighting-log
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [captured, statistik]
related_adrs: []
related_research: []
prior_art: []
---

## Why
Live-Test am 2026-10-27: Die Datenbank enthielt Sichtungen vom Frankfurt-Beispielstandort und vom echten Standort Oberweyer nebeneinander, ohne dass man sie unterscheiden kann. Wird der Standort in `config.yaml` angepasst, vermischen sich Statistiken und Abstände.

## What
Jede Sichtung soll festhalten, von welchem Ort aus geschaut wurde (mindestens `place` und Koordinaten, ggf. Radius), damit Auswertungen nach Standort trennbar bleiben.

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `quick-capture` on 2026-10-27 — raw, unrefined. Needs a `modeling` refine pass before it can be promoted. Beobachtung: Beim Neustart mit neuem Standort wurde die bestehende Sichtungszeile QTR85M (closest_distance 4,2 km, vom Frankfurter Punkt) weitergeführt, obwohl das Flugzeug nun von Oberweyer aus gesehen wurde.
