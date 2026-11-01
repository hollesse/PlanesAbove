---
id: sky-scene-h8c2v
title: Größenfaktor je Typklasse und gestaffelte Anordnung in die App übernehmen
status: backlog
type: feature
context: sky-scene
created: 2026-11-01
depends_on: [design-system-q7mxe]
blocks: []
tags: [typklasse, silhouette, layout]
related_adrs: [0009]
related_research: []
prior_art: [design-system-q7mxe, design-system-pyheh]
---

## Why
Der Entwurf (design-system-q7mxe, Storybook) ist vom Betreiber abzunehmen; danach soll die App die Zwei-Flugzeuge-Ansicht mit gleich breiten Slots, Größenfaktor je Typklasse (Tabelle `domain/plane-size.ts`) und der in Flugrichtung gestaffelten Anordnung (hinten oben links, vorn unten rechts) statt der perspektivischen 50 %/33 %-Slots darstellen.

## What
- Gleich-groß-Slots (`pa-slot-eq-*`, `planeBox`) in den Szenen-Layer der App übernehmen, auch für Einzelflug und die Übergänge.
- Nur starten, wenn der Betreiber den Entwurf in Storybook abgenommen hat.

## Acceptance criteria
- [ ] App zeigt zwei Flugzeuge gleicher Klasse gleich groß, Größenverhältnisse nach Tabelle (±3 Prozentpunkte), gestaffelt in Flugrichtung, ohne Beschnitt (4:3 und 5:3).
- [ ] Übergänge kommt/geht/wechselt bleiben grün.