---
id: airspace-w3k8d
title: hexdb.io als Routenquelle, vorerst an erster Stelle vor adsbdb und VRS; Konfliktregel: erste plausible Route gewinnt
status: todo
type: feature
context: airspace
created: 2026-10-27
completed:
depends_on: [airspace-r5n3k]
blocks: []
tags: [routes, hexdb, live-test]
related_adrs: [0005, 0014, 0016, 0018]
related_research: []
prior_art: [airspace-r5n3k, airspace-m3w9c, airspace-p8w2k, sighting-log-m7p2v]
---

## Why
Messung am 2026-10-27 über 78 angezeigte Flüge (Oberweyer): adsbdb und hexdb.io liefern in 27 Fällen dieselbe Route, in 10 Fällen nur adsbdb eine plausible, in 12 Fällen nur hexdb eine plausible, in 12 Fällen beide eine plausible, aber unterschiedliche, in 17 Fällen keiner. hexdb schließt damit etwa jede fünfte Lücke (z. B. LHX1HL Köln–München, EZY25XL Belfast–Hurghada), die adsbdb und VRS nicht oder falsch kennen.

## What
- Neuer `RouteSource`-Adapter `HexdbRouteSource` (`adapters/hexdb-route-source.ts`): `GET https://hexdb.io/api/v2/routes/{callsign}` (Felder `origin`, `destination`, `airports[]`, `updated_at`; 404 mit `route_not_found` = unbekannt). Fehlerfälle (5xx, Timeout, Parse, 429) = `unavailable` (Exception, wie adsbdb), Backoff nach 429 wie bei adsbdb (`backoffMinutes`), Timeout konfigurierbar, polite User-Agent (bestehender HTTP-Helfer). Mehrleg-Routen aus `airports[]` wie bei adsbdb als Legs.
- Reihenfolge: `sources.route.order` Enum um `hexdb` erweitern; **Default `[hexdb, adsbdb, vrs]`** (Entscheidung 2026-10-27: zum Winterflugplan-Wechsel am 25.10. hatte hexdb den aktuelleren Stand — JAF76C Marsa Alam–Brüssel, LHX1HL Köln–München —, adsbdb/VRS noch den Sommerstand). Die Reihenfolge bleibt reine Konfiguration; FlightAware bleibt `lastResort` hinter allen.
- **Konfliktregel: (a) erste plausible Route in der Kette gewinnt.** Das ist die bestehende Kettensemantik von `RouteService.lookupFor` (Plausibilitätsprüfung aus airspace-p8w2k als Schiedsrichter, spätere Quellen werden nur bei unknown/rejected/unavailable gefragt); keine neue Logik. `compareAll` bleibt reine Statistikoption (Konflikt-Flag in `route_lookups`, sighting-log-m7p2v) und bekommt hexdb automatisch mit.
- Lizenz: hexdb nennt keine Lizenz (Daten u. a. Jim Mason, wie adsbdb). Deshalb wie adsbdb behandeln: nur Speicher-Cache, nie Routentext in SQLite. `RouteInfo.source` erhält den Wert `'hexdb'`; `repository.ts` lässt Routentext weiterhin nur für `'vrs'`/`'flightaware'` durch (hexdb landet wie adsbdb mit `route = NULL`, `route_source = 'hexdb'`); die Überschreibregel (Online-Befund darf durch vrs/flightaware ersetzt werden) gilt für hexdb wie für adsbdb. `route-stats.ts` zählt `hexdb` als eigene Spalte; `stats:routes` zeigt sie.
- Contract-Tests offline mit aufgezeichneten Fixtures (`tests/fixtures/hexdb/`: LHX1HL EDDK-EDDM, DLH400, ein 404 `route_not_found`) und konstruierten Fehlerfällen; Chain-Test: hexdb unknown → adsbdb hit; hexdb rejected (unplausibel) → adsbdb hit; hexdb unavailable → adsbdb gefragt, kein Negativ-Cache.
- Doku: `config.example.yaml`, README (Routenquellen-Abschnitt, Lizenzhinweis hexdb = wie adsbdb), BC-README-Delta; ADR 0016 per Amendment (hexdb vor adsbdb, Grund Saisonwechsel, Reihenfolge Config) — kein neues ADR.

## Acceptance criteria
- [ ] `HexdbRouteSource` liefert für die Fixture LHX1HL die Route EDDK–EDDM und für DLH400 die erwartete Route; ein 404 `route_not_found` ergibt `null` (unknown); 5xx/Timeout/Parse-Fehler werfen (unavailable); nach 429 wird hexdb für `backoffMinutes` nicht gefragt. Alles offline über injizierten fetch.
- [ ] `sources.route.order` akzeptiert `hexdb`; Default ist `[hexdb, adsbdb, vrs]`; `sources.route.hexdb.{timeoutMs, backoffMinutes}` mit Defaults wie adsbdb validiert.
- [ ] Kettentests: hexdb unknown → adsbdb hit (chosen adsbdb); hexdb hit plausibel → adsbdb nicht gefragt (ohne compareAll); hexdb hit unplausibel (rejected) → adsbdb gefragt; hexdb unavailable → adsbdb gefragt und kein Negativ-Cache; `attempts` enthält den hexdb-Befund jeweils korrekt.
- [ ] Persistenz: eine Sichtung mit hexdb-Route schreibt `route_source = 'hexdb'` und `route = NULL`; `route_lookups` enthält nur den Befund; kein Routentext oder Flughafencode von hexdb in der DB (Test sucht die Fixture-Codes in allen Spalten). Ein späterer vrs-/flightaware-Treffer darf den hexdb-Befund ersetzen.
- [ ] `npm run stats:routes` weist hexdb als eigene Quelle aus (Tabelle und `--json`).
- [ ] README, config.example.yaml und BC-README nennen hexdb mit Reihenfolge und Lizenzbehandlung; ADR 0016 trägt ein Amendment mit der neuen Default-Reihenfolge und dem Grund.
- [ ] `npm run typecheck`, `npm test` und Playwright chromium grün; Live-Code enthält keine Aufrufe an FlightAware.

## Notes
Captured via `modeling` on 2026-10-27; refined 2026-10-27 (Entscheidungen des Betreibers: hexdb an erster Stelle, Konfliktregel „erste plausible Route gewinnt“, keine Altersgewichtung). Flightradar-Wahrheit für die 12 Konfliktfälle fehlt; Beispiele: KLM47X adsbdb EHAM-LSZH vs hexdb EHAM-EDDM, DLH1EK adsbdb EGBB-EDDF vs hexdb EDDF-EDDL, DLH9MU adsbdb EDDF-ENGM vs hexdb EDDL-EDDM. Charter-/Privatflüge (PGT, LAV, TKJ, Kennzeichen-Callsigns) bleiben in allen freien Quellen unbekannt; dafür käme nur ein Tracking-Dienst (FlightAware AeroAPI, kostenpflichtig, ADR-0001-Abweichung) in Frage.
