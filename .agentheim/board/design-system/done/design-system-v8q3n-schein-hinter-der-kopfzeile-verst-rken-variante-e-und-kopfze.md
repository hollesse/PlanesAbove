---
id: design-system-v8q3n
title: Schein hinter der Kopfzeile verstärken (Variante E) und Kopfzeile in Plex Mono 500
status: done
type: feature
context: design-system
created: 2026-10-27
completed:
depends_on: [design-system-g7w4m]
blocks: [infrastructure-001-walking-skeleton]
tags: [frontend, storybook, sky, legibility]
related_adrs: [0009]
related_research: []
prior_art: [design-system-g7w4m, design-system-k7h2q]
---

## Why
Der Schein aus design-system-g7w4m (2 Lagen, 40 %, 0.8cqw) ist auf den Himmeln praktisch unsichtbar. In der Beispielszene „Zwei Flugzeuge · Nacht, klar“ liegt „LIVE · 22:15“ über dem cremefarbenen Mond und ist schlecht lesbar. Der Conductor hat per CSS-Injektion Varianten verglichen; der Betreiber hat Variante **E** gewählt: dichter, dunkler Schein nah an der Schrift plus Schriftgewicht 500.

## What
Schein der Kopfzeile (Text direkt auf dem Himmel) nach Variante E:
- **Helle Tinte:** drei gestapelte, offsetfreie text-shadows in Schwarz — eng `0 0 0.3cqw` bei 90 %, mittel `0 0 1cqw` bei 90 %, breit `0 0 2.4cqw` bei 70 % Deckkraft.
- **Dunkle Tinte:** die gleiche Struktur in Weiß, in vergleichbarer Stärke; die Deckkraft so wählen, dass die dunkle Schrift auf hellen Himmeln klar lesbar ist, ohne als weißer Fleck/Kasten zu wirken (Startwert 80 % / 80 % / 60 %, per Screenshot abstimmen).
- **Schriftgewicht der Kopfzeile:** IBM Plex Mono 500 statt 400 (lokal vorhanden).
- Alles über Tokens steuerbar: Farben/Deckkraft je Ebene und Tinte sowie die drei Radien (z. B. `--pa-sky-glow-blur-tight/-mid/-wide`), weiterhin in der Token-Story „Schein“ sichtbar. Die bisherige Zwei-Lagen-Definition wird ersetzt, nicht parallel geführt.
- Text auf Papier bleibt ohne Schein und unverändert im Gewicht.

## Acceptance criteria
- [ ] Kopfzeile bei heller Tinte: drei offsetfreie schwarze Schatten (≈0.3/1/2.4cqw bei ≈90/90/70 %); bei dunkler Tinte drei weiße Schatten gleicher Radien mit abgestimmter Deckkraft; in Templates, Pages, Übergängen und Molecules/Kopfzeile.
- [ ] Kopfzeile in Plex Mono 500; Info-Leiste, Plaketten, Zuletzt-Leiste unverändert (kein Schein, Gewicht wie bisher).
- [ ] Werte als Tokens in `styles/tokens.css`, gespiegelt in `domain/tokens.ts` und in der Token-Story „Schein“ dargestellt; README-Begriff „Schein“ aktualisiert.
- [ ] Safari 16 tauglich (nur `text-shadow`, `font-weight`).
- [ ] Test-getrieben (ADR 0003): Unit- und Playwright-Tests prüfen drei Ebenen je Tinte mit Radien/Deckkraft, Offset 0, font-weight 500 der Kopfzeile und Papiertext ohne Schein; Tests schlagen ohne die Änderung fehl. TESTS_ADDED = Anzahl neuer it()/test()-Fälle.
- [ ] Worker legt vor Abgabe Chromium-Screenshots von Pages/Beispielszenen „Zwei Flugzeuge · Nacht, klar“ (Ausschnitt LIVE · 22:15 über dem Mond) und einer hellen Tag-Szene mit dunkler Tinte an, sieht sie sich an und beschreibt das Ergebnis im OUTCOME.
- [ ] Alle Tests grün.
- [ ] Der Betreiber prüft die Lesbarkeit auf dem Handy. [human-eye]

## Notes
- Referenz-CSS der Variante E (Conductor-Test): `text-shadow: 0 0 .3cqw rgba(0,0,0,.9), 0 0 1cqw rgba(0,0,0,.9), 0 0 2.4cqw rgba(0,0,0,.7); font-weight: 500` auf `.pa-scene-header` bei heller Tinte.
- Dateien: `styles/ui.css` (`.pa-glow-on-*`), `styles/tokens.css`, `domain/tokens.ts`, `stories/tokens.stories.ts`, `molecules/scene-header.ts`, Tests in `tests/unit/stories.test.ts`, `tests/unit/info-bar.test.ts`, `tests/e2e/stories.spec.ts`.
- Story-Id der Beispielszene: `pages-beispielszenen--einzeln` mit `&args=page:two-planes`.

## Outcome

Replaced the two-layer Schein (g7w4m) with variant E. `styles/tokens.css` now holds per-ink, per-layer colour tokens (`--pa-sky-glow-on-{light,dark}-ink-{tight,mid,wide}`) and three radius tokens (`--pa-sky-glow-blur-{tight,mid,wide}` = 0.3/1/2.4cqw); the old `--pa-sky-glow-on-*-ink` and `--pa-sky-glow-blur` tokens and the COLORS.skyGlow* entries are gone. `styles/ui.css`: `.pa-glow-on-light-ink` = black 0.9/0.9/0.7, `.pa-glow-on-dark-ink` = white 0.8/0.8/0.6 (tuned start values kept), both with `font-weight: 500`; only the scene header carries these classes, so the Info-Leiste, Plaketten and Zuletzt-Leiste are untouched. `domain/tokens.ts` mirrors via `GLOW_LAYERS`, `GLOW_BLUR`, `GLOW_COLORS`; the Token story "Schein" lists all radii and per-ink layer tokens and shows both inks.

Screenshots (Chromium, throwaway script in the scratchpad, not committed; night-header.png / day-header.png): in "Zwei Flugzeuge, Nacht, klar" the cream "LIVE · 22:15" over the cream moon now has a clearly dark halo and separates cleanly from the moon edge; it reads well, and the 500 weight is visible. On the bright day scene with dark ink, the white halo is subtle and keeps the dark text crisp over the pale cloud and blue sky; it does not look like a white blob or box, so 80/80/60 % was kept. The operator still needs to check legibility on a phone [human-eye].

Tests: modified existing tests in `tests/unit/stories.test.ts` (3 rewritten: shadow structure, token mirror, Token story), `tests/e2e/stories.spec.ts` (glow test rewritten to check 3 layers, colours per ink, offset 0, radii in cqw, weight 500, paper text no shadow and not weight 500); added 1 new it() (header classes set font-weight 500, paper classes do not). `tests/unit/info-bar.test.ts` unchanged in the end (its class assertions still hold). npm test 48 passing, typecheck clean, Chromium e2e 5 passing after rebuild-storybook. WebKit not run (not available here).
