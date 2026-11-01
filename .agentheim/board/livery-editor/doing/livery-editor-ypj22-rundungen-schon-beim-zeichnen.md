---
id: livery-editor-ypj22
title: Rundungen schon beim Zeichnen des Entwurfs setzen, nicht erst nach dem Schließen
status: doing
type: feature
context: livery-editor
created: 2026-11-01
completed:
depends_on: [livery-editor-rtnx3]
blocks: []
tags: [editor-feedback, zeichenbrett, rundung]
related_adrs: [0032, 0035, 0037]
related_research: []
prior_art: [livery-editor-ec2zz]
---

## Why
Rundungen gehen heute erst, wenn der Pfad geschlossen und als Ebene ausgewählt ist. Der Betreiber will die Kurve schon beim Ziehen des Entwurfs formen, so wie er zeichnet.

## What
Der Entwurf (`Draft`) bekommt wie `PathLayer` ein `via`-Array (je gesetztem Segment ein Punkt auf der Kurve oder `null`). Während des Zeichnens zeigt das Overlay für jedes bereits vorhandene Segment des Entwurfs einen Rundungsgriff in der Segmentmitte (gleiches Aussehen und Verhalten wie bei der Ebene: Ziehen setzt `via[i]`, Doppelklick setzt zurück). Die Vorschau des Entwurfs zeichnet die Segmente mit `pathData`-Logik als Kurven (offener Pfad, kein Schließsegment, solange nicht geschlossen). Beim Schließen (Klick auf den ersten Punkt) werden `points` und `via` gemeinsam in die neue Ebene übernommen; das Schließsegment hat zunächst keine Rundung. Escape verwirft auch `via`. Ein Griff-Gestenstart fügt keinen Entwurfspunkt hinzu. Logik in `tools/livery-editor/board.ts`/`curve.ts` (`setDraftVia`, `closeDraft` übernimmt `via`), Bedienung in `src/main.ts`.

## Acceptance criteria
- [ ] `closeDraft` übernimmt `via` des Entwurfs in die Ebene, aufgefüllt auf `points.length` mit `null` (Schließsegment gerade); `setDraftVia` schreibt genau den Index (Unit-Tests).
- [ ] Während des Zeichnens gibt es je vorhandenem Segment einen Griff `draft-handle-<i>`; vor dem zweiten Punkt keinen (Editor-E2E).
- [ ] Ziehen eines Entwurfsgriffs, dann Schließen, dann Speichern: die Datei enthält das `via`; die Story rendert gleich (Editor-E2E mit Fixture, Pixelvergleich).
- [ ] Escape verwirft Punkte und Rundungen des Entwurfs (Editor-E2E).
- [ ] Bestehende Editor-E2E grün; `npm test`, `npm run typecheck`, `editor-chromium` grün.
- [ ] Zeichnen mit Rundung fühlt sich flüssig an, die Vorschau zeigt die Kurve schon vor dem Schließen. [human-eye]

## Notes
Betreiber-Feedback vom 2026-11-01. Direkt nach todo. Baut auf livery-editor-rtnx3 auf (gleiche Overlay-/Gestenlogik in `src/main.ts`).
