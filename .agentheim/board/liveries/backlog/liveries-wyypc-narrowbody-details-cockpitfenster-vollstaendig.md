---
id: liveries-wyypc
title: Narrowbody-Detailschicht: alle Cockpitfenster aus der Altgrafik übernehmen
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
Beim Ausprobieren des Editor-Spikes fehlen in der Detailschicht Cockpitfenster; die Altgrafik hat eine ganze Fensterleiste.

## What
`src/client/ui/assets/planes/narrowbody/details.svg` hat nur ein einzelnes Fensterstück übernommen. Die Altgrafik `src/client/ui/assets/svg/narrowbody.svg` hat eine Cockpit-Fensterleiste (class `paint-window-line`, mehrere Fenster). Die Detailschicht soll vollständig aus der Altgrafik übernommen werden (Cockpitscheiben komplett, Triebwerksdetails wie bisher; keine Kabinenfenster, keine Türen laut ADR 0031).

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `quick-capture` on 2026-11-01 — raw, unrefined. Needs a `modeling` refine pass before it can be promoted. Quelle: Betreiber-Feedback nach dem Ausprobieren des Editor-Spikes livery-editor-zc7hk (Kriterium [human-eye]). Betrifft `details.svg`; Story „Liveries/Pfade“ und Editor zeigen die Detailschicht obenauf.
