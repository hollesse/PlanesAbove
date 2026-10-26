---
id: design-system-g7w4m
title: Breiter weicher Schein statt dünner Kontur hinter Text auf dem Himmel (helle Schrift mit schwarzem Schein ca. 40 %)
status: doing
type: feature
context: design-system
created: 2026-10-26
completed:
depends_on: [design-system-k7h2q]
blocks: [infrastructure-001-walking-skeleton]
tags: [frontend, storybook, sky, legibility]
related_adrs: [0009]
related_research: []
prior_art: [design-system-k7h2q, design-system-c4v3r]
---

## Why
Die dünne 8-Richtungs-Kontur aus design-system-k7h2q hat den Betreiber nicht überzeugt: sie sieht schlecht aus und die Kopfzeile bleibt schlecht lesbar. Gewünscht ist stattdessen ein relativ breiter, weicher Schein — bei heller (weißer) Schrift schwarz mit ca. 40 % Deckkraft.

## What
Die Kontur der Kopfzeile (Text direkt auf dem Himmel) wird ersetzt durch einen weichen, breiten Schein (Glow) hinter den Glyphen:
- Helle Himmel-Tinte → schwarzer Schein, ca. 40 % Deckkraft.
- Dunkle Himmel-Tinte → heller (weißer) Schein mit vergleichbarer Deckkraft (ca. 40 %), symmetrisch zur hellen Variante.
- Breite deutlich größer als die alte Kontur: weich auslaufend, ungefähr in der Größenordnung der Schrifthöhe (z. B. Blur ~0.6–1cqw, ggf. zwei gestapelte Schatten für mehr Dichte nah an der Schrift), keine harte Kante, kein Offset.
- Steuerbar über Tokens: Farbe/Deckkraft je Tinte und Breite (z. B. `--pa-sky-glow-on-light-ink` = rgba(0,0,0,.4), `--pa-sky-glow-on-dark-ink` = rgba(255,255,255,.4), `--pa-sky-glow-blur`). Die bisherigen Kontur-Tokens/Klassen werden entfernt bzw. ersetzt, nicht parallel geführt.
- Text auf Papier bleibt ohne Schein.

## Acceptance criteria
- [ ] Die Kopfzeile zeigt bei heller Tinte einen weichen schwarzen Schein (~40 % Deckkraft) und bei dunkler Tinte einen weichen weißen Schein (~40 %), in Templates, Pages, Übergängen und in Molecules/Kopfzeile.
- [ ] Der Schein ist breit und weich (Blur-Radius cqw-basiert, deutlich größer als die alte 0.1cqw-Kontur), ohne Offset; es gibt keine 8-Richtungs-Kontur mehr.
- [ ] Farben, Deckkraft und Breite sind Tokens in `styles/tokens.css` und erscheinen in der Token-Story; die alten Kontur-Tokens/-Klassen sind entfernt und der README-Begriff „Kontur“ ist durch „Schein“ ersetzt.
- [ ] Safari 16 tauglich (nur `text-shadow`, keine `filter: drop-shadow` auf Text-Containern nötig, keine nicht unterstützte Eigenschaft).
- [ ] Text auf Papier (Info-Leiste, Plakette, Zuletzt-Leiste) bleibt ohne Schein.
- [ ] Test-getrieben (ADR 0003): Unit- und Playwright-Tests prüfen Schein-Farbe/Alpha je Tinte, Blur-Radius > alte Kontur, kein Offset, keine 8 Schatten mehr, nichts auf Papiertext; die Tests schlagen ohne die Änderung fehl. Die k7h2q-Tests werden entsprechend angepasst.
- [ ] Alle Tests grün.
- [ ] Der Betreiber prüft Lesbarkeit und Optik in Storybook auf dem Handy. [human-eye]

## Notes
- Komponenten: `src/client/ui/styles/ui.css` (`.pa-halo-*`, `--pa-halo-w`), `styles/tokens.css`, `domain/tokens.ts`, `molecules/scene-header.ts`, Tests in `tests/unit/stories.test.ts`, `tests/unit/info-bar.test.ts`, `tests/e2e/stories.spec.ts`.
- Feedback des Betreibers wörtlich: „eher einen Schein der relativ breit ist mit schwarz und ca. 40% Deckkraft … beim weißen Text“.
