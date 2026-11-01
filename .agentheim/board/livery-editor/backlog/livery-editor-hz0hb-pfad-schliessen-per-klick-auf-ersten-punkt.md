---
id: livery-editor-hz0hb
title: Pfad durch Klick auf den ersten Punkt schließen statt über den Knopf
status: backlog
type: feature
context: livery-editor
created: 2026-11-01
completed:
depends_on: []
blocks: []
tags: [captured, editor-feedback]
related_adrs: []
related_research: []
prior_art: []
---

## Why
Der Knopf „Schließen“ ist nicht schön. Ein Pfad soll sich natürlich schließen, wenn man auf seinen ersten Punkt klickt.

## What
Im Zeichenbrett schließt ein Klick auf den ersten Punkt des aktuellen Pfads (mit Fang-Radius) den Pfad. Der Knopf „Schließen“ kann weg. Der erste Punkt soll als Fangziel erkennbar sein (z. B. Hervorhebung beim Hover).

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `quick-capture` on 2026-11-01 — raw, unrefined. Needs a `modeling` refine pass before it can be promoted. Quelle: Betreiber-Feedback nach dem Ausprobieren des Editor-Spikes livery-editor-zc7hk (Kriterium [human-eye]). Betrifft `tools/livery-editor/board.ts`, `src/main.ts`, `board.test.ts` und den Editor-E2E `tests/e2e-editor/draw-and-compare.spec.ts`, der heute den Knopf nutzt.
