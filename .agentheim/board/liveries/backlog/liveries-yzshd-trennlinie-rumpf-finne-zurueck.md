---
id: liveries-yzshd
title: Trennlinie zwischen Rumpf und Finne wieder sichtbar machen
status: backlog
type: bug
context: liveries
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
In der Altgrafik ist die Finne eine eigene Umrandung, die am Rumpfrücken als Linie sichtbar bleibt. Der Spike hat Rumpf und Finne zu einer Kontur vereinigt; die Trennlinie ist weg. Das soll so nicht.

## What
Die Altgrafik `src/client/ui/assets/svg/narrowbody.svg` zeichnet die Finne mit eigener Umrandung (class `tail-outline`, maskiert) neben `fuselage-outline`. Der Spike hat beide in `#body` der `silhouette.svg` als eine vereinigte Kontur vorberechnet. Die Trennlinie zwischen Rumpf und Finne soll zurück — entweder Umriss als zwei Konturen oder ein Trennstrich in der Detailschicht. Der Zuschnitt-Bereich für Pfade bleibt Rumpf + Finne (ADR 0031 4a).

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `quick-capture` on 2026-11-01 — raw, unrefined. Needs a `modeling` refine pass before it can be promoted. Quelle: Betreiber-Feedback nach dem Ausprobieren des Editor-Spikes livery-editor-zc7hk (Kriterium [human-eye]). Betrifft `silhouette.svg`/`details.svg` und ggf. `renderLiverySvg` (Umriss-Schicht). Im Spike-Outcome steht die Vereinigung als bewusste Vereinfachung; das ist zu revidieren.
