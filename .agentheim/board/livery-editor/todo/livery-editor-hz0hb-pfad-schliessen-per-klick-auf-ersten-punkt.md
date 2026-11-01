---
id: livery-editor-hz0hb
title: Pfad durch Klick auf den ersten Punkt schließen statt über den Knopf
status: todo
type: feature
context: livery-editor
created: 2026-11-01
completed:
depends_on: []
blocks: []
tags: [editor-feedback, zeichenbrett]
related_adrs: [0035, 0037]
related_research: []
prior_art: [livery-editor-zc7hk]
---

## Why
Der Knopf „Schließen“ ist nicht schön. Ein Pfad soll sich natürlich schließen, wenn man auf seinen ersten Punkt klickt.

## What
Im Zeichenbrett schließt ein Klick innerhalb eines Fang-Radius von 12 Brett-Einheiten um den ersten Punkt des Entwurfs den Pfad (ab 3 Punkten). Der erste Punkt wird beim Zeichnen hervorgehoben, sobald der Mauszeiger im Fang-Radius ist (größerer Kreis). Der Knopf „Schließen“ entfällt. Escape verwirft den aktuellen Entwurf. Logik in `tools/livery-editor/board.ts` (`isNearFirstPoint(draft, p)`, Konstante `CLOSE_RADIUS`), Bedienung in `src/main.ts`.

## Acceptance criteria
- [ ] `board.ts`: Ein Punkt im Fang-Radius um den ersten Punkt schließt den Entwurf bei ≥ 3 Punkten; bei < 3 Punkten wird er als normaler Punkt angehängt (Unit-Tests für beide Fälle und für die Radius-Grenze).
- [ ] `src/main.ts`: Der Knopf „Schließen“ ist entfernt; Escape leert den Entwurf.
- [ ] Der Editor-E2E `tests/e2e-editor/draw-and-compare.spec.ts` schließt den Pfad durch Klick auf den ersten Punkt und bleibt grün (Pixelvergleich mit der Story unverändert).
- [ ] Hover im Fang-Radius hebt den ersten Punkt sichtbar hervor. [human-eye]

## Notes
Refined 2026-11-01 aus dem Betreiber-Feedback zum Editor-Spike livery-editor-zc7hk (Kriterium [human-eye]). Brett-Koordinaten sind ganze Zahlen (`snap`); der Fang-Radius gilt in Brett-Einheiten, nicht in Bildschirm-Pixeln.
