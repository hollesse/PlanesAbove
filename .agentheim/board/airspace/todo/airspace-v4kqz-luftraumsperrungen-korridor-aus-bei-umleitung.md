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

**Default-Polygone (grob, Ecken als [lat, lon]; Quelle: EASA-Liste aktiver CZIBs, abgerufen 2026-10-27, plus safeairspace.net; Validierung siehe Notes):**
```yaml
closedAirspaces:
  - name: Russland
    since: 2022-02-28
    note: EU/UK/CA/US-Carrier gesperrt (gegenseitig); EASA CZIB 2025-01 R3 (westlich 60° E meiden); Korean Air und JAL meiden freiwillig. Kaliningrad bewusst nicht enthalten.
    polygon: [[69.5, 28.5], [82, 60], [82, 180], [64, 180], [43, 135], [50, 120], [50, 87], [42, 48], [46, 38], [52, 31], [56, 28], [60, 28]]
  - name: Belarus
    since: 2021-06-04
    note: EU-Überflugverbot seit Ryanair-Zwangslandung 2021, verschärft 2022.
    polygon: [[56, 23], [56, 32], [51.3, 31], [51.5, 24], [52.5, 23]]
  - name: Ukraine
    since: 2022-02-24
    note: Luftraum vollständig geschlossen.
    polygon: [[52.3, 24], [52, 34], [50, 40], [47, 39], [45, 33], [44, 33], [45.5, 29], [48, 22], [50, 22.5]]
  - name: Iran
    since: 2026-02-28
    note: EASA CZIB 2026-04-R2 (alle Höhen meiden, gültig bis 2026-11-16); FAA-Verbot für US-Carrier.
    polygon: [[39.5, 44.5], [38, 48.5], [37, 54], [37, 61], [25, 61], [25, 56], [30, 48], [33, 45]]
  - name: Irak
    since: 2026-02-28
    note: EASA CZIB 2026-05-R2 (alle Höhen meiden, bis 2026-11-16); europäische Carrier umfliegen.
    polygon: [[37.3, 42], [36.5, 45], [30, 48], [29, 44], [33, 38.8]]
  - name: Libanon
    since: 2026-02-28
    note: EASA CZIB 2026-06-R2 (bis 2026-11-16).
    polygon: [[34.7, 35.9], [34.6, 36.6], [33.1, 35.9], [33.1, 35.1]]
  - name: Jordanien
    since: 2026-02-28
    note: EASA CZIB 2026-08-R3; situativ (Nahost-Eskalation 2026).
    polygon: [[33.4, 35.6], [33.4, 39.3], [29.2, 36.5], [29.2, 34.9], [32.5, 35.5]]
  - name: Persischer Golf und Golf von Oman
    since: 2026-02-28
    note: EASA CZIB 2026-07-R3; situativ. Nur die Gewässer, nicht VAE/Katar/Oman an Land.
    polygon: [[30, 48.5], [27, 51], [26.5, 56.5], [25, 60], [23.5, 59], [25, 56], [26, 53.5], [28.5, 49.5]]
  - name: Syrien
    since: 2012-01-01
    note: EASA: westlicher Teil der FIR Damaskus meiden, sonst unter FL260 verboten; einige Nahost-Airlines nutzen den Luftraum wieder, europäische Carrier meiden ihn.
    polygon: [[37.3, 36], [37.3, 42], [32.5, 38.8], [33, 35.6]]
  - name: Sudan
    since: 2023-04-15
    note: EASA: alle Höhen meiden; safeairspace Level 1.
    polygon: [[22, 25], [22, 37], [9, 34], [9, 25]]
  - name: Jemen
    since: 2015-03-26
    note: Fast gesamter Luftraum meiden; nur Küstenrouten (UT702/M999) in Nutzung.
    polygon: [[19, 42], [16.5, 52.5], [12.5, 54], [12.5, 43]]
  - name: Nordkorea
    since: 1997-01-01
    note: Keine Überflüge westlicher Airlines.
    polygon: [[43, 124], [43, 131], [38, 130], [38, 124]]
```
Bewusst **nicht** enthalten (Stand 2026-10-27): Libyen und Afghanistan (EASA meidet nur unterhalb FL320, Überflüge im Reiseflug finden statt), Israel, Myanmar, Äthiopien, Niger, DR Kongo (nur EASA Information Notes, Überflüge laufen). Das Routen-Lockern soll nur greifen, wo Reiseflug-Überflüge tatsächlich ausbleiben.
Die Koordinaten sind absichtlich grob (Landesgrenzen auf 1–2° gerundet); es geht um „schneidet der Großkreis dieses Land“, nicht um Metergenauigkeit. Der Worker darf die Ecken korrigieren, wenn ein Polygon ein Nachbarland deutlich mit abdeckt (Test: Großkreis Frankfurt–Helsinki und Frankfurt–Istanbul dürfen **kein** Polygon treffen; Frankfurt–Dubai darf Irak/Iran/Golf treffen, das ist korrekt).

**Statistik.** `route_lookups` bleibt unverändert; ein Debug-Logeintrag `route plausibility` mit `detoured: true` und dem getroffenen Polygon-Namen reicht (kein Persistieren).

## Acceptance criteria
- [ ] KAL908-Fall (London Heathrow 51.4775/−0.4614 → Seoul Incheon 37.4633/126.44; Position 50.2124/9.5366, Kurs 104, 10 058 m, Vertikalrate 0) ist plausibel; der Großkreis trifft das Polygon „Russland“.
- [ ] Derselbe Fall mit Kurs 230 (Abweichung > 90°) ist abgelehnt; derselbe Fall in 3000 m im Steigflug 8 m/s 60 km von Frankfurt entfernt ist abgelehnt (Höhenprofil/Phase bleiben aktiv).
- [ ] Ohne Sperrung keine Änderung: Frankfurt–Helsinki und Köln–Wien mit 160 km Querabstand bleiben abgelehnt; LHX1979, AUA166D, DLH400, CTN4456, LZB407, KLC24J bleiben plausibel; EWG9YV, EWG16Y, DLH7PP bleiben abgelehnt.
- [ ] Großkreis-Abtastung: Frankfurt–Helsinki und Frankfurt–Istanbul treffen kein Default-Polygon; Frankfurt–Tokio und London–Seoul treffen „Russland“; Frankfurt–Dubai trifft Irak, Iran oder Persischer Golf; Vancouver–Tokio (Datumsgrenze) läuft fehlerfrei durch und trifft kein Polygon.
- [ ] `closedAirspaces: []` in der Config schaltet die Erkennung ab (KAL908 dann abgelehnt); ein Polygon mit weniger als 3 Ecken oder lat/lon außerhalb des Bereichs wird von zod abgelehnt.
- [ ] Defaults `detourHeadingDeviationDeg` 90 und `closedAirspaceSampleKm` 100 validiert und in `config.example.yaml`, README und BC-README dokumentiert; `npm run typecheck`, `npm test`, Playwright chromium grün; keine FlightAware-Aufrufe im Live-Code; keine Routendaten von hexdb/adsbdb persistiert.

## Notes
Captured via `modeling` on 2026-10-27 (Entscheidung des Betreibers liegt vor, direkt promoted). Prüfung „Erdkrümmung“: der Korridor rechnet bereits sphärisch (Großkreis + cross-track in `geo.ts`), die 601 km bei KAL908 sind der echte Abstand zum Großkreis. Die Polygonliste ist eine Konfiguration mit Datum und Quelle, keine Live-NOTAM-Anbindung (keine freie, lizenzrechtlich saubere API bekannt; ADR 0001 verbietet kostenpflichtige Quellen). Die Polygone werden vom Betreiber bei Lageänderung von Hand gepflegt.

**Validierung der Sperrliste (Kurzrecherche 2026-10-27).** EASA führt aktuell als CZIB: Russland (2025-01 R3), Iran (2026-04-R2), Irak (2026-05-R2), Libanon (2026-06-R2), Persischer Golf/Golf von Oman (2026-07-R3), Jordanien (2026-08-R3), Saudi-Arabien Jeddah FIR (2026-09-R1, nur zwei Teilgebiete, daher nicht als Polygon), Syrien (Teil der FIR), Sudan, Jemen, Libyen und Afghanistan (letztere beiden nur unterhalb FL320). Ukraine und Belarus sind vollständig bzw. per EU-Verbot geschlossen. Die Nahost-Bulletins laufen bis 2026-11-16 und werden regelmäßig verlängert; die Liste ist bei Ablauf vom Betreiber zu prüfen. Quellen: https://www.easa.europa.eu/en/conflict-zone-status/active , https://safeairspace.net/summary/ , https://www.easa.europa.eu/en/domains/air-operations/czibs
