---
id: 0038
title: Farbfelder vor oder hinter dem Körper (Nachtrag zu 0032 §6)
scope: liveries
status: accepted
date: 2026-11-01
related_adrs: [0031, 0032]
related_tasks: [liveries-yafve]
---

# 0038 — Farbfelder vor oder hinter dem Körper

## Context
ADR 0032 §6 zeichnet Farbfelder (Triebwerke, Flügel, Höhenleitwerk) unter dem weißen Körper. Das passt für den Narrowbody (Triebwerke unter dem Flügel). Der regional-jet hat Hecktriebwerke, die Rumpf und Finne überlappen; unter dem Körper wäre die Gondel fast verdeckt, und ADR 0031 §4a verlangt, dass Rumpf-Pfade nie in Triebwerke hineinreichen (Zuschnittbereich = Silhouette ohne Farbfelder). Die Altgrafik zeichnet `paint-engines` nach `fuselage-outline`, also oben.

## Decision
- Jedes Farbfeld hat eine Ebene: `back` (Standard, wie bisher) oder `front`. In der Silhouette wird `front` als `<g id="field-engines" data-layer="front">` markiert; `build-assets` reicht es als `fieldLayer` je Feld durch (Default `back`).
- `renderLiverySvg` zeichnet `back`-Felder wie bisher unter dem Körper; `front`-Felder nach Körper, Pfaden und Umriss, vor der Detailschicht (Gruppe `lv-front-fields`, Silhouetten-Deckkraft gilt).
- Zuschnitt der Pfade bei `front`-Feldern = Körper minus `front`-Felder. SVG-`clip-path` kann nicht subtrahieren, daher ersetzt eine `<mask>` (Körper weiß, Front-Felder schwarz) den clipPath für die Pfadgruppe. Ohne `front`-Felder bleibt der clipPath unverändert.
- Der regional-jet erhält kein Höhenleitwerk (Altgrafik hat keines); der widebody behält seines.

## Consequences
- Narrowbody und widebody rendern byte-gleich (Snapshot-Test).
- Neue Typklassen mit überlappenden Feldern (Hecktriebwerke) markieren sie als `front`.
- Die Maske hat weiche Kanten statt harter Clip-Kante; die Feld-Kontur (6 px) überdeckt das.

## Alternatives considered
- Triebwerk aus Körper und Rumpf-Umriss ausschneiden: verfälscht die Altgrafik-Silhouette und den Umriss.
- clipPath mit Gegenwicklung/evenodd: über mehrere Kindelemente eines clipPath wird vereinigt, nicht subtrahiert; nicht robust.