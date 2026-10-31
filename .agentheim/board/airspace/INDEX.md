# airspace — Index (task board)

Catalog of this bounded context's tasks by status.

> Updated by: `modeling` (tasks), the lifecycle verbs (promote / claim / complete / capture / dismiss / bounce / reroute).
> Hand-edits are fine but the verbs will append at the section markers below.

---

## Tasks by status

<!-- task-counts:start -->
- **Backlog:** 2
- **Todo:** 1
- **Doing:** 0
- **Done:** 23
<!-- task-counts:end -->

### Todo
<!-- todo-list:start -->
- **airspace-tzw5t** — Korridor-Deckel (corridorMaxKm) aufweichen, wenn der Kurs zum Ziel passt und das Flugzeug weit vom Start ist (Querabstand klein gegen Strecke seit Start); TOM16Y Manchester–Heraklion wird plausibel, EWG16Y bleibt abgelehnt (feature) — `todo/airspace-tzw5t-korridor-deckel-aufweichen-bei-kursbestaetigung-und-weit-vom-start.md`
<!-- todo-list:end -->

### Doing
<!-- doing-list:start -->
<!-- doing-list:end -->

### Done (most recent first; older entries kept for prior-art search)
<!-- done-list:start -->
- **airspace-vcytm** — Schärfere Fotos im Overlay — Commons-Vorschau mit 1600 px anfordern und Default-Kette auf [commons, airport-data, planespotters] drehen (feature) — `done/airspace-vcytm-schaerfere-fotos-commons-1600px-und-kette-commons-zuerst.md`
- **airspace-gw6w9** — Fotoquelle (PhotoSource): echte Fotos eines konkreten Flugzeugs per Kennzeichen/Hex aus mehreren kostenlosen Plattformen, mit Attribution, als Galerie (feature) — `done/airspace-gw6w9-fotoquelle-echte-fotos-eines-flugzeugs-per-kennzeichen-hex.md`
- **airspace-t4x9k** — Flugzeugtyp je Hex bei hexdb gegenprüfen (nur im Speicher gecacht) und eine eigene Korrekturtabelle Hex → Typ als Vorrang, damit falsche Typcodes der Flugquelle (OE-FML DA42 als C525) nicht als falsche Silhouette erscheinen (feature) — `done/airspace-t4x9k-flugzeugtyp-per-hexdb-gegenpruefen-und-eigene-korrekturtabelle.md`
- **airspace-cn6t7** — Routenanzeige bei langen Flughafennamen: ganze Route bleibt sichtbar; Playwright-Test mit den zwei längsten Namen (bug) — `done/airspace-cn6t7-routenanzeige-bei-langen-flughafennamen-ganze-route-sichtbar.md`
- **airspace-w1q3x** — hexdb und VRS immer beide fragen; eine VRS-Mehrleg-Route, deren Endstück zur hexdb-Route passt, gewinnt (Startflughafen bei Zwischenlandungen) (feature) — `done/airspace-w1q3x-hexdb-und-vrs-immer-beide-fragen-mehrleg-route-bevorzugen.md`
- **airspace-b7kx2** — Eigene Flughafenliste, damit Routen unabhängig vom Anbieter gleich aussehen (feature) — `done/airspace-b7kx2-eigene-flughafenliste-einheitliche-routen-namen.md`
- **airspace-v4kqz** — Gesperrte Lufträume in der Plausibilitätsprüfung: schneidet der Großkreis einen gesperrten Luftraum, entfällt die Korridorprüfung und die erlaubte Kursabweichung steigt (Befund KAL908 London–Seoul) (bug) — `done/airspace-v4kqz-luftraumsperrungen-korridor-aus-bei-umleitung.md`
- **airspace-f9cjz** — Airline-Lackierungszuordnung für alle Katalog-Lackierungen vervollständigen (Emirates, Qatar, United, Jet2, KLM Cityhopper …) und Lackierungen standardmäßig einschalten (bug) — `done/airspace-f9cjz-lackierungszuordnung-vervollstaendigen-und-lackierungen-einschalten.md`
- **airspace-hw8f9** — Flugphasen-Prüfung nur unterhalb der Reiseflughöhe, ab 5 m/s und erst 400 km vom Flughafen; Steigprofil nahe dem Abflughafen lockern (Abflugrouten sind länger als die Luftlinie) (bug) — `done/airspace-hw8f9-flugphasen-pruefung-nur-unterhalb-der-reiseflughoehe.md`
- **airspace-prwpv** — Abgelehnte Routen je Takt gegen die aktuelle Position neu prüfen statt 10 Minuten negativ zu cachen; Korridor auf 50 km + 8 % lockern (bug) — `done/airspace-prwpv-abgelehnte-routen-je-takt-neu-pruefen-korridor-lockern.md`
- **airspace-n8c4t** — Unmapped Keys aus dem Live-Betrieb kuratieren: 30 Airline-Präfixe und 13 Typcodes in die Tabellen aufnehmen, ZZZZ als "kein Typcode" behandeln (chore) — `done/airspace-n8c4t-unmapped-keys-kuratieren-airlines-und-typcodes-aus-dem-live-betrieb.md`
- **airspace-w3k8d** — hexdb.io als Routenquelle, vorerst an erster Stelle vor adsbdb und VRS; Konfliktregel: erste plausible Route gewinnt (feature) — `done/airspace-w3k8d-hexdb-als-zweite-routenquelle-zwischen-adsbdb-und-vrs.md`
- **airspace-p8w2k** — Plausibilitätsprüfung schärfen: Kurs und Flugphase gegen die Route prüfen, nur fern von Start- und Zielflughafen; engerer Korridor per Querabstand (feature) — `done/airspace-p8w2k-plausibilitaet-schaerfen-kurs-flugphase-querabstand.md`
- **airspace-c5t9m** — airplanes.live aus der FlightSource-Kette entfernen (feeder-only, Betreiber will keinen Feeder betreiben) (chore) — `done/airspace-c5t9m-airplanes-live-adapter-entfernen.md`
- **airspace-b9r4w** — adsb.lol als dritte Flugquelle mit persistiertem Tagesbudget (400 von 500 Requests) und Auswertung der Rate-Limit-Header (feature) — `done/airspace-b9r4w-adsb-lol-als-dritte-flugquelle-mit-tagesbudget.md`
- **airspace-v6m3h** — airplanes.live als zweite Flugquelle in der FlightSource-Kette (feature) — `done/airspace-v6m3h-airplanes-live-als-zweite-flugquelle.md`
- **airspace-k2d7f** — adsb.fi als primäre Flugquelle; FlightSource-Kette mit Failover, Backoff nach Rate-Limit-Headern und Circuit Breaker (feature) — `done/airspace-k2d7f-adsb-fi-als-primaere-flugquelle-mit-failover-kette-und-backoff.md`
- **airspace-f4q9z** — FlightAware AeroAPI als budgetierte Notfall-Routenquelle (Opt-in, letzte Stufe, hartes Monatslimit, Usage-Sync) (feature) — `done/airspace-f4q9z-flightaware-aeroapi-als-budgetierte-notfall-routenquelle.md`
- **airspace-r5n3k** — adsbdb als erste Routenquelle vor VRS (nie persistiert, 429-Backoff) und Negativ-Cache-Fix bei nicht verfuegbaren Quellen (feature) — `done/airspace-r5n3k-adsbdb-als-erste-routenquelle-vor-vrs-mit-nicht-persistenz-und-negativ-cache-fix.md`
- **airspace-m3w9c** — VRS standing-data (CC0) als einzige Standard-RouteSource mit Offline-Snapshot, routeset entfernen (feature) — `done/airspace-m3w9c-vrs-standing-data-cc0-als-bevorzugte-routesource-mit-offline.md`
- **airspace-f7k2m** — Unbekannte Typcodes und B-Emitterkategorien als light-aircraft statt narrowbody darstellen, Typtabelle ergänzen (Ikarus C42 D-MMDP) (bug) — `done/airspace-f7k2m-ultraleicht-und-unbekannte-typcodes-werden-als-narrowbody-gezeichnet.md`
- **airspace-h76v2** — Decide Typklasse, Kategorie and airline derivation from static curated tables (decision) — `done/airspace-h76v2-type-class-and-airline-tables.md`
- **airspace-jy8hz** — Decide free ADS-B position and route sources behind a replaceable port (adsb.lol / airplanes.live / adsbdb) (decision) — `done/airspace-jy8hz-flight-and-route-sources.md`
<!-- done-list:end -->

### Backlog
<!-- backlog-list:start -->
- **airspace-rrazj** — Lokale Vereinsflieger per Hex-Code erfassen und den Verein statt der Airline anzeigen (feature) — `backlog/airspace-rrazj-vereinsflieger-tabelle-verein-statt-airline-anzeigen.md`
- **airspace-fehby** — Keine Route für Kleinflugzeuge, deren Callsign die Registrierung ist (D-Exxx u. ä.) (feature) — `backlog/airspace-fehby-keine-route-fuer-kleinflugzeuge-mit-registrierung-als-callsign.md`
<!-- backlog-list:end -->

## Pointers

- Knowledge half (ADRs / research / concepts / BC README) for this BC: `../../knowledge/contexts/airspace/INDEX.md`
