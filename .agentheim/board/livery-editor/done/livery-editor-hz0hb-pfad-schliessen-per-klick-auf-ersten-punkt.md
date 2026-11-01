---
id: livery-editor-hz0hb
title: Pfad durch Klick auf den ersten Punkt schließen statt über den Knopf
status: done
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

## Verifier note (iteration 1)

REASONS:
- Criterion 2 ("Escape leert den Entwurf"): nothing tests the Escape half. main.ts adds a document-level keydown handler clearing the draft, but no unit or E2E test presses Escape or checks the draft is cleared. Code inspection alone does not count as coverage.
- Button removal is covered (close-path button + handler deleted, no remaining references, E2E closes without it). Criterion 1 covered by board.test.ts (radius boundary; closes only from three points on). Criterion 3 covered by draw-and-compare.spec.ts (pixel compare unchanged). npm test 734 passed, typecheck, builds, editor-chromium 2 passed.

SUGGESTED_FIX: Add a check to tests/e2e-editor/draw-and-compare.spec.ts (or a new editor-chromium spec): set one or two points, press Escape, assert the draft overlay is empty (no draft circle / first-point-ring) and that a following click starts a new draft. Also assert `getByTestId('close-path')` has count 0.

ITERATION_HINT: likely-fixable

## Outcome
board.ts: CLOSE_RADIUS (12), isNearFirstPoint, closesAt (schliesst nur ab 3 Punkten). main.ts: Klick wird in Brett-Einheiten umgerechnet; Klick nahe erstem Punkt schliesst, sonst Punkt anhaengen; Knopf entfernt; Escape leert Entwurf; beim Hover im Radius erscheint ein groesserer Ring um den ersten Punkt. E2E schliesst per Klick auf den ersten Punkt; ein weiterer E2E prueft Escape (Entwurf leer, neuer Klick startet frisch) und dass der Knopf close-path nicht existiert. Unit-Tests, Typecheck, Editor-E2E gruen. [human-eye] Hover-Hervorhebung offen.
