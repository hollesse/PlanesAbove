---
id: design-system-k7h2q
title: Text direkt auf dem Himmel bekommt eine Kontur in der Gegenfarbe (dunkle Schrift hell umrandet, helle Schrift dunkel umrandet)
status: todo
type: feature
context: design-system
created: 2026-10-26
completed:
depends_on: [design-system-001, design-system-c4v3r]
blocks: [infrastructure-001-walking-skeleton]
tags: [frontend, storybook, sky, legibility]
related_adrs: [0009]
related_research: []
prior_art: [design-system-001, design-system-c4v3r]
---

## Why
Bei der Durchsicht in Storybook war der Text oben auf dem Himmel (Kopfzeile „Der Himmel über … · Live · HH:MM“) teilweise schlecht lesbar, weil Wolken, Dämmerungsverläufe und Wetter den Kontrast zur Himmel-Tinte stellenweise aufheben. Der Betreiber wünscht eine Kontur in der Gegenfarbe: dunkle Schrift bekommt einen hellen (weißen) Rand, helle Schrift einen dunklen (schwarzen) Rand.

## What
Jeder Text, der direkt auf dem Himmel steht (heute: die Kopfzeile, Molekül `scene-header`, mit Himmel-Tinte hell/dunkel), erhält eine dünne Kontur in der Gegenfarbe der Tinte:
- Himmel-Tinte dunkel (`--pa-sky-ink-dark`) → helle Kontur.
- Himmel-Tinte hell (`--pa-sky-ink-light`) → dunkle Kontur.
Die Konturfarben werden als Tokens geführt (z. B. `--pa-sky-ink-dark-halo`, `--pa-sky-ink-light-halo`) und liegen als Default auf der jeweils anderen Himmel-Tinte (die helle Tinte #F6EEDC ist der Weißton, die dunkle Tinte #1F2A33 der Schwarzton des Design-Systems), damit der Betreiber sie bei Bedarf zentral auf reines Weiß/Schwarz stellen kann. Text auf Papier (Info-Leiste, Plaketten) bekommt keine Kontur.

## Acceptance criteria
- [ ] Die Kopfzeile zeigt bei dunkler Himmel-Tinte eine helle Kontur und bei heller Himmel-Tinte eine dunkle Kontur, in allen 28 Himmeln, in Templates, Pages und Übergängen.
- [ ] Die Kontur umschließt die Glyphen gleichmäßig (alle Richtungen), ist dünn genug, dass die Schrift nicht fett oder verschwommen wirkt, und skaliert mit der Schriftgröße (cqw-basiert, nicht fixe px).
- [ ] Die Kontur funktioniert in Safari 16 (iPadOS 16, Mindestgrenze); keine CSS-Eigenschaft, die Safari 16 für HTML-Text nicht unterstützt.
- [ ] Konturfarben sind Tokens in `styles/tokens.css`; die Token-Story zeigt sie.
- [ ] Text auf Papier (Info-Leiste, Plakette, Zuletzt-Leiste) bleibt ohne Kontur.
- [ ] Test-getrieben (ADR 0003): Unit-Test prüft, dass die Kopfzeile je nach Tinte die passende Kontur-Klasse/Token erhält; Playwright-Test prüft in einer Template-Story mit heller und einer mit dunkler Tinte die berechnete Kontur (z. B. `text-shadow`-Farbe ≙ Gegenfarbe) und dass die Info-Leiste keine hat.
- [ ] Alle bestehenden Tests bleiben grün.
- [ ] Der Betreiber prüft die Lesbarkeit in Storybook auf dem Handy. [human-eye]

## Notes
- Komponenten: `src/client/ui/molecules/scene-header.ts`, `src/client/ui/styles/ui.css` (`.pa-scene-header`, `.pa-ink-dark`, `.pa-ink-light`), `src/client/ui/styles/tokens.css`, Token-Story.
- Umsetzungsidee: mehrfacher `text-shadow` (8 Richtungen, ~0.08–0.12cqw) in der Gegenfarbe ist in Safari 16 robust; `-webkit-text-stroke` würde die Glyphen nach innen ausdünnen.
- Die Tinte-Regel selbst (hell auf Dämmerung, Nacht, Regen, Gewitter) bleibt unverändert.
