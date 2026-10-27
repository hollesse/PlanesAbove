---
id: design-system-kcpnw
title: Übergangs-Player und -Katalog datengetrieben machen (Slot-Referenzen statt Beispiel-Keys), Storybook-Bilder bleiben identisch
status: done
type: refactor
context: design-system
created: 2026-10-27
completed:
depends_on: [design-system-001]
blocks: [sky-scene-n0sfy]
tags: [uebergang, transitions, storybook, refactor]
related_adrs: [0002, 0020]
related_research: []
prior_art: [design-system-001]
---

## Why
Die 22 Übergänge (ADR 0002, Pages/Übergänge) sind in `src/client/ui/transitions/catalog.ts` fest auf die Beispiel-Keys A–F aus `domain/samples.ts` verdrahtet, und `transitions/player.ts` baut jede Ebene aus `SAMPLE_PLANES` / `SAMPLE_FLIGHTS`. Die Live-Szene (sky-scene-n0sfy) muss dieselben Choreografien mit echten Flugzeugen, Flügen, Himmel und „Zuletzt“-Text abspielen. Der Player ist das Modul, das die App importiert (keine Kopien, README-Regel); er muss Daten von außen annehmen, ohne dass sich im Storybook ein Pixel ändert.

## What
Reiner Refactor im design-system, keine neue Abnahme (die Bilder bleiben identisch):

- **Ebenen-Modell.** Specs referenzieren Flugzeuge/Flüge nicht mehr per Beispiel-Key, sondern per Seite + Index in den Vorher-/Nachher-Zustand:
  ```ts
  type Side = 'from' | 'to';
  interface PlaneRef { side: Side; index: 0 | 1 }   // Index in data.from / data.to (Array-Reihenfolge = Slot-Reihenfolge)
  BarSpec: { kind:'single'; flight: PlaneRef } | { kind:'double'; flights:[PlaneRef,PlaneRef] } | { kind:'recent'; text: Side }
  Layer.plane: { kind:'plane'; slot: PlaneSlot; plane: PlaneRef; anim? }
  Layer.header: { kind:'header'; ink?: Ink; anim? }   // ink weggelassen = skyInk(data.sky)
  ```
  Konvention: eine Ebene, die geht, liest `from`; eine, die kommt oder bleibt (Leiste), liest `to` (Höhe/Route können sich inzwischen aktualisiert haben). Die festen „Zuletzt: …“-Strings wandern aus dem Katalog in die Beispieldaten.
- **Daten + Signatur.**
  ```ts
  interface TransitionData { from: ScreenPlane[]; to: ScreenPlane[]; sky: SkyKey; place: string; clock: string; stale?: {since:string}; recent: { from?: string; to?: string } }
  renderTransitionStage(spec, data, aspect = '4:3'): HTMLElement
  ```
  Eine Ebene, deren Referenz oder Text fehlt (Index außerhalb, `recent.to` undefined), wird übersprungen – nie ein Throw, nie eine halbe Ebene. `playTransition` / `resetTransition` bleiben unverändert.
- **Storybook.** `renderTransition({spec, aspect, autoplay, data?})` nimmt standardmäßig `sampleTransitionData(spec.id)` (neben `domain/samples.ts`), eine kleine Tabelle, die die heutigen Bilder exakt reproduziert (empty-to-one: to=[A]; one-to-two: from=[A], to=[A,D]; empty-to-two: to=[E,F]; one-to-empty: from=[A], recent.to='Zuletzt: Lufthansa LH400 · gerade eben'; two-to-one-b: [A,D]→[A]; two-to-one-a: [A,D]→[D]; two-to-empty: [A,D]→[], recent.to='Zuletzt: Lufthansa LH400 · Ryanair FR1724 · gerade eben'; switch-one: [A]→[E]; switch-two-1: [A,D]→[E,D]; switch-two-2: [A,D]→[A,F]; switch-two-both: [A,D]→[E,F]; empty-to-*: recent.from = RECENT_TEXT; Wetter/Tageszeit: from=to=[A], Himmel literal in den Ebenen, Tinte literal).
- **Header-Tinte** der Flugzeug-Specs kommt aus `data.sky` (heute hart `'dark'`, bei Dämmerung/Nacht falsch); Crossfade-Specs behalten ihre literalen Tinten.
- **Ende-Signal.** `export const TRANSITION_MS = 5000` neben `DURATION = '5s'` (daraus abgeleitet). Das Ende ist ein fester Timer im Aufrufer, nicht `animationend` (jsdom feuert es nie, null animierte Ebenen hätten kein Ende, Safari 16 lässt es gelegentlich aus; `fill: both` macht ein leicht spätes Ende unsichtbar).
- **Barrel.** `renderTransitionStage`, `playTransition`, `TRANSITION_MS`, `TransitionData`, `pickable` Spec-Ids über `src/client/ui/index.ts` exportieren – die App importiert nur über den Barrel (ADR 0002).
- Ankommende Ebenen tragen `data-side="to"` (und den Index), damit der Client Tipps während eines Übergangs auf das neue Flugzeug auflösen kann.

## Acceptance criteria
- [ ] `tests/unit/transitions.test.ts`: keine Ebene der 11 Flugzeug-Specs enthält mehr ein `SampleKey`-Literal; jede `PlaneRef` und jede `recent`-Referenz löst gegen `sampleTransitionData(spec.id)` auf (Index < Länge der genannten Seite, Text vorhanden, wo die Spec ihn braucht).
- [ ] `tests/unit/transitions.test.ts`: `renderTransitionStage(spec, customData)` mit eigenen Flügen setzt genau Callsign, Typ und `recent`-Text aus `data` ins DOM (z. B. `two-to-empty`: `recent.to` erscheint wörtlich in der Zuletzt-Leiste); Beispieldaten erscheinen nirgends.
- [ ] `tests/unit/transitions.test.ts`: `data.sky = night` ergibt bei einer Flugzeug-Spec eine Kopfzeile mit heller Tinte; eine fehlende Referenz (`recent.to` undefined) überspringt die Ebene ohne Throw.
- [ ] `tests/unit/transitions.test.ts`: für alle 22 Specs hat die beispielgetriebene Bühne dieselbe Ebenenfolge, dieselbe `data-anim-name`-Liste und dieselben Slot-Klassen wie ein vor dem Refactor aufgenommener Snapshot – der Refactor ändert kein Bild.
- [ ] `tests/unit/transitions.test.ts`: `TRANSITION_MS === 5000` und entspricht den Sekunden in `DURATION`; der bestehende Keyframe-Test bleibt grün.
- [ ] `tests/e2e/stories.spec.ts`: die bestehenden Übergangs-Tests inkl. „Himmel deckt die Bühne“ bei 4:3 und 5:3 laufen unverändert grün (Beweis der visuellen Identität, keine neue Abnahme).
- [ ] Ankommende Ebenen (`side: 'to'`) tragen `data-side="to"`; eine Unit-Prüfung zählt sie je Spec (z. B. one-to-two: ein Flugzeug + ein Badge + eine Leiste).

## Notes
- Kind-Task aus der Refinement von sky-scene-bvnnx (dismissed, ersetzt durch kcpnw + sky-scene-n0sfy). Die Live-Verdrahtung (Diff, Übergang-Sperre) ist sky-scene-n0sfy; dieser Task liefert nur das datengetriebene Modul.
- ADR 0020 hält die Ende-Signal-Entscheidung (fester Timer) fest.
- Pattern-Referenz für den Wechsel von Beispiel- auf Echtdaten: `templates/screen.ts` (`ScreenPlane`).

## Verifier note (iteration 1)
REASONS:
- Criterion 7 only partly covered: it asks for a unit check counting `data-side="to"` layers **per spec**. The only new test (`arriving layers carry data-side="to" (one-to-two: ...)`) counts a single spec; the other 10 plane specs are unchecked, so a wrong side (e.g. `F` vs `T` in switch-two-2's `plane('one', T(0))`, or the badge rule `data.to[n-1] ? 'to' : 'from'` in two-to-one-a / two-to-empty) would go unnoticed.
- The asserted one-to-two count (2 planes + 2 badges + 1 bar) differs from the criterion's example (1+1+1). The worker's numbers fit the `## What` rule (staying plane A reads `to`; both badges pop in fresh), so the criterion's example looks loose, but the departure is not stated in the Outcome.
- Criteria 1–6 hold: the snapshot fixture was independently confirmed as a real pre-refactor capture (old renderer through the same stageSummary matches all 22); npm test 429 green, typecheck clean, e2e:chromium 11 passed incl. sky-covers-stage at 4:3 and 5:3; barrel exports present; plane specs take ink from skyInk(data.sky), crossfades keep literals; README delta covers the new terms.
SUGGESTED_FIX: Replace or extend the data-side test with a per-spec table covering all 11 plane specs; for each assert the expected number of `.pa-slot`, `.pa-badge-slot` and `.pa-bar` layers with `data-side="to"` (and `"from"`), derived from the `## What` convention. Record in the Outcome that one-to-two counts 2 planes + 2 badges + 1 bar rather than the criterion's 1+1+1 example, and why.
ITERATION_HINT: likely-fixable

## Outcome

The Uebergangs-Player is data-driven: it takes TransitionData (from/to plane lists, sky, place, clock, optional stale/recent) and renders each catalog spec from PlaneRef-based layers, with `sampleTransitionData(id)` as the Storybook default. Snapshot identity for all 22 specs is preserved; arriving layers carry `data-side`/`data-index`. Key files: src/client/ui/transitions/catalog.ts, player.ts, src/client/ui/domain/transition-samples.ts, src/client/ui/index.ts, tests/unit/transitions.test.ts, tests/unit/fixtures/.

Iteration 2 (verifier note): replaced the single data-side test with a per-spec table covering all 11 plane specs (empty-to-one, one-to-two, empty-to-two, one-to-empty, two-to-one-b, two-to-one-a, two-to-empty, switch-one, switch-two-1, switch-two-2, switch-two-both). For each it asserts the number of `.pa-slot`, `.pa-badge-slot` and `.pa-bar` layers with `data-side="to"` and `="from"`, plus a guard that the table covers every plane spec. Rule: leaving layers read `from`, arriving or staying layers `to`; a badge reads `to` when the target side still has that slot, else `from`; a bar follows its first plane ref (recent: its text side). The table matched the catalog on first run, so no catalog fix was needed.

Explicit note on one-to-two: it counts 2 planes + 2 badges + 1 bar with data-side="to" (not the criterion's 1+1+1 example). The staying plane A is `T(0)`, so it reads `to` alongside the arriving plane B, and both badges pop in fresh on the target side (two planes now exist there), so both read `to`. Only one bar (the double bar) is `to`; the old single bar is `from`. The criterion's 1+1+1 example counted only the newly arriving layers; staying layers read `to` by the stated convention.

Verified: npm test 440 passed, typecheck clean, e2e:chromium 11 passed.
