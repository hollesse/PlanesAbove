---
id: airspace-f9cjz
title: Airline-Lackierungszuordnung für alle Katalog-Lackierungen vervollständigen (Emirates, Qatar, United, Jet2, KLM Cityhopper …) und Lackierungen standardmäßig einschalten
status: todo
type: bug
context: airspace
created: 2026-10-27
completed:
depends_on: []
blocks: [design-system-t6wz4]
tags: [liveries, tables, config]
related_adrs: [0010, 0009]
related_research: []
prior_art: []
---

## Why
Mona soll Flugzeuge in der Lackierung ihrer Airline sehen. Heute ist das aus zwei Gründen nicht der Fall, obwohl der Katalog 41 Lackierungen kennt:

1. `src/server/modules/airspace/tables/airline-liveries.json` ordnet nur 24 ICAO-Präfixe zu. 17 Katalog-Lackierungen sind keinem Präfix zugeordnet, obwohl die Airline in `airlines.json` steht oder im Sichtungslog auftaucht: Emirates (UAE, 7 Sichtungen mit Standard-Lackierung), Qatar Airways (QTR, 4), United (UAL, 4), Etihad (ETD), Icelandair (ICE), Singapore Airlines (SIA), Jet2 (EXS, 17× als unmapped gemeldet), KLM Cityhopper (KLC, 13×), Lufthansa City Airlines (LHX, 10×), Air China (CCA), Air India (AIC), Wizz Air Malta/UK (WMT, WUK), TUI Airways / TUI fly Belgium (TOM, JAF), American (AAL), Delta (DAL). Diese Flugzeuge werden heute weiß gezeichnet und zählen im Log als „Lackierung fehlt“, obwohl das Design existiert.
2. `liveries.enabled` steht in `src/server/config.ts` auf Default `false` („Skeleton“). Auch zugeordnete Airlines erscheinen daher in Weiß, solange die Betreiber-`config.yaml` nichts anderes sagt.

## What
- `airline-liveries.json` so ergänzen, dass **jede** Katalog-Lackierung außer `def` von mindestens einem Präfix referenziert wird. Mindestens: UAE→emirates, QTR→qatar, UAL→united, AAL→aa, DAL→delta, ETD→etihad, ICE→icelandair, SIA→singapore, EXS→jet2, KLC→klm, LHX→lh, CCA→airchina, AIC→airindia, WMT→wizz, WUK→wizz, TOM→tui, JAF→tui. Tochter-/Cargo-Gesellschaften mit eigener Bemalung (GEC Lufthansa Cargo, CAO Air China Cargo, HOP!) bleiben **ohne** Zuordnung (bewusst Standard-Lackierung), kommentiert in den Notes des Tasks statt in der JSON.
- Präfixe, die in `airline-liveries.json` stehen, aber nicht in `airlines.json`, dort mit Name und Land nachtragen (sonst kennt der Steckbrief die Airline nicht).
- Default von `liveries.enabled` in `src/server/config.ts` auf `true` setzen; Kommentar „Skeleton“ entfernen. `config.yaml` ist untracked und bleibt Sache des Betreibers.
- Bestehende Sichtungen werden nicht nachträglich geändert (`livery_present` bleibt wie geloggt).

## Acceptance criteria
- [ ] Ein Unit-Test schlägt fehl, wenn eine Katalog-Lackierung (`LIVERIES` ohne `def`) von keinem Präfix in `airline-liveries.json` referenziert wird; er ist grün.
- [ ] Ein Unit-Test schlägt fehl, wenn ein Präfix in `airline-liveries.json` ohne Eintrag in `airlines.json` ist; er ist grün (die bestehende Validierung „unbekannte Lackierungs-Id“ in `typeclass.ts` bleibt).
- [ ] `resolveLivery` liefert für `UAE` auf `double-decker` `{ liveryId: 'emirates', present: true }` und für `EXS` auf `narrowbody` `{ liveryId: 'jet2', present: true }` (Testfälle).
- [ ] Mit leerer Konfiguration ist `config.liveries.enabled === true` (Test über `loadConfig`/Zod-Default).
- [ ] Die oben genannten Präfixe sind alle zugeordnet; `GEC`, `CAO`, `HOP` bewusst nicht (im Task-Outcome festgehalten).

## Notes
- Abgespalten aus design-system-t6wz4 beim Refine am 2026-10-27: die „fehlenden Designs“ sind zur Hälfte fehlende Zuordnungen, nicht fehlende Zeichnungen. Dieser Task muss vor den neuen Zeichnungen laufen, damit die Statistik (sighting-log-t8tfb) nur echte Lücken zeigt.
- Zahlen stammen aus `data/planesabove.db` (`sightings.livery_present = 0` je Airline, `unmapped_keys`), Stand 2026-10-27.
- ADR 0010 §4: Lackierung = Eintrag in `airline-liveries`, sonst `def`; `light-aircraft`/`glider` immer `def`. Keine Änderung an dieser Regel.
- Betreiber: nach dem Merge `liveries.enabled: true` in der eigenen `config.yaml` setzen oder die Zeile entfernen.
