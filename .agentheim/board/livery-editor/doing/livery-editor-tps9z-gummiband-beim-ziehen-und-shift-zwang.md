---
id: livery-editor-tps9z
title: Gummiband beim Setzen eines Punkts (Segment folgt der Maus ab Mousedown, Punkt sitzt beim Loslassen) und Shift-Zwang waagerecht/senkrecht
status: doing
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
Heute setzt ein Klick den Punkt sofort. Papa will das neue Segment schon beim Drücken sehen und die Maus noch hin- und herziehen, bis es fast gerade ist, und mit gehaltener Shift-Taste exakt waagerecht oder senkrecht (README: „Shift-Zwang“).

## What
1. **Gummiband:** Mousedown auf dem Brett (außerhalb von Griffen/Markern) beginnt das Setzen eines Punkts: Ab Mousedown zeigt das Overlay das neue Segment vom letzten Entwurfspunkt (oder nur den Punkt, wenn der Entwurf leer ist) zur aktuellen, gefangenen Mausposition als Gummiband (`draft-rubber`). Mousemove aktualisiert es; Mouseup setzt den Punkt an der Mouseup-Position (gefangen). Ein reiner Klick ohne Bewegung verhält sich wie heute. Schließen per Mouseup im Fang-Radius um den ersten Punkt bleibt.
2. **Shift-Zwang:** Ist Shift beim Mousemove/Mouseup gedrückt, wird die Position auf die Waagerechte oder Senkrechte durch den letzten Punkt projiziert, je nachdem, welche Achse der Mausbewegung näher liegt (`|dx| ≥ |dy|` → waagerecht). Gilt für Gummiband und gesetzten Punkt. Beim ersten Punkt ohne Wirkung.
3. Reine Logik in `tools/livery-editor/board.ts`: `constrainAxis(prev, p)` und `rubberTarget(draft, p, shift)`; Bedienung in `src/main.ts`. Entwurfs-Rundungsgriffe (ypj22) und Eckmarker bleiben unverändert; ein Mousedown auf einem Griff startet kein Gummiband (`handleGesture`).

## Acceptance criteria
- [ ] `constrainAxis` projiziert auf die nähere Achse (inkl. Gleichstand → waagerecht); `rubberTarget` liefert ohne Shift die gefangene Position, mit Shift die projizierte, und beim leeren Entwurf unverändert (Unit-Tests).
- [ ] Editor-E2E: Mousedown, Mousemove → `draft-rubber` sichtbar mit Endpunkt an der Mausposition; Mouseup → Punkt genau dort, Gummiband weg.
- [ ] Editor-E2E: mit gehaltener Shift endet das Segment exakt waagerecht bzw. senkrecht zum vorigen Punkt (y bzw. x gleich).
- [ ] Reiner Klick (Mousedown/Mouseup ohne Bewegung) setzt den Punkt wie bisher; bestehende Editor-E2E (Quad per Klicks, Schließen am ersten Punkt, Entwurfsgriffe) bleiben grün.
- [ ] `npm test`, `npm run typecheck`, `editor-chromium` grün.
- [ ] Das Ziehen fühlt sich wie ein Gummiband an, Shift rastet sauber ein. [human-eye]

## Notes
Betreiber-Feedback vom 2026-11-01 („beim Keydown sehen“ = beim Drücken der Maustaste). Direkt nach todo. Reale config.yaml anpassen: nein.
