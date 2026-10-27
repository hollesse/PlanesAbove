---
id: airspace-f7k2m
title: Ultraleicht und unbekannte Typcodes werden als narrowbody gezeichnet (Ikarus C42 D-MMDP)
status: backlog
type: bug
context: airspace
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [captured, typklasse, live-test]
related_adrs: []
related_research: []
prior_art: []
---

## Why
Live-Test am 2026-10-27 in Oberweyer: Die Ikarus C42 D-MMDP (Ultraleicht) flog 11 km entfernt in 1500 m Höhe und war das sichtbar nächste Flugzeug. Der Dienst zeigte sie zwar an, zeichnete sie aber als weißen Mittelstrecken-Jet. Für Mona ist das falsch, für den Betreiber sah es aus, als wären nur Airliner im Umkreis.

## What
Der Typcode `C42` steht nicht in `type-classes.json`. adsb.lol liefert die Emitter-Kategorie `B4` (Ultraleicht), aber `EMITTER_FALLBACK` in `typeclass.ts` kennt nur A-Kategorien. Der Endfallback in `resolveTypeClass` ist `narrowbody`. Erwartung:
- B-Kategorien im Fallback abbilden: B1 Segelflug und B4 Ultraleicht → light-aircraft; B2 Ballon und B6 Drohne sinnvoll zuordnen oder ausblenden.
- Endfallback nicht `narrowbody`, sondern light-aircraft oder eine Unbekannt-Darstellung.
- Gängige Kleinflugzeug-Codes in die Tabelle aufnehmen, mindestens C42, PC12, C82R, SR20.

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `quick-capture` on 2026-10-27 — raw, unrefined. Needs a `modeling` refine pass before it can be promoted. Beleg: `unmapped_keys` in der lokalen SQLite-DB listet C42, PC12, C82R, C295, FDCT. Die Ikarus kam per MLAT (seen_pos ca. 5 s), nicht per ADS-B; Position war trotzdem brauchbar.
