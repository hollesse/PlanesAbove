---
id: airspace-v4kqz
title: Gesperrte Lufträume in der Plausibilitätsprüfung: schneidet der Großkreis einen gesperrten Luftraum, entfällt die Korridorprüfung und die erlaubte Kursabweichung steigt (Befund KAL908 London–Seoul)
status: todo
type: bug
context: airspace
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [routes, plausibility, live-test]
related_adrs: [0005, 0016]
related_research: []
prior_art: [airspace-p8w2k, airspace-prwpv, airspace-hw8f9]
---

## Why
Live-Test 2026-10-27 20:46 Uhr (Oberweyer): KAL908 (Korean Air B777-300ER HL8346, London Heathrow → Seoul Incheon) kannten hexdb, adsbdb und VRS richtig. Abgelehnt hat die Korridorprüfung: Der Großkreis London–Seoul läuft über Skandinavien und Sibirien (Anfangskurs 40°), das Flugzeug stand bei Aschaffenburg (50.21/9.54) in FL330 mit Kurs 104°, also 601 km südlich des Großkreises; Korridorgrenze seit prwpv 150 km (Kappung). Die Kursabweichung zum Direktkurs nach Seoul (47°) betrug 57° und lag nur knapp unter `maxHeadingDeviationDeg` 65.

Ursache ist real: Seit der Sperrung des russischen, belarussischen und ukrainischen Luftraums (2022) fliegen europäische und ostasiatische Airlines den Südbogen über Mitteleuropa, Türkei, Kaspisches Meer, Zentralasien und China. Für solche Routen ist der Großkreis-Korridor als Prüfkriterium ungeeignet. Entscheidung des Betreibers: Luftraumsperrungen als grobe Polygone konfigurieren; schneidet der Großkreis einer Route ein gesperrtes Polygon, entfällt die Korridorprüfung und die erlaubte Kursabweichung wird vergrößert. Keine Längengrenze (die würde Kurzstrecken oder Langstrecken ohne Umleitung falsch behandeln).

## What
**Erkennung.** Neue Funktion in `geo.ts` oder einem neuen Modul `closed-airspace.ts`: Großkreis a → b in Schritten von `closedAirspaceSampleKm` (Default 100 km) abtasten (sphärische Interpolation, nicht linear in lat/lon) und je Punkt per Punkt-in-Polygon (Ray-Casting auf lat/lon, Polygone sind klein genug für planare Näherung) gegen jedes Polygon prüfen. Start- und Zielpunkt gehören dazu. Trifft ein Punkt, gilt die Legs als **umgeleitet** (`detoured`). Datumsgrenze (±180°) muss für Russland-Polygon korrekt behandelt werden (Polygon endet bei 180; der Großkreis London–Seoul kreuzt die Datumsgrenze nicht, ein Test mit Nordamerika–Japan soll sie trotzdem abdecken).

**Wirkung in `isPlausibleRoute` (Leg-Prüfung).** Bei `detoured`:
- Korridorprüfung (cross-track) entfällt.
- Kursprüfung nutzt `detourHeadingDeviationDeg` (Default 90) statt `maxHeadingDeviationDeg` (65).
- Höhenprofil und Flugphasen-Prüfung bleiben unverändert (ein Steigflug kurz nach Frankfurt mit Route London–Seoul bleibt abgelehnt).
Ohne Umleitung ändert sich nichts.

**Konfiguration** unter `sources.route.plausibility`:
- `detourHeadingDeviationDeg` (positive number ≤ 180, Default 90)
- `closedAirspaceSampleKm` (positive number, Default 100)
- `closedAirspaces`: Liste von `{ name, since, note?, polygon: [[lat, lon], ...] }` (mindestens 3 Ecken, lat −90..90, lon −180..180). Eine Angabe in `config.yaml` **ersetzt** die Default-Liste vollständig (kein Merge), `closedAirspaces: []` schaltet die Erkennung ab. Zod-validiert, in `config.example.yaml` (auskommentiert mit Hinweis auf die Defaults), README und BC-README (Delta: neuer Begriff „Umgeleitete Route“ und Bullet zur Plausibilitätsprüfung) dokumentiert.

**Default-Polygone (grob, Ecken als [lat, lon], im Uhrzeigersinn; Quelle: Sperrungen und Meidegebiete laut EASA Conflict Zone Information Bulletins und den Sperrverfügungen von 2022, Stand 2026-10-27):**
```yaml
closedAirspaces:
  - name: Russland
    since: 2022-02-28
    note: Gegenseitige Sperrung EU/UK/Korea/Japan ↔ Russland; Kaliningrad bewusst nicht enthalten (zu klein für die Abtastung).
    polygon: [[69.5, 28.5], [82, 60], [82, 180], [64, 180], [43, 135], [50, 120], [50, 87], [42, 48], [46, 38], [52, 31], [56, 28], [60, 28]]
  - name: Belarus
    since: 2022-02-28
    polygon: [[56, 23], [56, 32], [51.3, 31], [51.5, 24], [52.5, 23]]
  - name: Ukraine
    since: 2022-02-24
    polygon: [[52.3, 24], [52, 34], [50, 40], [47, 39], [45, 33], [44, 33], [45.5, 29], [48, 22], [50, 22.5]]
  - name: Iran
    since: 2024-04-13
    note: Meidegebiet (viele Airlines umfliegen, nicht alle); situativ.
    polygon: [[39.5, 44.5], [38, 48.5], [37, 54], [37, 61], [25, 61], [25, 56], [30, 48], [33, 45]]
  - name: Irak
    since: 2014-07-20
    note: Nur nördlich von FL320 teilweise freigegeben; Meidegebiet.
    polygon: [[37.3, 42], [36.5, 45], [30, 48], [29, 44], [33, 38.8]]
  - name: Syrien
    since: 2012-01-01
    polygon: [[37.3, 36], [37.3, 42], [32.5, 38.8], [33, 35.6]]
  - name: Libyen
    since: 2014-08-01
    polygon: [[33, 10], [33, 25], [20, 25], [20, 10]]
  - name: Sudan
    since: 2023-04-15
    polygon: [[22, 25], [22, 37], [9, 34], [9, 25]]
  - name: Jemen
    since: 2015-03-26
    polygon: [[19, 42], [16.5, 52.5], [12.5, 54], [12.5, 43]]
  - name: Afghanistan
    since: 2021-08-15
    polygon: [[38, 67], [37, 75], [29.5, 66], [29.5, 61], [35, 61]]
  - name: Nordkorea
    since: 1997-01-01
    polygon: [[43, 124], [43, 131], [38, 130], [38, 124]]
```
Die Koordinaten sind absichtlich grob (Landesgrenzen auf 1–2° gerundet); es geht um „schneidet der Großkreis dieses Land“, nicht um Metergenauigkeit. Der Worker darf die Ecken korrigieren, wenn ein Polygon ein Nachbarland deutlich mit abdeckt (Test: Großkreis Frankfurt–Helsinki und Frankfurt–Istanbul dürfen **kein** Polygon treffen; Frankfurt–Dubai darf Irak/Iran treffen, das ist korrekt).

**Statistik.** `route_lookups` bleibt unverändert; ein Debug-Logeintrag `route plausibility` mit `detoured: true` und dem getroffenen Polygon-Namen reicht (kein Persistieren).

## Acceptance criteria
- [ ] KAL908-Fall (London Heathrow 51.4775/−0.4614 → Seoul Incheon 37.4633/126.44; Position 50.2124/9.5366, Kurs 104, 10 058 m, Vertikalrate 0) ist plausibel; der Großkreis trifft das Polygon „Russland“.
- [ ] Derselbe Fall mit Kurs 230 (Abweichung > 90°) ist abgelehnt; derselbe Fall in 3000 m im Steigflug 8 m/s 60 km von Frankfurt entfernt ist abgelehnt (Höhenprofil/Phase bleiben aktiv).
- [ ] Ohne Sperrung keine Änderung: Frankfurt–Helsinki und Köln–Wien mit 160 km Querabstand bleiben abgelehnt; LHX1979, AUA166D, DLH400, CTN4456, LZB407, KLC24J bleiben plausibel; EWG9YV, EWG16Y, DLH7PP bleiben abgelehnt.
- [ ] Großkreis-Abtastung: Frankfurt–Helsinki und Frankfurt–Istanbul treffen kein Default-Polygon; Frankfurt–Tokio und London–Seoul treffen „Russland“; Frankfurt–Dubai trifft Irak oder Iran; Vancouver–Tokio (Datumsgrenze) läuft fehlerfrei durch und trifft kein Polygon.
- [ ] `closedAirspaces: []` in der Config schaltet die Erkennung ab (KAL908 dann abgelehnt); ein Polygon mit weniger als 3 Ecken oder lat/lon außerhalb des Bereichs wird von zod abgelehnt.
- [ ] Defaults `detourHeadingDeviationDeg` 90 und `closedAirspaceSampleKm` 100 validiert und in `config.example.yaml`, README und BC-README dokumentiert; `npm run typecheck`, `npm test`, Playwright chromium grün; keine FlightAware-Aufrufe im Live-Code; keine Routendaten von hexdb/adsbdb persistiert.

## Notes
Captured via `modeling` on 2026-10-27 (Entscheidung des Betreibers liegt vor, direkt promoted). Prüfung „Erdkrümmung“: der Korridor rechnet bereits sphärisch (Großkreis + cross-track in `geo.ts`), die 601 km bei KAL908 sind der echte Abstand zum Großkreis. Die Polygonliste ist eine Konfiguration mit Datum und Quelle, keine Live-NOTAM-Anbindung (keine freie, lizenzrechtlich saubere API bekannt; ADR 0001 verbietet kostenpflichtige Quellen). Die Polygone werden vom Betreiber bei Lageänderung von Hand gepflegt.
