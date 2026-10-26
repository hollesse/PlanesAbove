---
id: design-system-c4v3r
title: Himmel füllt den Bildschirm im 4:3-Format lückenlos (Cover-Beschnitt statt weißer Streifen unten)
status: doing
type: bug
context: design-system
created: 2026-10-26
completed:
depends_on: [design-system-001]
blocks: [infrastructure-001-walking-skeleton]
tags: [frontend, storybook, sky, 4x3]
related_adrs: [0009]
related_research: []
prior_art: [design-system-001]
---

## Why
Die 28 Himmel sind 1600×1000 (1,6:1) gezeichnet und werden mit `width:100%; height:auto` skaliert. Im 4:3-Bildschirm (Default für die Ziel-iPads, ADR 0009) decken sie nur etwa 83 % der Höhe ab; unten bleibt ein weißer Papierstreifen sichtbar, besonders im leeren Zustand mit schmaler „Zuletzt“-Leiste. Der Betreiber hat das bei der Durchsicht in Storybook bemerkt und sich für den Cover-Beschnitt entschieden (Option 1).

## What
Die Himmel-Ebene einer Szene füllt immer die gesamte Bühne (Cover-Verhalten): auf volle Höhe skaliert, horizontal zentriert, seitlicher Überstand wird abgeschnitten. Gilt für 4:3 und 5:3 und für alle Stellen, an denen ein Himmel als Hintergrund einer Bühne dient (Templates, Pages, Szenen-Ebene, Übergänge). Die Atom-Story „Himmel“ einzeln darf weiterhin das volle 1,6:1-Motiv zeigen.

## Acceptance criteria
- [ ] In jedem Bildschirmzustand (leer, eins, zwei) im Format 4:3 und 5:3 bedeckt der Himmel die gesamte Bühne; es ist kein Papier-/Rahmenhintergrund mehr sichtbar.
- [ ] Der Himmel ist horizontal zentriert beschnitten (gleicher Überstand links und rechts), nicht verzerrt.
- [ ] Auch in den Übergangs-Stories (Wetter wechselt, Tageszeit wechselt) füllen beide Himmel die Bühne während des gesamten Übergangs.
- [ ] Test-getrieben (ADR 0003): ein Unit-Test prüft, dass die Himmel-Ebene einer Bühne als Cover gerendert wird (z. B. SVG mit `preserveAspectRatio="xMidYMid slice"` und voller Breite/Höhe, o. ä.); ein Playwright-Test misst in einer 4:3-Template-Story, dass die Himmel-Bounding-Box die Bühne vollständig abdeckt.
- [ ] Alle bestehenden Tests bleiben grün.
- [ ] Der Betreiber prüft in Storybook, welche Himmel durch den seitlichen Beschnitt sichtbar leiden (Sonne, Mond, Wolken am Rand). [human-eye]

## Notes
- Verwandte Komponenten: `src/client/ui/atoms/sky.ts`, `src/client/ui/dom.ts` (`fluidSvg`), `src/client/ui/templates/screen.ts`, `src/client/ui/styles/ui.css` (`.pa-sky`, `.pa-layer`, `.pa-screen-*`), `src/client/ui/transitions/`.
- Seitlicher Beschnitt bei 4:3: je ca. 8,3 % links und rechts.
- Später möglich (nicht in diesem Task): eigene 4:3-Himmel mit mehr Himmel oben für die Motive, die unter dem Beschnitt leiden.
