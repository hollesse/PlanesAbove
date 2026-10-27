---
id: airspace-h9x4p
title: Nähe nach Sichtbarkeit gewichten statt rein horizontaler Distanz
status: backlog
type: feature
context: airspace
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [captured, auswahl, live-test]
related_adrs: []
related_research: []
prior_art: []
---

## Why
Live-Test am 2026-10-27 in Oberweyer: `selectNearest` sortiert rein nach Bodenabstand. Ein Jet in 11 km Höhe, der 23 km seitlich vorbeizieht, zählt als näher als ein Kleinflugzeug in 1500 m Höhe, 11 km entfernt. Am echten Himmel sieht Mona das Kleinflugzeug, den Jet kaum.

## What
Die Auswahl der zwei nächsten Flugzeuge soll die Höhe einbeziehen, etwa per Schrägdistanz (3D-Abstand) oder einem Höhenmalus, damit niedrig fliegende, sichtbare Flugzeuge hoch fliegende Airliner schlagen.

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `quick-capture` on 2026-10-27 — raw, unrefined. Needs a `modeling` refine pass before it can be promoted. Beispiel aus dem Test: LOT1RF (23 km, Reiseflughöhe) verdrängte HUE28P (PC-12, 28 km, 560 m).
