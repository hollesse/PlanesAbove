---
id: livery-editor-ec2zz
title: Rundungen: Griff in der Segmentmitte macht aus der Geraden eine Kurve
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
Es fehlt, dass ich Rundungen machen kann.

## What
Jedes Segment eines Pfads bekommt einen Griff in der Mitte; Wegziehen macht aus der Geraden eine Kurve (README-Begriff „Rundung“, wie in Photoshop). Die Rundung wird in der Lackierungsdatei gespeichert und in Story und Editor gleich gerendert.

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `quick-capture` on 2026-11-01 — raw, unrefined. Needs a `modeling` refine pass before it can be promoted. Quelle: Betreiber-Feedback nach dem Ausprobieren des Editor-Spikes livery-editor-zc7hk (Kriterium [human-eye]). Das Schema `livery-file.ts` hat bereits ein optionales `via` je Punkt und `pathData` in `livery-render.ts` kennt es; es fehlt die Editor-Bedienung (Griff, Drag) und ggf. Rundungs-Geometrie-Tests.
