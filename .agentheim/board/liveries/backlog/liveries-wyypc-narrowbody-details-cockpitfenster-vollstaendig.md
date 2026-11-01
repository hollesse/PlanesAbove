---
id: liveries-wyypc
title: Narrowbody-Detailschicht: alle Cockpitfenster aus der Altgrafik übernehmen
status: backlog
type: bug
context: liveries
created: 2026-11-01
completed:
depends_on: [design-system-001-styleguide]
blocks: []
tags: [editor-feedback, silhouette, details]
related_adrs: [0031, 0032]
related_research: []
prior_art: [livery-editor-zc7hk]
---

## Why
Beim Ausprobieren des Editor-Spikes fehlen in der Detailschicht Cockpitfenster. Die Altgrafik hat eine ganze Fensterleiste; der Spike hat nur den ersten Teilpfad übernommen.

## What
`src/client/ui/assets/planes/narrowbody/details.svg` enthält heute nur das erste `M … Z`-Stück der Fensterleiste. Die Altgrafik `src/client/ui/assets/svg/narrowbody.svg` hat in `class="paint-window-line"` mehrere Teilpfade (`M … Z M … Z …`), je Fenster einer. Die komplette Fensterleiste wird als ein `<path>` (alle Teilpfade, gleiche Füllfarbe `#3A3F44`) in die Detailschicht übernommen. Triebwerksdetails (Einlassring, Fan) bleiben wie sie sind. Keine Kabinenfenster, keine Türen (ADR 0031 Punkt 3).

## Acceptance criteria
- [ ] `details.svg` (narrowbody) enthält die Fensterleiste mit genau so vielen Teilpfaden (`M…Z`) wie `paint-window-line` in der Altgrafik; ein Unit-Test zählt beide und vergleicht.
- [ ] Die Koordinaten der Teilpfade stimmen mit der Altgrafik überein (Test: normalisierte `d`-Attribute gleich).
- [ ] `npm test`, `npm run typecheck` und der WebKit-Story-Lauf (`npx playwright test --project=webkit`) sind grün; der Chromium-Pixelvergleich Editor vs. Story (`editor-chromium`) bleibt grün.
- [ ] Im Editor und in der Story „Liveries/Pfade/spike – narrowbody“ sind alle Cockpitfenster sichtbar. [human-eye]

## Notes
Refined 2026-11-01 aus dem Betreiber-Feedback zum Editor-Spike livery-editor-zc7hk (Kriterium [human-eye]). Betrifft nur `details.svg`; `build-assets` erzeugt daraus `generated/plane-parts.ts`. Der Spike-Worker hatte die Detailschicht bewusst minimal gehalten.
