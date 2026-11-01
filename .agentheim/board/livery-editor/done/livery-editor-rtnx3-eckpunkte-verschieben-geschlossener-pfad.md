---
id: livery-editor-rtnx3
title: Eckpunkte eines geschlossenen Pfads als Marker zeigen und verschieben
status: done
type: feature
context: livery-editor
created: 2026-11-01
completed:
depends_on: [livery-editor-ec2zz]
blocks: [livery-editor-ypj22]
tags: [editor-feedback, zeichenbrett]
related_adrs: [0032, 0035, 0037]
related_research: []
prior_art: [livery-editor-ec2zz]
---

## Why
Ein geschlossener Pfad lässt sich heute nur über die Rundungsgriffe ändern. Der Betreiber will an jeder Ecke einen Marker, um Punkte zu verschieben und so die Form nachträglich zu korrigieren.

## What
Für die ausgewählte, sichtbare Pfad-Ebene zeigt das Overlay neben den Rundungsgriffen (Segmentmitten) je Eckpunkt einen **Eckmarker** (`vertex-handle-<i>`, quadratisch oder anders geformt als der runde Rundungsgriff, damit beide unterscheidbar sind). Mousedown + Ziehen setzt `points[i]` auf die gefangene Brettposition (`snap`); die Form folgt live, angrenzende Rundungen (`via[i-1]`, `via[i]`) bleiben als Punkte auf der Kurve erhalten (sie werden nicht mitverschoben). Ein Marker-Gestenstart fügt keinen Entwurfspunkt hinzu und startet keine Rundung (gleiches `handleGesture`-Prinzip wie bei ec2zz). Reine Logik in `tools/livery-editor/curve.ts` oder neu `vertex.ts`: `movePoint(layer, i, p)`; Mindestabstand: zwei aufeinanderfolgende Punkte dürfen nicht identisch werden (dann keine Änderung).

## Acceptance criteria
- [ ] `movePoint` setzt genau `points[i]`, lässt `via` unverändert und verweigert einen Punkt, der mit einem Nachbarn identisch wäre (Unit-Tests).
- [ ] Für die ausgewählte Ebene gibt es je Punkt einen Marker `vertex-handle-<i>`, für nicht ausgewählte Ebenen keinen (Editor-E2E).
- [ ] Ziehen eines Eckmarkers verändert den Pfad, Speichern schreibt die neuen Punkte, die Story rendert gleich (Editor-E2E mit Fixture, Pixelvergleich).
- [ ] Ein Marker-Gestenstart fügt keinen Entwurfspunkt hinzu (Editor-E2E: Punktzahl des Entwurfs bleibt 0).
- [ ] Bestehende Editor-E2E grün; `npm test`, `npm run typecheck`, `editor-chromium` grün.
- [ ] Eckmarker und Rundungsgriffe sind auf einen Blick unterscheidbar, Ziehen fühlt sich direkt an. [human-eye]

## Notes
Betreiber-Feedback vom 2026-11-01. Direkt nach todo. Konflikt-Hinweis: teilt `src/main.ts` mit livery-editor-ypj22 (Kurven beim Zeichnen); livery-editor-ypj22 wird danach gebaut.

## Outcome
Eckmarker umgesetzt. `movePoint(layer, i, p)` in tools/livery-editor/curve.ts setzt nur points[i], laesst via unveraendert und verweigert einen Punkt identisch zu einem Nachbarn (inkl. Schlusskante). main.ts zeichnet fuer die ausgewaehlte, sichtbare Ebene (ohne Entwurf) je Punkt ein Quadrat `vertex-handle-<i>`; der Mousedown-Handler teilt das handleGesture-Prinzip mit den Rundungsgriffen, es entsteht kein Entwurfspunkt. Tests: 2 Unit-Tests, 2 Editor-E2E (Fixture move-corner mit Pixelvergleich, Marker-Anzahl). npm test, typecheck, editor-chromium (9) gruen. Das [human-eye]-Kriterium bleibt dem Betreiber.
