---
id: sky-scene-g3r8w
title: Mindesthaltezeit pro Slot gegen Flackern beim Flugzeugwechsel
status: doing
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
