---
id: airspace-z5r8n
title: Unbekannte Airline- und Typcodes aus dem Betrieb (Runde 2) kuratieren: 119 Airline-Präfixe und 39 Typcodes prüfen und belegte in die Tabellen aufnehmen
status: done
type: chore
context: airspace
created: 2026-10-30
completed:
depends_on: []
blocks: []
tags: [tabellen, kuratierung, live-test]
related_adrs: [0009, 0010]
related_research: []
prior_art: [airspace-n8c4t, airspace-f7k2m, airspace-h76v2]
---

## Why
Der Betreiber hat am 2026-10-30 die aktuelle Liste unbekannter Schlüssel aus dem Live-Betrieb gemeldet (Sichtungszahl in Klammern). Ohne Airline-Eintrag bleiben Info-Leiste und Ansage ohne Airline (ADR 0010). Ohne Typcode greift der Emitter-Fallback, und der Steckbrief sagt „Flugzeug“ statt des Typnamens. Bei häufigen Codes wie A306 (Frachter) oder C17 ist dann auch die Silhouette falsch.

**Airlines (119 Präfixe):** UPS 23, SRR 15, TVS 10, ABR 9, ASL 9, BPO 9, NGN 9, OCN 9, ANA 8, FHY 8, RCH 8, SAR 8, SWT 8, MGH 7, QFA 7, CGF 6, CND 6, JAL 6, TAY 6, CTN 5, LGL 5, FHM 4, GAF 4, KAC 4, MAS 4, MSR 4, BTI 3, CHX 3, CHZ 3, EFW 3, EVA 3, FDX 3, ITY 3, MNB 3, NMA 3, SCR 3, TVF 3, UNI 3, VJT 3, AAR 2, ABB 2, AIZ 2, AUH 2, BRK 2, CAL 2, CKK 2, ENT 2, GAC 2, GPX 2, HGO 2, HVN 2, IFA 2, ISR 2, MBU 2, MEA 2, NCA 2, NJU 2, PIA 2, PVD 2, RBA 2, ROT 2, RUK 2, TFL 2, TSC 2, VJH 2, AAB 1, ADZ 1, AHY 1, AXY 1, BAF 1, BAH 1, BBC 1, BEJ 1, BOH 1, CHH 1, CTM 1, CVK 1, DFC 1, DMS 1, ECC 1, EIS 1, ELJ 1, FLD 1, FNF 1, FPO 1, FSF 1, FUU 1, FXT 1, GFD 1, HUE 1, HYM 1, HYS 1, JCB 1, JEI 1, LEJ 1, LHB 1, LZB 1, MJE 1, OMA 1, PEX 1, PIZ 1, PNC 1, QAF 1, QAJ 1, RHH 1, RJB 1, RSX 1, SAH 1, SCQ 1, SVI 1, SWU 1, TAR 1, TDR 1, TOY 1, TUA 1, UBD 1, UBT 1, UGJ 1, VCJ 1, VIO 1.

**Typcodes (39 Codes, 81 Sichtungen):** A306 12, C17 10, LJ35 5, WT9 4, FK9 3, GL7T 3, S22T 3, ULAC 3, C210 2, CH60 2, CLON 2, GA6C 2, GOLF 2, M20P 2, PAY1 2, A400 1, AN12 1, AS32 1, AT73 1, BE33 1, BE40 1, C30J 1, DA50 1, GL5T 1, DAL4 1, G70 1, GA7C 1, H60 1, HDJT 1, NG5 1, P149 1, P28S 1, P46T 1, PA24 1, PA38 1, PIVI 1, R135 1, RF3 1, SKRA 1.

## What
- **Airlines** (`src/server/modules/airspace/tables/airlines.json`, ICAO-3-Präfix → `{name, country}`): jeden Präfix gegen die ICAO-Designator-Liste (Doc 8585) bzw. das eigene gesicherte Wissen prüfen. Aufnehmen, was eindeutig belegt ist, auch Militär- und Staatsbetreiber (z. B. GAF Luftwaffe, RCH US Air Force AMC „Reach“, BAF Belgian Air Component, CTM französische Luftwaffe COTAM, BPO Bundespolizei, QAF Qatar Amiri Flight), mit einem kurzen, für Laien verständlichen deutschen Namen. Nicht belegbare Präfixe werden weggelassen und im Outcome mit Grund genannt, nicht geraten. In airspace-n8c4t wurden OCN, MGH, NGN und SRR als unbelegt weggelassen. Sie werden jetzt erneut geprüft, weil sie häufig sind. Vermutungen zur Orientierung, die der Worker belegen muss: OCN Discover Airlines (DE), SRR Star Air (DK, UPS-Zubringer), UPS UPS Airlines, TVS Smartwings, ABR ASL Airlines Ireland, ASL Air Serbia, TAY ASL Airlines Belgium, FPO ASL Airlines France, FHY Freebird Airlines, FHM Freebird Airlines Europe, SWT Swiftair, CGF Cargo Air, CND Corendon Dutch Airlines, CTN Croatia Airlines, LGL Luxair, BTI airBaltic, TVF Transavia France, TFL TUI fly Netherlands, RUK Ryanair UK, ENT Enter Air, VJT VistaJet, ITY ITA Airways, MNB MNG Airlines, LZB Bulgaria Air, ROT TAROM, CHX Christoph (Luftrettung).
- **Typcodes** (`src/server/modules/airspace/tables/type-classes.json`, `{name, typklasse, kategorie, besonderheit?}`): Typklasse muss eine der zehn Ids nach ADR 0009 sein, die Kategorie kommt aus der kuratierten Liste (Kurzstrecke, Mittelstrecke, Langstrecke, Regional, Geschäftsreise, Allgemeine Luftfahrt, Segelflug, Hubschrauber). Bestehende Einträge sind der Maßstab: PC12 ist turboprop/Regional, C27J und C295 turboprop/Regional, K35R narrowbody/Langstrecke mit „Militärischer Tanker“. Vorschläge, die der Worker prüfen muss:
  - A306 Airbus A300-600: widebody, Mittelstrecke. Weil hier fast nur Frachter fliegen, optional mit Besonderheit.
  - C17 Boeing C-17 Globemaster III: widebody, Langstrecke, „Militärtransporter“.
  - A400 Airbus A400M: turboprop, Langstrecke, „Militärtransporter“.
  - C30J Lockheed C-130J und AN12 Antonow An-12: turboprop.
  - R135 Boeing RC-135: narrowbody, wie K35R.
  - LJ35, GL7T, GL5T, BE40, HDJT, GA6C/GA7C (Gulfstream G600/G700, nur wenn belegt): business-jet.
  - AS32 Super Puma, H60 Black Hawk: helicopter.
  - AT73 ATR 72-300: turboprop, Regional. PAY1 Piper Cheyenne: turboprop.
  - P46T Piper Meridian: wie PC12 eingeordnet.
  - WT9, FK9, S22T, ULAC, C210, CH60, M20P, BE33, DA50, P149, PA24, PA38, PIVI, SKRA, RF3: light-aircraft, Allgemeine Luftfahrt. RF3 ist ein Motorsegler und bleibt bei light-aircraft.
  - CLON, GOLF, DAL4, G70, NG5, P28S: nur mit Beleg aufnehmen, sonst weglassen und im Outcome nennen.
- **Lackierungen** (`airline-liveries.json`) nur dort ergänzen, wo das Design-System schon eine passende Lackierung hat. Keine neuen Lackierungen.
- Keine Bereinigung von `unmapped_keys` und keine Codeänderung außer an den Tabellen und Tests. Die Start-up-Validierung (ADR 0010) bleibt unverändert.

## Acceptance criteria
- [ ] Tabellentest (`tests/unit/server/typeclass.test.ts`, neue Testfälle): eine Liste der aufgenommenen Airline-Präfixe (mindestens alle mit ≥ 3 Sichtungen, außer den im Outcome begründet weggelassenen) steht in `airlines.json` mit nicht-leerem `name` und zweistelligem `country`. Der Test schlägt ohne die Tabellenänderung fehl.
- [ ] Tabellentest: die aufgenommenen Typcodes (mindestens A306, C17, LJ35, WT9, FK9, GL7T, S22T, ULAC, A400, C30J, AS32, H60, AT73, HDJT) stehen in `type-classes.json` mit gültiger Typklasse (ADR 0009) und Kategorie aus der kuratierten Liste.
- [ ] Unit-Test: `resolveAirline` liefert für UPS, OCN (falls belegt), TVS, GAF den kuratierten Namen. `resolveTypeClass` liefert für A306 `widebody`, C17 `widebody`, AS32 `helicopter`, WT9 `light-aircraft`, jeweils mit `fallback=false` und `unmapped=false`.
- [ ] Die Start-up-Validierung der Tabellen bleibt grün. Liveries referenzieren nur vorhandene Design-System-Ids.
- [ ] Das Outcome listet jeden weggelassenen Präfix und Typcode mit kurzem Grund.
- [ ] `npm run typecheck` und `npm test` sind grün.

## Notes
Erfasst vom Conductor am 2026-10-30 aus der Meldung des Betreibers. Vorgehen wie bei airspace-n8c4t. Der Worker hat keinen Webzugriff. Belegt heißt hier: eindeutig aus gesichertem Wissen über ICAO-Designatoren, im Zweifel weglassen.

## Verifier note (iteration 1)
REASONS:
- `AUH` ist als „Abu Dhabi Aviation“ eingetragen. Der ICAO-Designator AUH gehört aber dem UAE Presidential Flight (Präsidentenflugstaffel der VAE, VIP-Jets mit Rufzeichen AUHxx). Damit nennen Info-Leiste und Ansage den falschen Betreiber.
- Ohne Einfluss auf das Ergebnis:
  - GL5T steht für Global 5000 und 5500.
  - FK9 hat nur den Namen „FK9“.
  - CH60 ist der Zenair CH 601 Zodiac.
  - Die Zahlen im Outcome passen nicht zu den Listen.
SUGGESTED_FIX:
- AUH auf „Präsidentenflugstaffel der VAE“ / AE umbenennen.
- GL5T heißt „Bombardier Global 5000/5500“.
- FK9 heißt „FK-Lightplanes FK9“.
- CH60 als Zenair CH 601 Zodiac aufnehmen (light-aircraft, Allgemeine Luftfahrt).
- Die Zahlen im Outcome korrigieren.
ITERATION_HINT: likely-fixable

## Outcome
Round 2 curation. airlines.json +58 prefixes (73 -> 131): UPS, SRR, TVS, ABR, ASL, BPO, OCN, ANA, FHY, RCH, SWT, QFA, CGF, CND, JAL, TAY, CTN, LGL, FHM, GAF, KAC, MAS, MSR, BTI, EVA, FDX, ITY, MNB, TVF, VJT, AAR, ABB, AIZ, AUH (Präsidentenflugstaffel der VAE), CAL, CKK, ENT, HVN, ISR, MEA, NCA, PIA, RBA, ROT, RUK, TFL, TSC, AHY, BAF, BBC, CHH, CTM, FPO, LZB, OMA, QAF, TAR, TUA.
type-classes.json +33 codes (162 -> 195): A306, C17, A400, C30J, AN12, R135, LJ35, GL7T, GL5T (Bombardier Global 5000/5500), BE40, HDJT, GA6C, GA7C, AS32, H60, AT73, PAY1, P46T, WT9, FK9 (FK-Lightplanes FK9), S22T, ULAC, C210, CH60 (Zenair CH 601 Zodiac), M20P, BE33, DA50, P149, PA24, PA38, PIVI, SKRA, RF3.
airline-liveries.json: TVF -> transavia (existing design-system id). Tests in tests/unit/server/typeclass.test.ts (describe "curation round 2").
Omitted airline prefixes (61 of 119; not certain of designator/operator, no web access): NGN, MGH, SAR, CHX, CHZ, EFW, NMA, SCR, UNI, BRK, GAC, GPX, HGO, IFA, MBU, NJU, PVD, VJH, AAB, ADZ, AXY, BAH, BEJ, BOH, CVK, DFC, DMS, ECC, EIS, ELJ, FLD, FNF, FSF, FUU, FXT, GFD, HUE, HYM, HYS, JCB, JEI, LEJ, LHB, MJE, PEX, PIZ, PNC, QAJ, RHH, RJB, RSX, SAH, SCQ, SVI, SWU, TDR, TOY, UBD, UBT, UGJ, VCJ, VIO. Of these, NGN, MGH, SAR, CHX, CHZ, EFW, NMA, SCR, UNI have >=3 sightings (CHX: Christoph designator not certain; NGN/MGH: operator unclear).
Omitted type codes (6 of 39; not certain of meaning): CLON, GOLF, DAL4, G70, NG5, P28S.
Verifier: iteration 1 FAIL (AUH), iteration 2 fixes checked by conductor; vitest unit 395 passed, typecheck green.

## Nachtrag 2026-10-30 (Conductor): Abgleich mit VRS standing-data (CC0)
**Quelle:** Die restlichen Präfixe und Typcodes wurden gegen `vradarserver/standing-data` geprüft (`airlines/schema-01/airlines.csv`, `model-type/schema-01/*.csv`, Lizenz CC0). Ein Zwischenstand aus der adsbdb-Airline-API wurde verworfen, weil adsbdb nicht in eigene Datenbanken übernommen werden darf (ADR 0016). adsbdb war zudem bei ASL, OCN, CND, ENT und ABB veraltet; VRS hat dort die aktuellen Betreiber.

**46 Präfixe aufgenommen** (Tabelle jetzt 177): NGN, SAR, MGH, CHX (DRF Luftrettung), EFW, NMA, SCR, GAC, GPX, HGO, IFA, MBU, NJU, PVD, VJH, AAB, ADZ, AXY, BAH, BOH, CVK, DFC, EIS, ELJ, FNF, FSF, FXT, GFD, HYM, HYS, JCB, JEI, LEJ, LHB, PNC, QAJ, RHH, RSX, SAH, SCQ, SVI, SWU (SkyAlps), TDR, UBD, UBT, VCJ. VRS führt kein Land. Das Land stammt aus gesichertem eigenem Wissen.

**Weiter weggelassen:**
- Land nicht sicher: CHZ (Challenge Air Cargo), UNI (Unicair), DMS (Diamond Sky), ECC (Eclair Aviation), FLD (Air Falcon), FUU (Fly My Sky), PEX (Pelican Express), TOY (Toyo Aviation), UGJ (UG Jet), VIO (Aviator.S5).
- Wahrscheinlich veraltet: BRK, RJB.
- Nicht in VRS: BEJ, HUE, PIZ.

**6 Typcodes aufgenommen** (Tabelle jetzt 201):
- CLON AutoGyro Cavalon: helicopter, Allgemeine Luftfahrt, Besonderheit „Tragschrauber“.
- GOLF Tecnam P96 Golf, DAL4 Dallach D4 Fascination, G70 Groppo G-70, NG5 BRM Aero Bristell, P28S Piper PA-28R Turbo Arrow III: alle light-aircraft.

**Tests:** describe-Block „curation round 3“. Der bisherige Test, der CHX77 als unbekannten Präfix benutzte, wurde auf `DEABC` umgestellt. `npm test` 542 bestanden, Typecheck grün.
