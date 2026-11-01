---
id: livery-editor-tps9z
title: Gummiband beim Zeichnen (nächstes Segment folgt der Maus, Klick setzt den Punkt) und Shift-Zwang waagerecht/senkrecht
status: done
type: feature
context: livery-editor
created: 2026-11-01
completed:
depends_on: [livery-editor-ypj22]
blocks: []
tags: [editor-feedback, zeichenbrett]
related_adrs: [0035, 0037]
related_research: []
prior_art: [livery-editor-ypj22, livery-editor-hz0hb]
---

## Why
Heute sieht man ein Segment erst, wenn der Punkt gesetzt ist. Papa will, sobald der Entwurf begonnen hat, das nächste Segment beim Bewegen der Maus schon sehen und hin- und herfahren, bis es fast gerade ist, und mit gehaltener Shift-Taste exakt waagerecht oder senkrecht (README: „Shift-Zwang“).

## What
1. **Gummiband:** Sobald der Entwurf mindestens einen Punkt hat, zeigt das Overlay bei jeder Mausbewegung über dem Brett das nächste Segment vom letzten Entwurfspunkt zur aktuellen, gefangenen Mausposition als Gummiband (`draft-rubber`, gestrichelt). Ein Klick setzt den Punkt dort wie bisher (kein Drücken/Halten nötig). Verlässt die Maus das Brett, verschwindet das Gummiband. Schließen per Klick im Fang-Radius um den ersten Punkt bleibt; das Gummiband rastet dann auf den ersten Punkt.
2. **Shift-Zwang:** Ist Shift beim Mousemove/Klick gedrückt, wird die Position auf die Waagerechte oder Senkrechte durch den letzten Punkt projiziert, je nachdem, welche Achse der Mausbewegung näher liegt (`|dx| ≥ |dy|` → waagerecht). Gilt für Gummiband und gesetzten Punkt. Beim ersten Punkt ohne Wirkung.
3. Reine Logik in `tools/livery-editor/board.ts`: `constrainAxis(prev, p)` und `rubberTarget(draft, p, shift)`; Bedienung in `src/main.ts`. Entwurfs-Rundungsgriffe (ypj22) und Eckmarker bleiben unverändert; ein Mousedown auf einem Griff startet kein Gummiband (`handleGesture`).

## Acceptance criteria
- [ ] `constrainAxis` projiziert auf die nähere Achse (inkl. Gleichstand → waagerecht); `rubberTarget` liefert ohne Shift die gefangene Position, mit Shift die projizierte, und beim leeren Entwurf unverändert (Unit-Tests).
- [ ] Editor-E2E: nach dem ersten Punkt macht eine Mausbewegung `draft-rubber` sichtbar mit Endpunkt an der (gefangenen) Mausposition; vor dem ersten Punkt gibt es kein Gummiband; Klick setzt den Punkt genau dort und das Gummiband beginnt am neuen Punkt.
- [ ] Editor-E2E: mit gehaltener Shift endet das Segment exakt waagerecht bzw. senkrecht zum vorigen Punkt (y bzw. x gleich).
- [ ] Bestehende Editor-E2E (Quad per Klicks, Schließen am ersten Punkt, Entwurfsgriffe) bleiben grün.
- [ ] `npm test`, `npm run typecheck`, `editor-chromium` grün.
- [ ] Das Ziehen fühlt sich wie ein Gummiband an, Shift rastet sauber ein. [human-eye]

## Notes
Betreiber-Feedback vom 2026-11-01, präzisiert: kein Drücken/Halten — das Segment folgt der Maus, sobald gezeichnet wird; der Klick setzt. Direkt nach todo. Reale config.yaml anpassen: nein.

## Verifier note (iteration 1)

REASONS:
- Criterion 2 only partly covered: the only non-Shift mousemove asserts just `toBeVisible()` on `draft-rubber`; nothing checks the band's `d` ends at the snapped mouse position.
- "das Gummiband beginnt am neuen Punkt" has no test: after the click the mouse is never moved again inside the board and the band's new start point is never asserted.
- No test shows the band stays hidden during a handle drag or in preview mode (both guards exist in main.ts, untested).
- Suites not run (stopped at check 1).

SUGGESTED_FIX: Extend rubber-band.spec.ts: after the first point and a non-Shift move, parse `draft-rubber`'s `d` and assert start [300,200] and end = snapped mouse position; after the click, move again and assert the band starts at the newly placed point; assert the band stays hidden while dragging a draft handle and in preview mode.

ITERATION_HINT: likely-fixable

## Outcome

Rubber band implemented: once the draft has at least one point, every mousemove over the board draws a dashed `draft-rubber` path from the last point to the snapped mouse position; near the first point (close radius, closable draft) it snaps to the first point; mouseleave, preview and handle drags hide it. Shift projects onto the horizontal/vertical through the last point (|dx| >= |dy| -> horizontal), for both the band and the placed point. Pure logic `constrainAxis` and `rubberTarget` in `tools/livery-editor/board.ts` with unit tests; wiring in `tools/livery-editor/src/main.ts`. E2E in `tests/e2e-editor/rubber-band.spec.ts` (iteration 2 added a test asserting the band's start = last placed point and end = snapped mouse position, the band restarting at a newly placed point, and the band hidden while dragging a draft handle and in Space preview). npm test, typecheck and all 19 editor E2E tests green. The [human-eye] criterion is left to the operator.
