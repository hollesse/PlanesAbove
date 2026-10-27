---
id: sky-scene-g3r8w
title: Mindesthaltezeit pro Slot gegen Flackern beim Flugzeugwechsel
status: done
type: feature
context: sky-scene
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [szene, live-test, auswahl]
related_adrs: [0017]
related_research: []
prior_art: [sky-scene-w9n4f, infrastructure-001-walking-skeleton]
---

## Why
Live-Test am 2026-10-27 in Oberweyer: Die Szene übernimmt jeden 30-s-Takt neu die zwei nächsten Flugzeuge. Sobald ein anderes Flugzeug minimal näher ist, wird gewechselt, und einen Takt später oft wieder zurück. Das wirkt als Flackern. Die Entscheidung (ADR 0017) ändert das v1-Verhalten "zwei nächste" zu "zwei nächste, mit Mindesthaltezeit und stabilen Slot-Positionen".

## What
Die Slot-Belegung der Szene bekommt eine Mindesthaltezeit. Regeln (Builder-Entscheidungen, final, siehe ADR 0017):

1. **Reine Haltezeit, keine Hysterese.** Ein Flugzeug, das einen Slot belegt, behält ihn mindestens N Takte (`scene.slotHoldTakte`, Default 3 = 90 s bei `pollIntervalSeconds` 30; validiert als positive ganze Zahl). Nach N Takten gilt für diesen Slot wieder die normale Nächste-Regel.
2. **Haltezeit endet sofort**, wenn der Halter den Radius verlässt oder aus den Flugdaten verschwindet; der Slot wird im selben Takt vom nächsten Nicht-Halter neu besetzt.
3. **Slots behalten ihre Position.** Kein Tausch Slot 1 / Slot 2, solange beide Halter bleiben; nur ein freigewordener Slot wird neu besetzt. Die Slot-Nummer ist stabile Identität in der Szene; die Spalte `slot` im Sichtungslog folgt ihr.
4. **Nähe bleibt rein horizontale Haversine-Distanz** (airspace `selectNearest`, unverändert). Höhe wird bewusst ignoriert (Builder-Entscheidung; airspace-h9x4p wird deshalb verworfen).
5. **Vorlese-Sperre bleibt und komponiert:** Ein durch die Sperre blockierter Wechsel wird im ersten Takt nach Ende des Vorlesens angewendet; Haltezähler laufen während des Vorlesens weiter.

Umsetzung: neue reine Funktion in sky-scene, z. B. `assignSlots(previous, candidates, now)` mit Haltezeitpunkt (hold-until) pro Slot, wobei `candidates` die nächstsortierte Liste aus `selectNearest` ist. `sky-service.ts` ersetzt `inRadius.slice(0, 2)` durch `assignSlots` und hält den Slot-Zustand zwischen Takten; `recordSighting(..., slot)` erhält die stabile Slot-Nummer. Neuer Config-Key in `src/server/config.ts` (zod). Zeit über die injizierbare Clock/FakeClock.

## Acceptance criteria
- [ ] Unit (FakeClock): Halter A in Slot 1 bleibt N Takte lang in Slot 1, obwohl ein näheres Flugzeug C auftaucht.
- [ ] Unit: Nach N Takten wird A von dem dann nächsten Nicht-Halter C verdrängt (normale Nächste-Regel).
- [ ] Unit: Verlässt der Halter den Radius, wird der Slot im selben Takt vom nächsten Nicht-Halter besetzt.
- [ ] Unit: Verschwindet der Halter aus den Flugdaten, gilt dasselbe (sofortige Neubesetzung).
- [ ] Unit: Kein Slot-Tausch: Bleiben beide Halter, behalten sie ihre Slot-Nummern, auch wenn sich ihre Distanz-Reihenfolge umkehrt.
- [ ] Unit: Vorlese-Sperre komponiert: Ein während des Vorlesens fälliger Wechsel wird im ersten Takt nach Ende angewendet; Haltezähler laufen währenddessen weiter.
- [ ] Unit: Config `scene.slotHoldTakte` hat Default 3; 0, negative, Dezimalzahlen und Nicht-Zahlen werden von der zod-Validierung abgelehnt.
- [ ] Unit: `assignSlots` ist eine reine Funktion (kein Clock-/IO-Zugriff außer übergebenem `now`) und mit Tabellentests abgedeckt.
- [ ] Unit/Integration: Die `slot`-Spalte im Sichtungslog bleibt über die Haltezeit stabil (kein neuer Sichtungseintrag und keine Slot-Änderung bei bloßem Distanz-Wechsel).
- [ ] E2E: Szenario `scenarios/slot-hold.json` plus Playwright-Test: innerhalb von 3 Takten kein Wechsel trotz näherem Flugzeug, Wechsel bei Takt 4.
- [ ] Bestehender E2E "Wechsel waehrend des Vorlesens" bleibt grün.
- [ ] `npm run typecheck` und alle Tests (Unit + E2E) sind grün.

## Notes
Verfeinert am 2026-10-27 nach Live-Test. Alle fünf Regeln sind Builder-Entscheidungen und nicht erneut zu öffnen. Verworfen: Hysterese und Höhen-Gewichtung (Schrägdistanz, scheinbare Größe), siehe ADR 0017. Das Geschwister-Capture airspace-h9x4p (Gewichtung der Nähe) wird verworfen. Bei `pollIntervalSeconds` ≠ 30 ändert sich die reale Haltedauer proportional (N Takte, nicht Sekunden). Vision.md-Formulierung "zwei nächsten" wird durch ADR 0017 für v1 erweitert; die Anpassung des Vision-Texts liegt beim Menschen/Modeling-Skill.

## Outcome

Implemented ADR 0017. New pure function `assignSlots(previous, candidates, now, holdMs)` in `src/server/modules/sky-scene/slots.ts` (state: two slots with `{icao24, holdUntil}`); `SkyService` keeps the slot state between Takte, builds the scene from the slot order and writes the stable slot number to the Sichtungslog (`slot` is null for non-holders). New config key `scene.slotHoldTakte` (zod positive int, default 3) in `src/server/config.ts`, documented in `config.example.yaml` and root `README.md`.

Design details: holdUntil = now + (N - 0.5) Takt, so hold covers Takte 1..N and the swap happens at Takt N+1 regardless of clock jitter. After expiry the normal nearest rule applies among open slots, but an expired holder still among the nearest keeps its slot (no swap, only the farther one gets replaced). Vorlese-Sperre composes by construction: the hold is server-side and independent of state() polling; unit test covers that, the existing e2e "Wechsel waehrend des Vorlesens" stays green.

Tests: tests/unit/server/slots.test.ts (table tests, purity), sky-service.test.ts (hold, Takt-4 swap, radius/vanish, no-swap + stable slot column, config), config.test.ts, E2E in tests/e2e/skeleton.spec.ts with scenarios/slot-hold.json. `npm test` 258 passed, typecheck green, `npm run e2e:chromium` 11 passed (WebKit not run; Chromium only).

Note: the task wording "A wird von C verdrängt" at Takt 4 resolves in the E2E as slot 2 (b) being replaced by c while a stays in slot 1, because a is still among the two nearest after expiry. The airspace README / vision wording ("zwei nächsten") is not updated by this task.
