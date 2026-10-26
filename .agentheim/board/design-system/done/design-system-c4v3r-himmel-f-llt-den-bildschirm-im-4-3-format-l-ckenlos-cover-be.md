---
id: design-system-c4v3r
title: Himmel füllt den Bildschirm im 4:3-Format lückenlos (Cover-Beschnitt statt weißer Streifen unten)
status: done
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

## Verifier note (iteration 1)
**REASONS:**
- Check 1: the criterion "Auch in den Übergangs-Stories (Wetter wechselt, Tageszeit wechselt) füllen beide Himmel die Bühne während des gesamten Übergangs" has no test. Production path is correct (transitions/player.ts:24 builds every sky layer via renderSkyLayer; catalog.ts:65 weather/time specs animate opacity only), but tests/unit/screen.test.ts only checks renderScreen over EXAMPLE_PAGES and the e2e test (tests/e2e/stories.spec.ts:44) filters to `Templates/` stories only, so `Pages/Übergänge` is never measured.
- Check 1, secondary: "every state (empty, one, two) in 4:3 and 5:3" — the e2e test only reaches 5:3 through the single Templates story Format53 ("Eins"); empty and two at 5:3 are never measured.
- Bookkeeping: TESTS_ADDED reported 4, diff adds 3 (2 unit, 1 e2e).
**SUGGESTED_FIX:** Add a unit test in tests/unit/transitions.test.ts asserting that every `.pa-sky svg` in renderTransitionStage(spec) uses preserveAspectRatio="xMidYMid slice" with width and height 100% for the weather and time-of-day transitions, and/or widen the e2e cover test to `Pages/` stories (Übergänge and Beispielszenen, ideally also at 5:3) checking every `.pa-sky svg` on the stage, not just the first. Cover empty/one/two at 5:3. Correct TESTS_ADDED to the real count.
**ITERATION_HINT:** likely-fixable

## Verifier note (iteration 2)
**REASONS:**
- Check 1, "In jedem Bildschirmzustand (leer, eins, zwei) im Format 4:3 und 5:3": empty and two at 5:3 are still never measured. The widened e2e test (tests/e2e/stories.spec.ts:44) loads each Templates/ and Pages/ story with default args only; every story defaults to `aspect: '4:3'` (screen.stories.ts:11, pages.stories.ts:6, transitions.stories.ts:11) except Templates `Format53` (state "Eins" only). The new unit cover test renders EXAMPLE_PAGES at 4:3 only. The test name's "(4:3 and 5:3)" overstates coverage.
- Check 1, secondary: in the e2e cover test `if (!m.cover) continue;` skips every sky svg lacking `preserveAspectRatio="xMidYMid slice"` — without the production fix every svg is skipped and the test still passes, so it cannot fail when the fix is missing.
- Addressed from iteration 1: transitions criterion now covered by tests/unit/transitions.test.ts; TESTS_ADDED count now correct.
**SUGGESTED_FIX:** Measure empty, one and two at 5:3 — e.g. pass `args=aspect:5:3` in the e2e iframe URL for each Templates/Pages story (or add 5:3 variants of Leer and Zwei / a loop over both ASPECTS per state). Replace `if (!m.cover) continue;` with an assertion that every stage sky covers the stage, so the test fails without the fix.
**ITERATION_HINT:** likely-fixable

## Outcome
Stage skies now render as cover: renderSkyLayer passes { cover: true } to renderSky, giving an SVG with preserveAspectRatio="xMidYMid slice" at width/height 100%, centered and cropped; the standalone Himmel atom keeps the full 1.6:1 motif. Transitions reuse renderSkyLayer, so both skies cover the stage throughout.
Tests (4 new): unit - stage sky is cover for every EXAMPLE_PAGE at both 4:3 and 5:3 (asserts all six aspect/state combos empty, one, two); atom stays non-cover; every sky of every weather/time transition is cover. Playwright - every Templates/ and Pages/ story (incl. Uebergaenge and Beispielszenen with empty/one/two) is loaded at 4:3 and at 5:3 (aspect switched via Storybook's updateStoryArgs channel, since URL args cannot carry a colon value; the test asserts the stage's data-aspect and width/height ratio), and every .pa-sky svg inside a .pa-screen must cover its stage (gaps <= 3px on all sides). Format53 is skipped in the 4:3 pass as it pins 5:3.
Sanity check: with renderSkyLayer temporarily reverted to renderSky(key) (no cover), both unit tests and the e2e test failed; with the fix restored, 44 unit tests, 4 e2e tests, typecheck and storybook build pass. Operator still to eyeball cropping of sun/moon/clouds at the edges [human-eye].
