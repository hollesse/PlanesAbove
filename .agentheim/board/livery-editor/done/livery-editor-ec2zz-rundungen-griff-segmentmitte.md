---
id: livery-editor-ec2zz
title: Rundungen: Griff in der Segmentmitte macht aus der Geraden eine Kurve
status: done
type: feature
context: livery-editor
created: 2026-11-01
completed:
depends_on: []
blocks: []
tags: [editor-feedback, zeichenbrett, rundung]
related_adrs: [0031, 0032, 0035]
related_research: []
prior_art: [livery-editor-zc7hk]
---

## Why
Es fehlt, dass man Rundungen machen kann (README-Begriff „Rundung“: Griff in der Mitte eines Segments, Wegziehen macht aus der Geraden eine Kurve, wie in Photoshop).

## What
Für die ausgewählte Ebene (oder den gerade geschlossenen Pfad) zeigt das Brett je Segment einen Griff. Ohne Rundung sitzt er in der Segmentmitte; Ziehen setzt `via[i]` auf die Griffposition (Punkt AUF der Kurve, das Schema und `pathData` kennen das bereits: Kontrollpunkt = 2·via − Mitte). Doppelklick auf den Griff setzt `via[i]` auf `null` und macht das Segment wieder gerade. Griffposition wird beim Ziehen auf ganze Zahlen gefangen (`snap`). Logik in `tools/livery-editor/curve.ts` (`segmentHandle(layer, i)`, `setVia(layer, i, p|null)`), Bedienung in `src/main.ts`.

## Acceptance criteria
- [ ] `curve.ts`: Griffposition ohne Rundung ist die Segmentmitte, mit Rundung der `via`-Punkt; `setVia` schreibt/löscht genau den Index und hält `via` so lang wie `points` (Unit-Tests, inklusive Schließsegment).
- [ ] Ein gezogener Griff liegt nach dem Rendern auf der Kurve (Test: `pathData` ergibt bei t=0,5 den via-Punkt, rechnerisch über die quadratische Bézier-Formel).
- [ ] Speichern schreibt `via`; die Story rendert die Rundung identisch (Editor-E2E: ein Segment runden, speichern, Pixelvergleich mit der Story grün).
- [ ] Doppelklick auf den Griff macht das Segment wieder gerade (E2E oder Unit-Test über die Bedienlogik).
- [ ] `npm test`, `npm run typecheck`, `editor-chromium` grün.
- [ ] Das Ziehen fühlt sich wie in Photoshop an: Die Kurve folgt dem Griff. [human-eye]

## Notes
Refined 2026-11-01 aus dem Betreiber-Feedback zum Editor-Spike livery-editor-zc7hk (Kriterium [human-eye]). Entscheidung des Betreibers: Zurück zur Geraden per Doppelklick auf den Griff, kein Einrasten. Konflikt-Hinweis: teilt `src/main.ts` mit hz0hb und nxdzh; die Griffe setzen eine Ebenenauswahl voraus, die nxdzh einführt. Wenn nxdzh noch nicht da ist, gelten die Griffe für den zuletzt geschlossenen Pfad.

## Verifier note (iteration 1)

REASONS:
- Check 2 (test execution): `npx playwright test --project=editor-chromium` exited 1 in 3 of 5 runs. Each time the failing test was the pre-existing `draw a quad … match the Storybook story` (draw-and-compare.spec.ts:65): its assertion `readdirSync(EDITOR_OUT) == ['spike', 'spike/narrowbody.json']` also got `round-corner` and `round-corner/narrowbody.json`.
- Cause: playwright.config.ts sets `fullyParallel: true` and `EDITOR_OUT` (os.tmpdir()/pa-editor-out) is one directory shared by all workers. The new round-corner test saves into it while the quad test runs in another worker; the `beforeEach` rmSync does not isolate parallel workers. Pre-existing E2E is now flaky → criterion 5 broken.
- npm test (749 passed), typecheck, builds, the new round-corner E2E and the 4 curve.test.ts tests are green.

SUGGESTED_FIX: Make the editor E2E safe to run in parallel: e.g. `test.describe.configure({ mode: 'serial' })` for the spec, or make the quad test check only its own `spike/` entry instead of the whole of EDITOR_OUT (likewise for the stack-order test if it asserts the whole directory). Then confirm editor-chromium exits 0 on several runs in a row.

ITERATION_HINT: likely-fixable

## Outcome
Rundungen im Editor: Für die ausgewählte, sichtbare Pfad-Ebene (nicht während ein Entwurf läuft) zeigt das Overlay je Segment einen Griff (`curve-handle-i`), ohne Rundung in der Segmentmitte, sonst auf `via[i]`. Mousedown+Ziehen setzt `via[i]` auf die gefangene Brettposition, die Kurve folgt live; Doppelklick setzt `via[i]` auf null. Ein Griff-Gestenstart fügt keinen Entwurfspunkt hinzu (Flag `handleGesture`); `toBoard` nutzt das aktuell eingehängte Overlay, da das Brett beim Ziehen neu gezeichnet wird. Reine Logik: `tools/livery-editor/curve.ts` (`segmentHandle`, `setVia`, hält `via` so lang wie `points`) mit `curve.test.ts` (inkl. Schließsegment und Bézier-t=0,5-Test). Neues Fixture `liveries/round-corner/narrowbody.json` (Story wird von build-assets erzeugt); Editor-E2E zieht den Griff, speichert (deep-equal Fixture), vergleicht Pixel mit der Story und prüft Doppelklick. `npm test`, `typecheck`, `editor-chromium` grün. Parallel-Sicherheit (Iteration 2): `draw-and-compare.spec.ts` läuft per `test.describe.configure({ mode: 'serial' })` in einem Worker, weil alle Tests ein gemeinsames `EDITOR_OUT` teilen und der Quad-Test dessen ganzes Verzeichnis prüft; `editor-chromium` lief dreimal hintereinander mit Exit 0. Das [human-eye]-Kriterium bleibt dem Betreiber.
