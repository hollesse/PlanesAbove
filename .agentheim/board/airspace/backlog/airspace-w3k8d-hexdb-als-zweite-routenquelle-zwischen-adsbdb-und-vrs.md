---
id: airspace-w3k8d
title: hexdb.io als zweite Routenquelle zwischen adsbdb und VRS, mit Konfliktregel bei widersprüchlichen Online-Antworten
status: backlog
type: feature
context: airspace
created: 2026-10-27
completed:
depends_on: [airspace-r5n3k]
blocks: []
tags: [captured, routes, hexdb, live-test]
related_adrs: [0005, 0014, 0016]
related_research: []
prior_art: [airspace-r5n3k, airspace-m3w9c]
---

## Why
Messung am 2026-10-27 über 78 angezeigte Flüge (Oberweyer): adsbdb und hexdb.io liefern in 27 Fällen dieselbe Route, in 10 Fällen nur adsbdb eine plausible, in 12 Fällen nur hexdb eine plausible, in 12 Fällen beide eine plausible, aber unterschiedliche, in 17 Fällen keiner. hexdb schließt damit etwa jede fünfte Lücke (z. B. LHX1HL Köln–München, EZY25XL Belfast–Hurghada), die adsbdb und VRS nicht oder falsch kennen.

## What
- Neuer `RouteSource`-Adapter für hexdb.io: `GET https://hexdb.io/api/v2/routes/{callsign}` (Felder `origin`, `destination`, `airports[]`, `updated_at`; 404 `route_not_found` = unbekannt; Legacy v1: `/api/v1/route/icao/{callsign}` liefert `{flight, route: "EDDK-EDDM", updatetime}`). Kein API-Key, keine dokumentierten Limits, Cloudflare-Cache 4 h. Fehlerfälle (5xx, Timeout, Parse) = `unavailable`, polite User-Agent, Timeout konfigurierbar.
- Default-Kette `sources.route.order: [adsbdb, hexdb, vrs]`; `hexdb` als erlaubter Wert im Enum; Korridor-Check auf jeder Quelle wie bisher.
- Lizenz: hexdb nennt keine Lizenz, Datenquellen u. a. Jim Mason (wie adsbdb). Deshalb wie adsbdb behandeln: nur Speicher-Cache, nie in SQLite; `route_source` erhält den Wert `hexdb`, `route` bleibt NULL (Migration/Enum erweitern).
- Konfliktregel (Entscheidung beim Refinen): (a) erste Quelle in der Kette gewinnt, oder (b) liefern zwei Online-Quellen plausible, aber unterschiedliche Routen, gilt Route unbekannt, oder (c) frischerer Eintrag gewinnt (hexdb liefert `updated_at`, adsbdb nicht). Statistik dazu in sighting-log-m7p2v.
- Contract-Tests mit aufgezeichneten Fixtures (2026-10-27: LHX1HL EDDK-EDDM, DLH400) und konstruierten Fehlerfällen, offline.

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `modeling` on 2026-10-27 — raw, unrefined. Needs a refine pass (Konfliktregel) before it can be promoted. Flightradar-Wahrheit für die 12 Konfliktfälle fehlt; Beispiele: KLM47X adsbdb EHAM-LSZH vs hexdb EHAM-EDDM, DLH1EK adsbdb EGBB-EDDF vs hexdb EDDF-EDDL, DLH9MU adsbdb EDDF-ENGM vs hexdb EDDL-EDDM. Charter-/Privatflüge (PGT, LAV, TKJ, Kennzeichen-Callsigns) bleiben in allen freien Quellen unbekannt; dafür käme nur ein Tracking-Dienst (FlightAware AeroAPI, kostenpflichtig, ADR-0001-Abweichung) in Frage.
