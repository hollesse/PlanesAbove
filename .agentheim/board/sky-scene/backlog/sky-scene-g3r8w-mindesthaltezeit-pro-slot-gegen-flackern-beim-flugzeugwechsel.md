---
id: sky-scene-g3r8w
title: Mindesthaltezeit pro Slot gegen Flackern beim Flugzeugwechsel
status: backlog
type: feature
context: sky-scene
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [captured, szene, live-test]
related_adrs: []
related_research: []
prior_art: []
---

## Why
Live-Test am 2026-10-27 in Oberweyer: Die Szene übernimmt jeden 30-s-Takt neu die zwei nächsten Flugzeuge. Sobald ein anderes Flugzeug minimal näher ist, wird gewechselt, und einen Takt später oft wieder zurück. Das wirkt als Flackern.

## What
Ein Flugzeug soll seinen Slot mindestens 2 bis 3 Takte behalten, solange es im Radius bleibt, bevor ein nur geringfügig näheres Flugzeug es verdrängt.

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `quick-capture` on 2026-10-27 — raw, unrefined. Needs a `modeling` refine pass before it can be promoted. Hängt mit airspace-h9x4p (Gewichtung der Nähe) zusammen; beide zusammen bestimmen, wie ruhig die Szene wirkt.
