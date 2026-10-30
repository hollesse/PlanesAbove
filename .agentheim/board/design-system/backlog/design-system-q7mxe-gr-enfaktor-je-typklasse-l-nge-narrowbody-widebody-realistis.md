---
id: design-system-q7mxe
title: Größenfaktor je Typklasse (Länge Narrowbody/Widebody realistisch)
status: backlog
type: feature
context: design-system
created: 2026-10-30
depends_on: [design-system-pyheh]
blocks: []
tags: [typklasse, silhouette, entwurf]
related_adrs: [0009]
related_research: []
prior_art: [design-system-pyheh]
---

## Why
Beim Entwurf "Zwei Flugzeuge gleich groß" (design-system-pyheh) wurde gemessen: alle Typklassen-SVGs nutzen dieselbe viewBox (1000x460), die gezeichnete Breite beträgt narrowbody 938, widebody 973, jumbo-hump 985, double-decker 991, regional-jet 850, turboprop 860, business-jet 564, light-aircraft 306, glider 350 (helicopter hat eine größere viewBox, 914 von 1620). Widebody ist damit nur ca. 4 % länger als Narrowbody (real etwa 40-60 %). Bei gleich großen Slots trägt allein die Silhouette den Größenunterschied, daher wirkt der Unterschied Narrowbody/Widebody schwach.

## What
Einen Größenfaktor je Typklasse einführen (Skalierung der Silhouette im Slot bzw. der gezeichneten Länge), sodass das Längenverhältnis der Klassen realistisch wirkt, ohne dass große Klassen am Slot-Rand beschnitten werden. Erst nach Abnahme des Entwurfs durch den Betreiber umsetzen.

## Acceptance criteria
- [ ] Jede der 10 Typklassen hat einen dokumentierten Größenfaktor; Widebody ist bei gleicher Slotbreite erkennbar länger als Narrowbody.
- [ ] Kein Typ wird im Slot beschnitten (4:3 und 5:3), Test über gemessene Bounding-Boxen.
- [ ] Bestehende Stories und Übergänge bleiben grün.
- [ ] Wirkung vom Betreiber in Storybook abgenommen. [human-eye]