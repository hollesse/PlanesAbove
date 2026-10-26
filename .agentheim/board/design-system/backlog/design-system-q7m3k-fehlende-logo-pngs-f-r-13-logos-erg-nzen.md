---
id: design-system-q7m3k
title: Fehlende Logo-PNGs für 13 Logos ergänzen
status: backlog
type: chore
context: design-system
created: 2026-10-26
completed:
depends_on: [design-system-001-styleguide]
blocks: []
tags: [assets, logos]
related_adrs: [0002]
related_research: []
prior_art: [design-system-001-styleguide]
---

## Why
Die SVG-Logos im Repo verweisen auf PNG-Dateien, von denen nur `lufthansa.png` vorhanden ist. In Storybook erscheinen 13 Logos deshalb als gestrichelte Platzhalter statt wie im Entwurf.

## What
PNG-Dateien (oder vektorisierte Logos) für aerlingus, aireuropa (tail), easyjet, jet2, klm, lot, pegasus, ryanair, sas, tap (inkl. tail), transavia und tui in `src/client/ui/assets/svg/logos/` ergänzen (gleicher Dateiname wie in den SVG-`href`s). `npm run assets` inlined sie dann automatisch. Rechte und Lizenz der Logos klären (privat genutzt, ADR 0001).

## Acceptance criteria
- [ ] `npm run assets` meldet keine fehlenden Logo-PNGs mehr.
- [ ] Jedes Logo ist in Storybook (Atoms/Logo, Molecules/Lackiertes Flugzeug) sichtbar und sitzt am richtigen Ankerpunkt.
- [ ] Der Betreiber hat die Logos gesehen. [human-eye]