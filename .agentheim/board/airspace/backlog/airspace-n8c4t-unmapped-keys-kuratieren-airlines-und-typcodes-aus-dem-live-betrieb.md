---
id: airspace-n8c4t
title: Unmapped Keys aus dem Live-Betrieb kuratieren: 26 Airline-Präfixe und 10 Typcodes in die Tabellen aufnehmen
status: backlog
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
Nach einem Tag Live-Betrieb in Oberweyer (2026-10-27) listet `unmapped_keys` 68 Airline-Präfixe und 23 Typcodes ohne Tabelleneintrag. Ohne Airline-Eintrag bleibt die Info-Leiste leer und die Ansage nennt keine Airline (ADR 0010 #4); ohne Typcode greift der Fallback und der Steckbrief sagt "Flugzeug" statt des Typnamens. Die Airline-Tabelle hat erst 40 Einträge, davon fehlen genau die, die hier häufig fliegen (Jet2, KLM Cityhopper, Lufthansa City, AJet, Aegean, Corendon, AeroLogic, Wizz Malta, Virgin Atlantic, TUI).

## What
- **Airlines** (`tables/airlines.json`, ICAO-3-Präfix → Name, Land): alle Präfixe mit ≥ 2 Sichtungen, Stand 2026-10-27: EXS, KLC, LHX, OCN, TKJ, AEE, CAI, CXI, BOX, VIR, WMT, CAO, CCA, DLA, GFA, HOP, MGH, MSC, NGN, NJE, RJA, SEH, SRR, THA, TOM, WUK. Namen gegen VRS standing-data `airlines` (CC0, im Snapshot unter `dataDir/vrs-standing-data` nicht enthalten, aber im Repo `vradarserver/standing-data/airlines/`) oder ICAO-Designator-Liste prüfen; unsichere Präfixe weglassen statt raten. Einträge mit nur 1 Sichtung (LAV Albastar, UAG, …) optional, wenn eindeutig.
- **Typcodes** (`tables/type-classes.json`, Name, Typklasse nach ADR 0009, Kategorie nach ADR 0010): P208 (Tecnam P2008, light-aircraft), C550 (Citation II, business-jet), BE20 (King Air 200, turboprop), C150 (Cessna 150, light-aircraft), E35L (Embraer Legacy 600, business-jet), G3 (Gulfstream III, business-jet), J328 (Dornier 328JET, regional-jet), K35R (KC-135, widebody oder narrowbody — entscheiden), M20T (Mooney M20 Turbo, light-aircraft), JUNR (Junkers Ju 52? prüfen; sonst weglassen). C42, PC12, C82R, DV20, A210, B36T, C27J, C295, C560, FDCT, H47, LGND, TAMP sind seit airspace-f7k2m vorhanden.
- **Lackierungen** (`airline-liveries.json`) nur, wo das Design-System bereits eine Lackierung hat; sonst Standard (ADR 0010).
- Nach der Kuratierung die erledigten Schlüssel aus `unmapped_keys` entfernen oder die Tabelle beim Start gegen die Tabellen bereinigen (Entscheidung beim Refinen; heute wächst die Tabelle nur).

## Acceptance criteria
- [ ] Tabellentest: alle 26 genannten Airline-Präfixe sind in `airlines.json` mit Name und Land; die Start-up-Validierung bleibt grün.
- [ ] Tabellentest: die 10 Typcodes sind in `type-classes.json` mit gültiger Typklasse (ADR 0009) und kuratierter Kategorie (ADR 0010), oder im Task-Outcome als "bewusst weggelassen, Grund" benannt.
- [ ] `resolveAirline` liefert für EXS, KLC, LHX, TKJ den Namen; `resolveTypeClass` für P208, BE20, J328 Typname und Typklasse ohne Fallback (Unit-Tests).
- [ ] `unmapped_keys` enthält nach einem Start mit der neuen Tabelle keine der kuratierten Schlüssel mehr (Bereinigung beim Start oder Migration; Test mit vorbefüllter DB).
- [ ] `npm run typecheck` und `npm test` grün.

## Notes
Captured via `modeling` on 2026-10-27 — konkret genug zum Promoten, offene Entscheidung nur: Bereinigung von `unmapped_keys` beim Start vs. Migration. Zählstand 2026-10-27: EXS 11, KLC 10, LHX 9, OCN 9, TKJ 6, AEE 4, CAI 4, CXI 4, BOX 3, VIR 3, WMT 3, Rest 2; Typen P208 3, C550 2, DV20 2 (bereits vorhanden), übrige 1.
