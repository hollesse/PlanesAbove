# airspace — Index (task board)

Catalog of this bounded context's tasks by status.

> Updated by: `modeling` (tasks), the lifecycle verbs (promote / claim / complete / capture / dismiss / bounce / reroute).
> Hand-edits are fine but the verbs will append at the section markers below.

---

## Tasks by status

<!-- task-counts:start -->
- **Backlog:** 5
- **Todo:** 0
- **Doing:** 0
- **Done:** 9
<!-- task-counts:end -->

### Todo
<!-- todo-list:start -->
<!-- todo-list:end -->

### Doing
<!-- doing-list:start -->
<!-- doing-list:end -->

### Done (most recent first; older entries kept for prior-art search)
<!-- done-list:start -->
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
- **airspace-c5t9m** — airplanes.live aus der FlightSource-Kette entfernen (feeder-only, Betreiber will keinen Feeder betreiben) (chore) — `backlog/airspace-c5t9m-airplanes-live-adapter-entfernen.md`
- **airspace-p8w2k** — Plausibilitätsprüfung schärfen: Kurs und Flugphase gegen die Route prüfen, nur fern von Start- und Zielflughafen; engerer Korridor per Querabstand (feature) — `backlog/airspace-p8w2k-plausibilitaet-schaerfen-kurs-flugphase-querabstand.md`
- **airspace-n8c4t** — Unmapped Keys aus dem Live-Betrieb kuratieren: 26 Airline-Präfixe und 10 Typcodes in die Tabellen aufnehmen (chore) — `backlog/airspace-n8c4t-unmapped-keys-kuratieren-airlines-und-typcodes-aus-dem-live-betrieb.md`
- **airspace-w3k8d** — hexdb.io als zweite Routenquelle zwischen adsbdb und VRS, mit Konfliktregel bei widersprüchlichen Online-Antworten (feature) — `backlog/airspace-w3k8d-hexdb-als-zweite-routenquelle-zwischen-adsbdb-und-vrs.md`
- **airspace-p2v6d** — Persistierter Routen-Cache fuer Online-Quellen (feature) — `backlog/airspace-p2v6d-persistierter-routen-cache-fuer-online-quellen.md`
<!-- backlog-list:end -->

## Pointers

- Knowledge half (ADRs / research / concepts / BC README) for this BC: `../../knowledge/contexts/airspace/INDEX.md`
