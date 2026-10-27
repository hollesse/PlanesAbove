---
id: airspace-r5n3k
title: adsbdb als erste Routenquelle vor VRS (nie persistiert, 429-Backoff) und Negativ-Cache-Fix bei nicht verfuegbaren Quellen
status: todo
type: feature
context: airspace
created: 2026-10-27
depends_on: [airspace-m3w9c]
blocks: []
tags: [routes, adsbdb, live-test]
related_adrs: [0005, 0014, 0016]
related_research: [free-flight-weather-tts-apis-2026-10-26]
prior_art: [airspace-m3w9c]
---

## Why
Live-Test 2026-10-27 in Oberweyer, 50 Callsigns: nur 16 Routen angezeigt. 15 Callsigns fehlen im VRS-Snapshot, 9 stehen im VRS, aber veraltet/falsch (Callsign neu vergeben, z. B. QTR56H: VRS sagt Doha-Dubai, real Doha-London) und wurden vom Korridor-Check korrekt verworfen, 10 plausible Routen gingen durch den Start-up-Negativ-Cache verloren. adsbdb loeste alle 9 falschen und einige fehlende korrekt auf. ADR 0016 macht adsbdb deshalb zur ersten Quelle (Live-Lookup, keyless), VRS bleibt Offline-Fallback. adsbdb-Daten duerfen laut Bedingungen nicht kopiert oder in andere Datenbanken uebernommen werden: sie leben nur im In-Memory-Cache und gelangen nie in SQLite.

## What
1. **Kette:** Default `sources.route.order = [adsbdb, vrs]`. adsbdb zuerst (`GET https://api.adsbdb.com/v0/callsign/{callsign}`, keyless, polite User-Agent aus der Config). Fallback auf VRS bei: unknown (HTTP 404, Body `{"response":"unknown callsign"}`), Netz-/5xx-/Timeout-/Parse-Fehler, HTTP 429, oder wenn die adsbdb-Route den Plausibilitaets-Korridor (`isPlausibleRoute`, ADR 0005 #3) nicht besteht. Jede Route jeder Quelle durchlaeuft `isPlausibleRoute`; verworfene VRS-Route = Route unbekannt.
2. **Antwort-Mapping:** `response.flightroute` mit `callsign_icao`, `airline{name,icao,...}`, `origin`/`destination{icao_code,iata_code,municipality,name,latitude,longitude,...}` auf den bestehenden Route-Wert abbilden. Fehlende Koordinaten = Parse-Fehler (unavailable, kein Treffer).
3. **429-Backoff:** adsbdb-Limit (Quelle `src/db/redis/ratelimit.rs`): 512 Requests/min pro IP, 1 min Sperre; >=1024 5 min Sperre. Unsere Last: <= 2 Lookups pro 30-s-Takt plus Cache. Bei 429 adsbdb fuer `sources.route.adsbdb.backoffMinutes` (Default 5) ueberspringen und VRS nutzen.
4. **Nicht-Persistenz:** adsbdb-Ergebnisse nur im In-Memory-`RouteService`-Cache (positive TTL Stunden wie heute). Der Route-Wert fuer sky-scene (Steckbrief, Info-Leiste) traegt seine Quelle (`vrs` | `adsbdb`); Anzeige unveraendert. In `src/server/modules/sighting-log/repository.ts` bleibt `route` nur fuer VRS-Routen; neue Migration (naechste Nummer) fuegt `route_source` (`vrs` | `adsbdb` | NULL) hinzu. adsbdb-Treffer: `route = NULL`, `route_source = 'adsbdb'`. Stats zaehlen "Route bekannt" ueber `route_source IS NOT NULL`. Bestehende Zeilen mit `route` werden in der Migration auf `route_source = 'vrs'` gesetzt (alle stammen aus VRS/routeset-Vorlauf). Das COALESCE beim UPDATE darf adsbdb-Text nie in `route` schreiben.
5. **Negativ-Cache-Fix:** Der `RouteSource`-Port unterscheidet `unknown` von `unavailable` (z. B. `{status:'hit'|'unknown'|'unavailable', route?}` oder `SourceError`, Wahl des Workers). Ein "unbekannt" wegen nicht verfuegbarer Quelle (kein Snapshot geladen, Netzfehler, 429) wird nicht negativ gecacht; nur ein echtes "in keiner Quelle eine Route" wird `negativeTtlMinutes` lang gecacht.
6. **Config:** `sources.route.order` (Enum `vrs|adsbdb` existiert), Default `[adsbdb, vrs]`; neu `sources.route.adsbdb.timeoutMs` (Default 5000) und `sources.route.adsbdb.backoffMinutes` (Default 5); `snapshotRefreshHours` bleibt. Validierung mit Tests.
7. **Observability:** `info`-Log einmal pro Callsign mit antwortender Quelle (`adsbdb`/`vrs`/`none`); `warn` bei 429/Backoff-Start. `/healthz` unveraendert.
8. **Doku:** README nennt adsbdb als Live-Routenquelle (keine Persistenz) neben VRS (Attribution).

## Acceptance criteria
1. Ohne Konfiguration ist `sources.route.order` gleich `['adsbdb','vrs']`; `['vrs']` und `['vrs','adsbdb']` bleiben gueltig, unbekannte Werte werden von der Config-Validierung abgelehnt (Test).
2. `sources.route.adsbdb.timeoutMs` ist Default 5000, `backoffMinutes` Default 5; Nicht-Zahlen, 0 und negative Werte werden abgelehnt (Test).
3. Der adsbdb-Adapter ruft `GET https://api.adsbdb.com/v0/callsign/{callsign}` mit konfiguriertem User-Agent ueber injiziertes `fetch` auf (Test prueft URL, Header, URL-Encoding des Callsigns).
4. Contract-Test mit aufgezeichneter Fixture vom 2026-10-27 fuer QTR56H (OTHH -> EGLL, Qatar Airways) liefert Treffer mit Origin OTHH und Destination EGLL; ebenso Fixture DLH400.
5. Konstruierte Fixtures: 404 `{"response":"unknown callsign"}` = `unknown`; 429, 5xx, Timeout, kaputtes JSON und fehlende Koordinaten = `unavailable` bzw. kein Treffer ohne Exception nach aussen (je ein Test).
6. Alle Adapter-Tests laufen offline (kein echter Netzzugriff; Test schlaegt fehl, wenn globales `fetch` benutzt wird).
7. Kettentest: adsbdb-Treffer gewinnt vor VRS; bei `unknown`, `unavailable`, 429 oder Korridor-Verwerfung der adsbdb-Route wird VRS befragt; VRS-Route ausserhalb des Korridors ergibt Route unbekannt (QTR56H-Regression: adsbdb OTHH-EGLL gewinnt vor VRS Doha-Dubai).
8. Nach HTTP 429 wird adsbdb fuer `backoffMinutes` nicht mehr aufgerufen (Test mit Fake-Clock: 0 Aufrufe im Fenster, wieder Aufrufe danach) und VRS beantwortet in der Zeit.
9. Negativ-Cache: Lookup bei nicht geladenem VRS-Snapshot (adsbdb unavailable) wird nicht gecacht; nach Laden des Snapshots liefert derselbe Callsign ohne TTL-Ablauf die Route (Test). Echtes "unknown" in allen Quellen wird `negativeTtlMinutes` lang gecacht (Test: zweiter Lookup ohne Quellenaufruf).
10. Positive adsbdb-Treffer werden fuer die positive TTL gecacht (zweiter Lookup ohne HTTP-Aufruf).
11. Neue nummerierte Migration legt `sightings.route_source` an und migriert bestehende Zeilen mit `route` auf `'vrs'`; Migrationstest auf einer DB mit Altdaten.
12. Sighting-Log-Test: Sichtung mit adsbdb-Route speichert `route IS NULL` und `route_source = 'adsbdb'`; mit VRS-Route `route` gesetzt und `route_source = 'vrs'`; ein UPDATE/COALESCE schreibt nie adsbdb-Text in `route`. Ein Test durchsucht die SQLite-Datei nach dem Text der adsbdb-Fixture (z. B. "Heathrow") und findet nichts.
13. Stats-Test: "Route bekannt" zaehlt VRS- und adsbdb-Sichtungen.
14. Log-Test: pro Callsign genau eine `info`-Zeile mit Quelle `adsbdb`/`vrs`/`none`; `warn` bei 429; `/healthz`-Antwort unveraendert; README erwaehnt adsbdb (keine Persistenz) und VRS.

## Notes
- Siehe ADR 0016 (aendert ADR 0014 "sole default"; ADR 0005 Port, Plausibilitaet und Lizenzhaltung bleiben).
- Vorbild: airspace-m3w9c (VrsRouteSource, Snapshot, Index). Der persistierte Online-Cache airspace-p2v6d bleibt fuer adsbdb ausdruecklich ausgeschlossen (Lizenz); er betrifft nur Quellen, die Persistenz erlauben.
- Fixtures: echte Antworten am 2026-10-27 aufzeichnen (QTR56H, DLH400); Fehlerfaelle konstruiert und als solche markiert (ADR 0013).
- Risiko: adsbdb ist ein Ein-Personen-Hobbydienst; der VRS-Fallback haelt die Szene stabil.
