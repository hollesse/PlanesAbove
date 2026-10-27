---
id: airspace-f7k2m
title: Unbekannte Typcodes und B-Emitterkategorien als light-aircraft statt narrowbody darstellen, Typtabelle ergänzen (Ikarus C42 D-MMDP)
status: doing
type: bug
context: airspace
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [typklasse, live-test, bug]
related_adrs: [0009, 0010, 0015]
related_research: []
prior_art: []
---

## Why
Live-Test am 2026-10-27 in Oberweyer: Die Ikarus C42 D-MMDP (Ultraleicht) flog 11 km entfernt in 1500 m Höhe und war das sichtbar nächste Flugzeug. Der Dienst zeigte sie zwar an, zeichnete sie aber als weißen Mittelstrecken-Jet. Für Mona ist das falsch, für den Betreiber sah es aus, als wären nur Airliner im Umkreis.

## What
Ursache: `C42` fehlt in `type-classes.json`, `EMITTER_FALLBACK` in `typeclass.ts` kennt nur A1..A7, und der Endfallback ist `narrowbody`. Entscheidungen siehe ADR 0015 (ändert ADR 0010 §3(c)):
- **Endfallback** (kein Typcode-Treffer, keine nutzbare Emitterkategorie): `light-aircraft`, Kategorie `unbekannt`, `fallback=true`.
- **B-Kategorien:** B1 -> `glider`; B4 -> `light-aircraft`; B0/B5 wie "keine Kategorie". A1..A7 unverändert.
- **Ausgeschlossen aus der Auswahl** (wie on-ground): B2, B3, B6, B7 und alle C*. Umsetzung in `selectNearest` oder der Adapter-Normalisierung (Worker-Wahl), im airspace-Modul.
- **Tabelle `type-classes.json`** (Felder name, typklasse, kategorie; nur ADR-0009-Typklassen, nur kuratierte Kategorien aus ADR 0010):
  - C42 Comco Ikarus C42 -> light-aircraft / Allgemeine Luftfahrt
  - FDCT Flight Design CT -> light-aircraft / Allgemeine Luftfahrt
  - PC12 Pilatus PC-12 -> turboprop / Regional (einmotoriger Turboprop; Silhouette `turboprop` gewählt, nicht `light-aircraft`)
  - C82R Cessna 182RG -> light-aircraft / Allgemeine Luftfahrt
  - DV20 Diamond DV20 Katana -> light-aircraft / Allgemeine Luftfahrt
  - B36T Beech Bonanza 36 (Turbine) -> light-aircraft / Allgemeine Luftfahrt
  - C560 Cessna Citation V/Ultra -> business-jet / Geschäftsreise
  - C295 Airbus/CASA C-295 -> turboprop / Regional
  - C27J Alenia C-27J Spartan -> turboprop / Regional
  - H47 Boeing CH-47 Chinook -> helicopter / Hubschrauber
  - TAMP Socata TB-9 Tampico -> light-aircraft / Allgemeine Luftfahrt
  - LGND Lancair Legacy -> light-aircraft / Allgemeine Luftfahrt
  - A210 Aquila A210 -> light-aircraft / Allgemeine Luftfahrt
  - Zusätzlich (UL/GA, noch nicht in der Tabelle): CTSW (Flight Design CTSW), EV97 (Evektor EV-97 Eurostar), AAT3 (AAT-3 Aero), DA62 (Diamond DA62) -> jeweils light-aircraft / Allgemeine Luftfahrt. TB20, SR20 und P28A existieren bereits (PA28 ebenfalls) und bleiben unverändert.
  - Namen/Zuordnung bei Zweifel gegen ICAO DOC 8643 prüfen; unsichere Zusatzcodes weglassen statt raten.

## Acceptance criteria
- [ ] `resolveTypeClass` Unit-Test: Tabellentreffer (z. B. `A318`) liefert die Tabellenwerte, `fallback=false`, `unmapped=false`.
- [ ] Unit-Test: A-Kategorie-Fallback (z. B. unbekannter Code + `A3`) verhält sich unverändert gegenüber dem Stand vor der Änderung.
- [ ] Unit-Test: unbekannter Code + `B1` -> `glider`, `fallback=true`.
- [ ] Unit-Test: unbekannter Code + `B4` -> `light-aircraft`, `unmapped=true`.
- [ ] Unit-Test: B0/B5 + unbekannter Code verhalten sich wie "keine Kategorie".
- [ ] Unit-Test: kein Code und keine Kategorie -> `light-aircraft`, Kategorie `unbekannt`, `fallback=true`; kein Pfad liefert mehr `narrowbody` als Endfallback.
- [ ] Unit-Test (selectNearest oder Adapter-Normalisierung): Kandidaten mit Kategorie B2, B3, B6, B7 und C1/C2/C3 werden nie ausgewählt, auch wenn sie am nächsten sind; B1/B4 und A* bleiben wählbar.
- [ ] Tabellentest: alle 13 Codes (C42, FDCT, PC12, C82R, DV20, B36T, C560, C295, C27J, H47, TAMP, LGND, A210) sind vorhanden, mit gültiger Typklasse (ADR 0009) und kuratierter Kategorie (ADR 0010); die Zusatzcodes CTSW, EV97, AAT3, DA62 ebenfalls; Start-up-Validierung bleibt grün.
- [ ] Regressionstest mit konstruierter adsb.lol-Fixture-Zeile für D-MMDP (`t: "C42"`, `category: "B4"`, `type: "mlat"`, Hex konstruiert und als solcher markiert) durch Adapter und Auswahl: Ergebnis `light-aircraft` (über Tabellentreffer C42), nicht `narrowbody`.
- [ ] Dieselbe Fixture mit entferntem `t` wird als `light-aircraft` über den B4-Fallback aufgelöst.
- [ ] Airspace-Doku (BC-README / Tabellenbeschreibung), sofern sie den `narrowbody`-Endfallback nennt, ist auf ADR 0015 aktualisiert (Worker meldet das README-Delta).
- [ ] `npm run typecheck` und `npm test` grün.

## Notes
Captured via `quick-capture` am 2026-10-27, refined am selben Tag. Beleg: `unmapped_keys` in der lokalen SQLite-DB listet C42, PC12, C82R, C295, FDCT (plus die übrigen oben genannten Codes). Die Ikarus kam per MLAT (seen_pos ca. 5 s), nicht per ADS-B; Position war trotzdem brauchbar. Light-aircraft und glider werden auf Livery `def` erzwungen (ADR 0009), der Fallback zeigt also keine erfundene Airline. Kategorie `unbekannt` ist ein neuer Wert außerhalb der kuratierten Liste und entsteht nur über den Fallback, nie in der Tabelle.
