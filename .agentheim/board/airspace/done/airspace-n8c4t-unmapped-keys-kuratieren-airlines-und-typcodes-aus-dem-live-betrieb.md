---
id: airspace-n8c4t
title: Unmapped Keys aus dem Live-Betrieb kuratieren: 30 Airline-Präfixe und 13 Typcodes in die Tabellen aufnehmen, ZZZZ als "kein Typcode" behandeln
status: done
type: chore
created: 2026-10-27
context: airspace
completed:
depends_on: []
blocks: []
tags: [tabellen, kuratierung, live-test]
related_adrs: [0010, 0015]
related_research: []
prior_art: [airspace-f7k2m, airspace-h76v2]
---

## Why
Nach einem Tag Live-Betrieb in Oberweyer (2026-10-27) listet `unmapped_keys` 84 Airline-Präfixe und 26 Typcodes ohne Tabelleneintrag. Ohne Airline-Eintrag bleibt die Info-Leiste leer und die Ansage nennt keine Airline (ADR 0010 #4); ohne Typcode greift der Fallback und der Steckbrief sagt "Flugzeug" statt des Typnamens. Die Airline-Tabelle hat erst 40 Einträge, davon fehlen genau die, die hier häufig fliegen (Jet2, KLM Cityhopper, Lufthansa City, AJet, Aegean, Corendon, AeroLogic, Wizz Malta, Virgin Atlantic, TUI UK). Der ICAO-Platzhalter `ZZZZ` ("kein Typ") wird heute wie ein echter Typcode als unmapped gemeldet.

## What
- **Airlines** (`src/server/modules/airspace/tables/airlines.json`, ICAO-3-Präfix → `{name, country}`): alle 30 Präfixe mit ≥ 2 Sichtungen, Stand 2026-10-27 abends: EXS, KLC, LHX, OCN, TKJ, CAI, AEE, CXI, NJE, VIR, BOX, WMT, ABY, AIC, CAO, CCA, DLA, GFA, HOP, JAF, LBT, MGH, MSC, NGN, RJA, SEH, SRR, THA, TOM, WUK. Namen und Land gegen die VRS standing-data (CC0, Repo `vradarserver/standing-data`, Ordner `airlines/`; nicht im lokalen Snapshot unter `dataDir/vrs-standing-data`) oder die ICAO-Designator-Liste prüfen. Ein Präfix, dessen Zuordnung sich nicht belegen lässt, wird weggelassen und im Outcome genannt, nicht geraten. Präfixe mit nur 1 Sichtung (LAV, UAG, …) optional, wenn eindeutig.
- **Typcodes** (`src/server/modules/airspace/tables/type-classes.json`, `{name, typklasse, kategorie, besonderheit?}`; Typklasse aus den zehn Ids nach ADR 0009, Kategorie aus der kuratierten Liste: Kurzstrecke, Mittelstrecke, Langstrecke, Regional, Geschäftsreise, Allgemeine Luftfahrt, Hubschrauber, Segelflug): 13 Codes.
  - Entschieden beim Refinen: **K35R** = Boeing KC-135 Stratotanker, `narrowbody` (707-Rumpf), Kategorie `Langstrecke`, Besonderheit "Militärischer Tanker".
  - Vorschlag, vom Worker gegen eine Typreferenz zu prüfen: P208 Tecnam P2008 (light-aircraft, Allgemeine Luftfahrt), C550 Cessna Citation II (business-jet, Geschäftsreise), BE20 Beechcraft King Air 200 (turboprop, Regional), C150 Cessna 150 (light-aircraft, Allgemeine Luftfahrt), E35L Embraer Legacy 600/650 (business-jet, Geschäftsreise), G3 Gulfstream III (business-jet, Geschäftsreise), J328 Dornier 328JET (regional-jet, Regional), M20T Mooney M20 Turbo (light-aircraft, Allgemeine Luftfahrt), A124 Antonow An-124 (widebody, Langstrecke, Besonderheit "Schwertransporter"), T6 Beechcraft T-6 Texan II (light-aircraft, Allgemeine Luftfahrt, Besonderheit "Militärischer Trainer"), JUNR Junkers Ju 52 (nur aufnehmen, wenn der Code belegt ist; Typklasse dann light-aircraft oder turboprop, Besonderheit "Oldtimer"; sonst weglassen und im Outcome nennen).
  - Alle anderen Typen der Tabelle `unmapped_keys` (C42, PC12, C82R, DV20, A210, B36T, C27J, C295, C560, FDCT, H47, LGND, TAMP) sind seit airspace-f7k2m vorhanden; ihre Zeilen bleiben stehen (Entscheidung unten).
- **ZZZZ**: `resolveTypeClass` (oder die Adapter-Normalisierung) behandelt den Typcode `ZZZZ` wie "kein Typcode": Emitter-Fallback greift, `unmapped=false`, es wird nichts in `unmapped_keys` gemeldet. Kein Tabelleneintrag für ZZZZ.
- **Lackierungen** (`airline-liveries.json`) nur ergänzen, wo das Design-System bereits eine passende Lackierung hat; sonst Standard (ADR 0010). Keine neuen Lackierungen in diesem Task.
- **Keine Bereinigung von `unmapped_keys`** (Entscheidung beim Refinen 2026-10-27): die Tabelle wächst weiter, kuratierte Schlüssel bleiben mit ihrem Zählstand stehen. Wer die Tabelle auswertet, filtert selbst gegen die Tabellen. Weder Migration noch Start-up-Prune, keine Änderung am sighting-log-BC.

## Acceptance criteria
- [ ] Tabellentest (`tests/unit/server/typeclass.test.ts`): alle 30 genannten Airline-Präfixe sind in `airlines.json` mit nicht-leerem `name` und zweistelligem `country`; ein bewusst weggelassenes Präfix ist im Task-Outcome mit Grund genannt und aus der Testliste entfernt.
- [ ] Tabellentest: die 13 Typcodes (P208, C550, BE20, C150, E35L, G3, J328, M20T, K35R, A124, T6, JUNR sowie der bestehende DV20) sind in `type-classes.json` mit gültiger Typklasse (eine der zehn Ids nach ADR 0009) und einer Kategorie aus der kuratierten Liste; bewusst weggelassene Codes (z. B. JUNR, wenn unbelegt) sind im Outcome mit Grund genannt und aus der Testliste entfernt.
- [ ] Unit-Test: `resolveAirline` liefert für EXS, KLC, LHX, TKJ, TOM den kuratierten Namen; `resolveTypeClass` liefert für P208, BE20, J328, K35R Typname und Typklasse mit `fallback=false`, `unmapped=false`.
- [ ] Unit-Test: `resolveTypeClass('ZZZZ', 'A1')` verhält sich wie ohne Typcode (Emitter-Fallback, `unmapped=false`); `resolveTypeClass('ZZZZ', undefined)` liefert `light-aircraft`/`unbekannt` mit `unmapped=false`. Über `sky-service` wird für ZZZZ kein `reportUnmapped('type', …)` ausgelöst.
- [ ] Bestehende Start-up-Validierung der Tabellen bleibt grün; keine Tabelle enthält ZZZZ.
- [ ] `npm run typecheck` zeigt keine neuen Fehler in geänderten Dateien; `npm test` grün.

## Notes
Captured via `modeling` am 2026-10-27, refined am selben Abend. Entscheidungen beim Refinen: (1) keine Bereinigung von `unmapped_keys`, (2) Umfang auf den aktuellen Zählstand erweitert, (3) K35R = narrowbody. Zählstand Live-DB 2026-10-27 abends: EXS 13, KLC 12, LHX 9, OCN 9, TKJ 8, CAI 5, AEE 4, CXI 4, NJE 4, VIR 4, BOX 3, WMT 3, übrige 2; Typen P208 4, C550 2, DV20 2 (vorhanden), K35R 2, übrige 1. Mutmaßliche Namen zur Orientierung (vom Worker zu belegen): EXS Jet2, KLC KLM Cityhopper, LHX Lufthansa City Airlines, TKJ AJet, AEE Aegean, CAI Corendon Airlines, CXI Corendon Airlines Europe, BOX AeroLogic, VIR Virgin Atlantic, WMT Wizz Air Malta, WUK Wizz Air UK, TOM TUI Airways (GB), JAF TUI fly Belgium, NJE NetJets Europe, CCA Air China, CAO Air China Cargo, DLA Air Dolomiti, GFA Gulf Air, HOP HOP!, RJA Royal Jordanian, SEH Sky Express, THA Thai Airways, ABY Air Arabia, AIC Air India, LBT Nouvelair, SRR Star Air; OCN, MGH, MSC, NGN nur mit Beleg aufnehmen.

## Verifier note (iteration 1)
REASONS:
- Check 5 (BC README sync): the diff adds a new domain rule to type-class resolution. `typeclass.ts` (`NO_TYPE_PLACEHOLDER = 'ZZZZ'`, `resolveTypeClass`) now treats the ICAO placeholder "ZZZZ" as "no type code": the Emitter-Kategorie fallback applies, `unmapped=false`, nothing is reported to `unmapped_keys`. But `readmeDelta` is `[]`. The airspace README's **Typklasse** bullet (line 18) says how the Typklasse is derived when there is no table hit; the **Emitter-Kategorie** bullet (line 27) records the parallel rule "B0/B5 gelten als 'keine Kategorie'". The ZZZZ rule is missing from the README and no ADR mentions it.
- All other checks passed (tests map to criteria, npm test 403 green, typecheck green, no ZZZZ in tables, in scope, mappings spot-checked plausible).
SUGGESTED_FIX: Add a README_DELTA `replace` (or append) op on the airspace README's **Typklasse** bullet saying that the ICAO placeholder `ZZZZ` counts as "kein Typcode": Emitter-Kategorie fallback applies, `unmapped=false`, nothing reported to `unmapped_keys`. Phrase it like the existing B0/B5 wording. No code change needed.
ITERATION_HINT: likely-fixable

## Outcome

Curated the unmapped keys observed in live operation. 26 airline prefixes added to airlines.json: EXS, KLC, LHX, TKJ, TOM, AEE, CAI, CXI, NJE, VIR, BOX, WMT, WUK, JAF, CCA, CAO, DLA, GFA, HOP, RJA, SEH, THA, ABY, AIC, LBT, MSC. Type codes added to type-classes.json: P208, C550, BE20, C150, E35L, G3, J328, M20T, K35R, narrowbody/Langstrecke/"Militärischer Tanker" A124, T6 as mapped. Unsubstantiated keys deliberately omitted: OCN, MGH, NGN, SRR, JUNR. The ICAO placeholder ZZZZ is treated as no type code in typeclass.ts (category fallback, unmapped=false, not reported in unmapped_keys). Tests in tests/unit/server/typeclass.test.ts and tests/unit/server/sky-service.test.ts (4 added); npm test and npm run typecheck green.
