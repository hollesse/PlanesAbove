---
id: design-system-q7m3k
title: Fehlende Logo-PNGs ergänzen, Logo-Beschnitt beheben und fehlende Logo-Dateien per Test verhindern
status: todo
type: chore
context: design-system
created: 2026-10-26
completed:
depends_on: [design-system-001]
blocks: []
tags: [assets, logos]
related_adrs: [0002]
related_research: []
prior_art: [design-system-001, design-system-c4v3r]
---

## Why
Die SVG-Logos im Repo verweisen auf PNG-Dateien, von denen nur `lufthansa.png` vorhanden ist. In Storybook erscheinen 13 Logos deshalb als gestrichelte Platzhalter statt wie im Entwurf.

## What
PNG-Dateien (oder vektorisierte Logos) für aerlingus, aireuropa (tail), easyjet, jet2, klm, lot, pegasus, ryanair, sas, tap (inkl. tail), transavia und tui in `src/client/ui/assets/svg/logos/` ergänzen (gleicher Dateiname wie in den SVG-`href`s). `npm run assets` inlined sie dann automatisch. Rechte und Lizenz der Logos klären (privat genutzt, ADR 0001).

## Refinement (2026-10-27)
Der Conductor hat die 12 fehlenden PNGs aus dem Claude-Design-Projekt `da5d4e02-191f-49a3-9db0-aa8095e016b7` (`svg/logos/*.png`) geladen; sie liegen unter `/tmp/claude-0/-home-user-PlanesAbove/909a183a-febc-5f97-ad3d-40a7548e0ed7/scratchpad/logos/` (aerlingus, aireuropa, easyjet, jet2, klm, lot, pegasus, ryanair, sas, tap, transavia, tui). `tap.png` deckt `tap.svg` und `tap-tail.svg` ab, `aireuropa.png` deckt `aireuropa-tail.svg` ab. Sie gehören nach `src/client/ui/assets/svg/logos/` und zusätzlich nach `svg/logos/` (Entwurfs-Ordner im Repo-Root, damit die Entwurfsseiten auch vollständig sind).

Zusätzlich festgestellt (Betreiber-Durchsicht): Einige Logos werden abgeschnitten. Ursache u. a.: die Logo-SVGs haben `viewBox="0 0 100 100"`, das `<image>` ragt aber teils darüber hinaus (z. B. klm `x=-14 width=128`, ryanair `x=-18.6 y=-14 width=129.2 height=128`), und `chinasouthern` wird in der Atom-Kachel unten gekappt. Das Logo muss vollständig sichtbar sein — in der Atom-Story und auf dem Leitwerk/Rumpf der lackierten Flugzeuge (ohne die Ankerpunkt-Platzierung der Entwürfe zu verfälschen).

## Acceptance criteria
- [ ] Alle 12 PNGs liegen in `src/client/ui/assets/svg/logos/` und `svg/logos/`; `npm run assets` meldet keine fehlenden Logo-PNGs mehr.
- [ ] Ein Test schlägt fehl, sobald ein Logo-SVG auf eine nicht vorhandene PNG-Datei verweist (z. B. Unit-Test über alle Logo-SVGs, oder `build-assets` bricht mit Exit-Code ≠ 0 ab und der Test prüft das).
- [ ] Kein Logo wird abgeschnitten: in Atoms/Logo „Alle Logos“ und in Molecules/Lackiertes Flugzeug ist jedes Logo vollständig sichtbar; ein Test prüft das (z. B. Bounding-Box des gerenderten Logo-Inhalts liegt innerhalb seines Containers, oder die viewBox umschließt die `<image>`-Geometrie).
- [ ] `npm run assets` meldet keine fehlenden Logo-PNGs mehr.
- [ ] Jedes Logo ist in Storybook (Atoms/Logo, Molecules/Lackiertes Flugzeug) sichtbar und sitzt am richtigen Ankerpunkt.
- [ ] Der Betreiber hat die Logos gesehen. [human-eye]