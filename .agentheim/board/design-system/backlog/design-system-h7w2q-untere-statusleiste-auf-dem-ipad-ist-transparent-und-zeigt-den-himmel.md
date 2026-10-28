---
id: design-system-h7w2q
title: Untere Statusleiste auf dem iPad ist transparent und zeigt den Himmel, wirkt aber wie ein schwarzer Balken (Datum und Uhrzeit)
status: backlog
type: bug
context: design-system
created: 2026-10-28
completed:
depends_on: []
blocks: []
tags: [captured]
related_adrs: []
related_research: []
prior_art: []
---

## Why
Auf dem iPad erscheint unten eine kleine, schmale Leiste. Der Builder hat sie beim Test am Gerät gesehen.

## What
Die Statusleiste mit Datum und Uhrzeit ist nicht schwarz hinterlegt, sondern transparent und zeigt den Himmel. Die Leiste sieht trotzdem wie ein schwarzer Balken aus. Vermutlich liegt das an der Gestaltung: Ein Hintergrund, Verlauf oder Schatten wird falsch gezeichnet, oder die Leiste hat eine eigene Farbe, die nicht zum Himmel passt. Die Leiste soll so aussehen, wie der Builder sie möchte. Ob sie transparent bleibt oder einen eigenen Hintergrund bekommt, ist noch offen.

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `quick-capture` on 2026-10-28 — raw, unrefined. Needs a `modeling` refine pass before it can be promoted.
Wortlaut des Builders: „ich habe das ganze auf dem Ipad geöffnet und unten ist eine kleine schware leiste. Ich glaube das liegt daran, dass du dachtest, die Statusleiste mit Datum und Uhrzeit wäre schwarz hinterlegt, das ist sie aber nicht sondern sie ist durchsichtig und zeigt den himmel an.“
