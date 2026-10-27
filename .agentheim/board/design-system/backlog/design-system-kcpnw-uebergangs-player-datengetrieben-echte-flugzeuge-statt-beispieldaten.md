---
id: design-system-kcpnw
title: Übergangs-Player und -Katalog datengetrieben machen (Slot-Referenzen statt Beispiel-Keys), Storybook-Bilder bleiben identisch
status: backlog
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
