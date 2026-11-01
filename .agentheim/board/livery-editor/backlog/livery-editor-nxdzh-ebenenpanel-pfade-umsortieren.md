---
id: livery-editor-nxdzh
title: Ebenenpanel: Pfade als Ebenen sehen, auswählen, umsortieren, ein-/ausblenden
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
Es fehlt, dass ich die Pfade als Ebenen sehe und verschieben kann, was weiter oben und was weiter unten liegt.

## What
Ein Ebenenpanel zeigt alle Pfade der Lackierung als Ebenen (README-Begriff „Ebene“: Reihenfolge im Stapel). Eine Ebene ist einzeln auswählbar, nach oben/unten umsortierbar und ein-/ausblendbar. Die Reihenfolge wird in der Lackierungsdatei gespeichert und von `renderLiverySvg` in Story und Editor gleich gezeichnet.

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `quick-capture` on 2026-11-01 — raw, unrefined. Needs a `modeling` refine pass before it can be promoted. Quelle: Betreiber-Feedback nach dem Ausprobieren des Editor-Spikes livery-editor-zc7hk (Kriterium [human-eye]). Schema `livery-file.ts` hat bereits ein `layers`-Array; die Reihenfolge ist die Stapelreihenfolge. Betrifft `tools/livery-editor/src/main.ts`.
