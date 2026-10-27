---
id: design-system-t6wz4
title: Flugzeuge je Airline in eigener Lackierung zeichnen, fehlende Airline-Designs in der Statistik ausweisen
status: backlog
type: feature
context: design-system
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [captured]
related_adrs: []
related_research: []
prior_art: []
---

## Why
Not stated at capture.

## What
Flugzeuge mit Designs je nach Airline: Jede Airline bekommt ihre Lackierung am Flugzeug. Einige Airline-SVGs (Logos) liegen schon vor, für die übrigen fehlen die Designs.

Zusätzlich in der Statistik ergänzen, für welche Airline kein Design vorhanden war und deshalb die Standard-Lackierung verwendet werden musste.

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `quick-capture` on 2026-10-27 — raw, unrefined. Needs a `modeling` refine pass before it can be promoted.

Fakten aus dem Code (Stand Capture, nicht geprüft):
- Lackierungskatalog `src/client/ui/domain/liveries.ts`: 42 Lackierungen inkl. Standard (`def`).
- Logo-SVG/PNG vorhanden für 15 Lackierungen: ryanair, easyjet, klm, sas, pegasus, tap, aerlingus, lot, transavia, jet2, tui, aireuropa, icelandair, chinasouthern, lufthansa (`src/client/ui/assets/svg/logos/`).
- Fallback-Regel bereits vorhanden: `resolveLivery` in `src/client/ui/domain/livery.ts` liefert `fellBack: true`, wenn die Lackierung unbekannt ist und die Standard-Lackierung genommen wird. Kleine Typklassen (Light Aircraft, Glider) haben keine Airline-Lackierungen (`available: false`).
- Statistik: `npm run stats:routes` (`scripts/stats-routes.mjs`, `src/server/modules/sighting-log/route-stats.ts`) gehört zum BC sighting-log. Der Statistik-Teil kann dort liegen und vom Refiner abgespalten werden, falls er nicht zu diesem Ticket gehört.
- Neue Designs zuerst als Story in Storybook bauen und vom Betreiber abnehmen lassen (Regel dieses BC).
