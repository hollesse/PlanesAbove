---
id: livery-editor-ec2zz
title: Rundungen: Griff in der Segmentmitte macht aus der Geraden eine Kurve
status: todo
type: feature
context: livery-editor
created: 2026-11-01
completed:
depends_on: []
blocks: []
tags: [editor-feedback, zeichenbrett, rundung]
related_adrs: [0031, 0032, 0035]
related_research: []
prior_art: [livery-editor-zc7hk]
---

## Why
Es fehlt, dass man Rundungen machen kann (README-Begriff „Rundung“: Griff in der Mitte eines Segments, Wegziehen macht aus der Geraden eine Kurve, wie in Photoshop).

## What
Für die ausgewählte Ebene (oder den gerade geschlossenen Pfad) zeigt das Brett je Segment einen Griff. Ohne Rundung sitzt er in der Segmentmitte; Ziehen setzt `via[i]` auf die Griffposition (Punkt AUF der Kurve, das Schema und `pathData` kennen das bereits: Kontrollpunkt = 2·via − Mitte). Doppelklick auf den Griff setzt `via[i]` auf `null` und macht das Segment wieder gerade. Griffposition wird beim Ziehen auf ganze Zahlen gefangen (`snap`). Logik in `tools/livery-editor/curve.ts` (`segmentHandle(layer, i)`, `setVia(layer, i, p|null)`), Bedienung in `src/main.ts`.

## Acceptance criteria
- [ ] `curve.ts`: Griffposition ohne Rundung ist die Segmentmitte, mit Rundung der `via`-Punkt; `setVia` schreibt/löscht genau den Index und hält `via` so lang wie `points` (Unit-Tests, inklusive Schließsegment).
- [ ] Ein gezogener Griff liegt nach dem Rendern auf der Kurve (Test: `pathData` ergibt bei t=0,5 den via-Punkt, rechnerisch über die quadratische Bézier-Formel).
- [ ] Speichern schreibt `via`; die Story rendert die Rundung identisch (Editor-E2E: ein Segment runden, speichern, Pixelvergleich mit der Story grün).
- [ ] Doppelklick auf den Griff macht das Segment wieder gerade (E2E oder Unit-Test über die Bedienlogik).
- [ ] `npm test`, `npm run typecheck`, `editor-chromium` grün.
- [ ] Das Ziehen fühlt sich wie in Photoshop an: Die Kurve folgt dem Griff. [human-eye]

## Notes
Refined 2026-11-01 aus dem Betreiber-Feedback zum Editor-Spike livery-editor-zc7hk (Kriterium [human-eye]). Entscheidung des Betreibers: Zurück zur Geraden per Doppelklick auf den Griff, kein Einrasten. Konflikt-Hinweis: teilt `src/main.ts` mit hz0hb und nxdzh; die Griffe setzen eine Ebenenauswahl voraus, die nxdzh einführt. Wenn nxdzh noch nicht da ist, gelten die Griffe für den zuletzt geschlossenen Pfad.
