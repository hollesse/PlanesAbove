---
id: airspace-f4q9z
title: FlightAware AeroAPI als budgetierte Notfall-Routenquelle (Opt-in, letzte Stufe, hartes Monatslimit, Usage-Sync beim Start und alle 30 Minuten)
status: backlog
type: feature
context: airspace
created: 2026-10-27
completed:
depends_on: [airspace-r5n3k, sighting-log-m7p2v]
blocks: []
tags: [routes, flightaware, budget, live-test]
related_adrs: [0001, 0005, 0016]
related_research: [route-coverage-sources-2026-10-27]
prior_art: [airspace-r5n3k]
---

## Why
Die kostenlosen Callsign-Datenbanken (adsbdb, hexdb, VRS) kennen bei umgewidmeten Flugnummern und Charterflügen die Route nicht oder falsch (Research route-coverage-sources-2026-10-27: LHX1HL, TKJ9GC, LAV8091). Nur ein Tracking-Dienst mit Flugplan kennt den konkreten Flug. FlightAware AeroAPI Personal bietet bis zu 5 $ Guthaben im Monat (0,005 $ je Ergebnissatz, also rund 1000 Abfragen), erlaubt Speichern "for personal or academic purposes", verlangt aber Account und Kreditkarte. Das ist eine bewusste Abweichung von ADR 0001 (nur kostenlose, vertragsfreie Quellen) und wird in einem eigenen ADR festgehalten.

## What
- Neuer `RouteSource`-Adapter `flightaware`: `GET https://aeroapi.flightaware.com/aeroapi/flights/{ident}?ident_type=designator&max_pages=1&start=<jetzt-1d>&end=<jetzt+1d>` (OpenAPI: ohne Zeitfenster kommen ca. 14 Tage Flüge zurück; mit Fenster und `max_pages=1` genau eine Seite = ein Ergebnissatz). Header `x-apikey` **nur aus der Umgebungsvariable** `FLIGHTAWARE_API_KEY` (nie in `config.yaml`, nie geloggt, ADR 0007 Secrets-Regel). Aus `flights[]` den laufenden Flug wählen (`actual_off` gesetzt, `actual_on` null, sonst höchster `progress_percent`); Felder `origin`/`destination` mit `code_icao`, `name`, `city`; `position_only: true` ("does not have a flight plan, schedule, or other indication of intent") = unknown; 401/403 = unavailable und Adapter dauerhaft gesperrt bis Neustart; 429/5xx/Timeout = unavailable.
- **Nur als letzte Stufe und nur gefiltert:** gefragt wird ausschließlich, wenn alle freien Quellen `unknown`, `unavailable` oder `rejected` geliefert haben **und** die Typklasse narrowbody oder größer ist (narrowbody, widebody, jumbo-hump, double-decker) **und** die Airline über die Airline-Tabelle bekannt ist. Privatflieger, Hubschrauber, Business-Jets und unbekannte Präfixe werden nie abgefragt.
- **Hartes Budget je Abrechnungszeitraum:** Config `sources.route.flightaware.monthlyBudgetUsd` (Default 4.50) und/oder `monthlyRequestCap` (Default 900). Lokaler Zähler persistiert in SQLite (eigene Tabelle, Zählerstände sind keine Lizenzdaten) mit Periodenmarke. Vor jeder bezahlten Abfrage: lokaler Zähler plus 1 muss unter dem Limit liegen, sonst keine Abfrage (Route unbekannt, Warn-Log einmal pro Periode).
- **Usage-Sync:** `GET /account/usage?start=<Periodenbeginn>&end=<jetzt>` (0 $) **beim Anwendungsstart** (vor der ersten bezahlten Abfrage; schlägt der Sync fehl, bleibt der Adapter gesperrt) **und mindestens alle 30 Minuten** (`usageSyncMinutes`, Default 30, max 30). Laut OpenAPI-Spezifikation (https://static.flightaware.com/rsrc/aeroapi/aeroapi-openapi.yml) liefert die Antwort **nur Summen für das angefragte Zeitfenster**: `total_calls`, `total_pages`, `total_cost`, `total_discount_cost`, `total_successful_calls`, `total_failed_calls`, `resource_details[]` — **keine** Periode, **keine** Obergrenze, **kein** Overage-Schalter (die Felder `plan_cap`/`period_end` aus Fremd-Clients existieren nicht). "Data per account is updated every 10 minutes." Konsequenz: Der Abrechnungszeitraum ist Config, `billingPeriodStartDay` (Default 1; nach Anmeldung gegen das Portal prüfen); `start` = Beginn der laufenden Periode. Bei Abweichung zwischen `total_cost` und eigener Rechnung gilt der höhere Wert; der lokale Zähler bleibt wegen der 10-Minuten-Verzögerung die primäre Bremse.
- **Persistenz:** FlightAware-Routen dürfen laut Personal-Lizenz gespeichert werden: `sightings.route` mit Text und `route_source = 'flightaware'`; `route_lookups` wie bei anderen Quellen. Positiver TTL-Cache im Speicher wie heute.
- Config `sources.route.order` akzeptiert `flightaware`; Default bleibt ohne FlightAware (Opt-in). README-Abschnitt (Account, Key als Env, Budget, Lizenz, Abweichung von ADR 0001).
- **ADR (neu):** budgetierte, optionale kostenpflichtige Quelle als Ausnahme zu ADR 0001; Filterregeln; Budgetmechanik; Lizenz.

## Acceptance criteria
- [ ] Contract-Tests mit aufgezeichneten Fixtures (nach freigegebenem Live-Test: ein Treffer, ein "position only" ohne Ziel) und konstruierten Fällen (401, 403, 429, 5xx, Timeout, kaputtes JSON); alle offline mit injiziertem fetch, globales fetch im Test gesperrt.
- [ ] Kettentest: FlightAware wird nur gefragt, wenn alle vorherigen Quellen unknown/unavailable/rejected lieferten; bei Treffer einer freien Quelle 0 FlightAware-Aufrufe.
- [ ] Filtertest: light-aircraft, glider, helicopter, business-jet, turboprop, regional-jet sowie unbekannte Airline-Präfixe erzeugen 0 Aufrufe; narrowbody mit bekannter Airline erzeugt 1 Aufruf.
- [ ] Budgettest (FakeClock, Fake-Usage-Endpunkt): bei Erreichen von `monthlyRequestCap` bzw. Budget 0 weitere Aufrufe bis `period_end`; danach Reset; Warn-Log genau einmal pro Periode.
- [ ] Sync-Test: ohne erfolgreichen Usage-Sync beim Start 0 bezahlte Aufrufe; Sync erfolgt beim Start und erneut nach `usageSyncMinutes` (Default 30; Werte > 30 werden von der Config abgelehnt); liefert `total_cost` mehr als der lokale Zähler, übernimmt der Adapter den höheren Wert.
- [ ] Secret-Test: Key kommt nur aus `FLIGHTAWARE_API_KEY`; fehlt er, ist der Adapter deaktiviert mit einer Warnung beim Start; der Key erscheint in keiner Log-Zeile und nicht in `/api/state` oder `/healthz`.
- [ ] Persistenztest: FlightAware-Treffer landen mit Text und `route_source = 'flightaware'` in `sightings`, Befunde in `route_lookups`.
- [ ] Config: `sources.route.order` akzeptiert `flightaware`; Default-Reihenfolge enthält es nicht; `monthlyBudgetUsd`/`monthlyRequestCap`/`usageSyncMinutes` validiert.
- [ ] README-Abschnitt und ADR vorhanden; `npm run typecheck` und `npm test` grün.

## Notes
- Betreiber-Regel: Der API-Key wird aus einer Claude-Session nie ohne Absprache benutzt; vor jedem Live-Aufruf wird die Anzahl der Requests genannt und freigegeben. Worker bekommen den Key nicht; Fixtures entstehen nur aus vom Betreiber freigegebenen Aufrufen (geplant: 1 Usage-Call, 3 Flights-Calls für LHX1HL, TKJ9GC, LAV8091, ca. 2 Cent).
- Offene Punkte, die erst mit Account klärbar sind: tatsächlicher Abrechnungszeitraum (Kalendermonat oder Anmeldetag) für `billingPeriodStartDay`, ob das Portal eine Ausgabengrenze bietet, ob Charter-Callsigns mit Flugplan ein Ziel liefern. OpenAPI-Spezifikation (öffentlich, vom Betreiber geliefert): https://static.flightaware.com/rsrc/aeroapi/aeroapi-openapi.yml
- Abhängig von sighting-log-m7p2v (route_lookups) und airspace-r5n3k (Quellenkette). Research: route-coverage-sources-2026-10-27.
- **Live-Test 2026-10-27 (4 freigegebene Aufrufe, Fixtures unter `tests/fixtures/flightaware/`):** alle drei Problemfälle korrekt aufgelöst. FlightAware mappt das ATC-Rufzeichen auf die kommerzielle Flugnummer: LHX1HL → LHX1979 Köln–München, TKJ9GC → TKJ26 Düsseldorf–Istanbul (SAW), LAV8091 → Düsseldorf–Belgrad. Der Rückflug LAV8091 Belgrad→? kam mit `position_only: true` und `destination: null` zurück — das ist der "kein Flugplan"-Fall für die Tests. Antwort enthält mehrere Flüge je Callsign (Vortag, Rückleg): der laufende ist der mit `actual_off` gesetzt und `actual_on` null; bei mehreren abgeschlossenen der jüngste `actual_off`. `/account/usage` lieferte nach den Aufrufen noch Nullen (10-Minuten-Verzögerung bestätigt). Fehlgeschlagene 401-Aufrufe (leerer Key, Bedienfehler) sind laut Preismodell keine Ergebnissätze.
