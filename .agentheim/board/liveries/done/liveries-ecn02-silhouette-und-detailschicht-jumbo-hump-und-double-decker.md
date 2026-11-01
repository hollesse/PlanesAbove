---
id: liveries-ecn02
title: Silhouette und Detailschicht für jumbo-hump und double-decker aus der Altgrafik (nach dem Widebody-Muster)
status: done
type: feature
context: liveries
created: 2026-11-01
completed:
depends_on: [liveries-yafve]
blocks: []
tags: [silhouette, details, typklassen]
related_adrs: [0031, 0032, 0038]
related_research: []
prior_art: [liveries-yafve, liveries-yzshd, liveries-wyypc]
---

## Why
Jumbo (Hump) und Double-Decker fehlen im Editor noch; nach widebody und regional-jet sind das die nächsten Großraumtypen über dem Haus.

## What
Für `jumbo-hump` und `double-decker` je `src/client/ui/assets/planes/<typklasse>/silhouette.svg` und `details.svg` exakt nach dem Muster von liveries-yafve (widebody): `<g id="body">` = Vereinigung Rumpf + Finne (Zuschnitt), `outline-fuselage`/`outline-fin` aus `fuselage-outline`/`tail-outline`, Farbfelder `field-engines` (zwei in der Seitenansicht sichtbare Triebwerke, unter dem Flügel → `back`, kein `data-layer`), `field-wings`, `field-tailplane` (die kleinen `paint-wings`-Flächen am Heck wie beim widebody); Detailschicht mit vollständiger `paint-window-line` (Jumbo: Fenster auch im Oberdeck-Buckel, falls die Altgrafik sie führt) und Triebwerksdetails (Einlassring, Fan je Triebwerk). Quelle: `src/client/ui/assets/svg/jumbo-hump.svg`, `double-decker.svg`; viewBox 1:1. Fixtures `liveries/spike/jumbo-hump.json` und `spike/double-decker.json` (ein Rumpf-Pfad) für die Story „Liveries/Pfade“. Rumpf-Buckel bzw. Doppeldeck gehören zum Rumpf (Pfadfläche), nicht zu einem Farbfeld.

## Acceptance criteria
- [ ] `PLANE_PARTS` enthält `jumbo-hump` und `double-decker` mit `body`, allen drei Farbfeldern (alle `back`), `outlines` und `details` (Erweiterung von `tests/unit/plane-details.test.ts`).
- [ ] Fensterleiste: gleiche Anzahl Teilpfade und Koordinaten wie `paint-window-line` der Altgrafik; Umrisse gleich `fuselage-outline`/`tail-outline` (Tests wie bei widebody).
- [ ] Der Snapshot-Test `livery-render-layers.test.ts` bleibt für narrowbody/widebody byte-gleich; beide neuen Typen rendern ohne Fehler; Stories `liveries-pfade--spike-jumbo-hump` und `--spike-double-decker` existieren; WebKit-Story-Lauf und `editor-chromium` grün; beide Typen im Editor wählbar.
- [ ] `npm test`, `npm run typecheck` grün.
- [ ] Beide Silhouetten sehen im Editor wie in der Himmelsszene aus; Buckel/Oberdeck, Trennlinie, Cockpitfenster und die zwei sichtbaren Triebwerke (Seitenansicht) stimmen. [human-eye]

## Notes
Betreiber-Wunsch vom 2026-11-01. Beide Altgrafiken tragen dieselben Klassen wie widebody (6 `paint-engines`-Elemente = 4 Gondeln inkl. Pylone/Details, 4 `paint-wings`, Fensterleiste, Umrisse, Maske). Falls eine Altgrafik ein Farbfeld nicht hat oder ein Feld den Rumpf überlappt (ADR 0038 `front`), im Outcome notieren und nicht erfinden. Reale config.yaml anpassen: nein.

## Verifier note (iteration 1)

REASONS:
- Check 2: `npx playwright test --project=webkit --project=editor-chromium` exited 1 — `draw-and-compare.spec.ts` "draw a quad …" expected saved files `['spike','spike/narrowbody.json']` but got `spike/double-decker.json`; 9 serial tests skipped. Root cause in this diff: the editor's starting type is `typklassen[0]` = alphabetically first key of PLANE_PARTS, now `double-decker` instead of `narrowbody`. The worker did not run Playwright.
- Other gates green (npm test 795, typecheck, builds; both stories exist). Observations: the "two engines" finding is correct (side view, far engines hidden) — the task note's "vier Triebwerke" was wrong and has been corrected to two. Body joins and hump/upper deck verified by calculation; strut overlap matches widebody.

SUGGESTED_FIX: Pin the editor's starting type to `narrowbody` when it exists (tools/livery-editor/src/main.ts, instead of `typklassen[0]`) or select narrowbody explicitly in draw-and-compare.spec.ts before drawing; then rerun webkit + editor-chromium and confirm both new types are selectable.

ITERATION_HINT: likely-fixable

## Outcome
Silhouette (body als Rumpf-Finne-Vereinigung, outline-fuselage, outline-fin, Felder engines/wings/tailplane) und Detailschicht (Fensterleiste, je Triebwerk Einlassring und Fan) für jumbo-hump und double-decker unter src/client/ui/assets/planes/<typ>/, erzeugt aus den Altgrafiken (viewBox 1:1, Pfade unverändert, Körper-Vereinigung durch Teilen der Nasenkurve am Schnittpunkt mit der Finnenkante). Spike-Lackierungen liveries/spike/<typ>.json; die Stories liveries-pfade--spike-jumbo-hump/--spike-double-decker entstehen automatisch. Höcker bzw. Oberdeck sind Teil des Rumpfpfads, kein Farbfeld. Tests: tests/unit/plane-details.test.ts um beide Typen erweitert (Parts, Fensterleiste, Umrisse, Render, kein data-layer, 6 Triebwerks-Teile / 2 Detailpaare je Typ).
Abweichungen in der Altgrafik: Beide Typen haben zwei in der Seitenansicht sichtbare Triebwerke (6x paint-engines = 2 Gondeln samt Pylonen/Details, 2 Einlassringe, 2 Fans); alle Felder liegen unter Flügel/Rumpf, daher keine front-Felder. Beide haben ein Höhenleitwerk, also Feld tailplane. double-decker: Finne bis y=-45, Rumpfoberkante y=140. Strut-Rechteck überlappt den Rumpf knapp wie beim widebody (back, keine Aussparung). [human-eye] offen.
Iteration 2: tools/livery-editor/src/main.ts startete auf typklassen[0] (alphabetisch jetzt double-decker); der Startzustand ist jetzt narrowbody, falls vorhanden, sonst der erste Schlüssel (eine Zeile). Die Auswahlliste wird aus Object.keys(PLANE_PARTS) gebaut, daher sind jumbo-hump und double-decker im Editor wählbar. Volles Gate: npm test exit 0, npm run typecheck exit 0, build-storybook und build exit 0, npx playwright test --project=webkit --project=editor-chromium 49 passed, exit 0.
