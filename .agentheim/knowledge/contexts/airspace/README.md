# Luftraum (airspace)

## Purpose
Weiß, welche Flugzeuge im Umkreis um das Haus sind: holt im Takt kostenlose Flugdaten, reichert sie an und bestimmt die Auswahl der zwei nächsten.

## Classification
core — die Auswahl-Regel und die Anreicherung (Route, Typklasse, Kategorie) bestimmen, ob das Display lebendig und richtig ist.

## Actors
- **Papa** — legt Standort und Radius fest.

## Ubiquitous language
- **Flugzeug** — ein aktuell beobachtetes Luftfahrzeug mit Position, Höhe, Geschwindigkeit, Kennzeichen, Flugnummer.
- **Umkreis / Radius** — Kreis um das Haus (Default ~30 km), in dem Flugzeuge zählen.
- **Takt** — Aktualisierung alle 30 Sekunden.
- **Auswahl** — die bis zu zwei nächsten Flugzeuge im Umkreis zu einem Takt.
- **Route** — Abflug → Ziel (Stadt + Land); kann **unbekannt** sein, das ist ein regulärer Zustand.
- **Typklasse** — eine der zehn gezeichneten Silhouetten (Ids wie im Design-System, ADR 0009), abgeleitet aus dem ICAO-Typcode über die Tabelle `type-classes`; ohne Treffer per Emitter-Kategorie-Fallback; ohne jede Information `light-aircraft` mit Kategorie `unbekannt` (nicht mehr narrowbody). Der ICAO-Platzhalter `ZZZZ` gilt als „kein Typcode“: Emitter-Kategorie-Fallback, `unmapped=false`, keine Meldung in `unmapped_keys`. Siehe ADR 0010, 0015.
- **Kategorie** — Kurz-/Mittel-/Langstrecke etc., für den Steckbrief; kuratierter Wert der Tabelle `type-classes` (nicht aus der Route berechnet), sonst *unbekannt*. Siehe ADR 0010.
- **Flugphase** — Steigflug, Sinkflug, Horizontalflug.
- **Flugquelle (FlightSource)** — Port, der pro Takt die Flugzeuge im Umkreis liefert. Adapter hinter einer Kette (`FlightSourceChain`, Config `sources.flight.order`, Default adsb.fi → adsb.lol): pro Takt wird die erste verfügbare Quelle gefragt, bei Fehler sofort die nächste; adsb.fi ist primär. OpenSky, airplanes.live (feeder-only) und Eigenempfänger sind bewusst nicht vorgesehen. Siehe ADR 0005, 0019.
- **Routenquelle (RouteSource)** — Port, der zu einem Rufzeichen eine Route oder den Wert *Route unbekannt* liefert und dabei *unbekannt* von *nicht verfuegbar* unterscheidet (kein Snapshot, Netzfehler, 429). Standardreihenfolge `[hexdb, adsbdb, vrs]` (Amendment zu ADR 0016, 2026-10-27; die Reihenfolge ist reine Konfiguration): hexdb und adsbdb als Live-Lookups (nie persistiert, 429-Backoff je Quelle), der offline VRS-standing-data-Snapshot als Fallback; jede Route jeder Quelle besteht die Plausibilitaetspruefung, und die erste plausible Route der Kette gewinnt (spaetere Quellen nur bei unknown/rejected/unavailable). Nur ein echtes *unbekannt* in allen Quellen wird negativ gecacht. Siehe ADR 0005, 0014, 0016. Optionale letzte Stufe `flightaware` (ADR 0018, kostenpflichtig, Opt-in, lastResort): nur bei Typklasse narrowbody/widebody/jumbo-hump/double-decker und bekannter Airline, nur nach erfolgreichem Usage-Sync und innerhalb des Budgets; position_only = unknown; 401/403 sperren bis Neustart; der Routentext darf persistiert werden.
- **Veraltet (stale)** — Zustand der Auswahl bei Totalausfall aller Flugquellen: letzter guter Stand bleibt sichtbar, ist aber als veraltet markiert.
- **Besonderheit** — optionaler Kurztext zu einem Flugzeugtyp (z. B. „Doppelstock“) in der Tabelle `type-classes`.
- **Airline-Tabelle (`airlines`)** — statische Zuordnung ICAO-3-Buchstaben-Präfix des Rufzeichens → Name, Land; bestimmt die Airline. Unbekanntes Präfix: Airline unbenannt, Standard-Lackierung. Siehe ADR 0010.
- **Lackierungs-Zuordnung (`airline-liveries`)** — kuratierte Tabelle ICAO-Präfix → Lackierungs-Id des Design-Systems; ohne Eintrag oder bei Typklassen ohne Lackierungen (Light Aircraft, Glider) gilt die Standard-Lackierung (`def`). Siehe ADR 0010.
- **Emitter-Kategorie** — ADS-B-Kategorie A1–A7 (A1 leicht, A2 mittel 1, A3 mittel 2, A4 High Vortex, A5 schwer, A6 Hochleistung, A7 Drehflügler) sowie B1 (Segelflieger -> glider) und B4 (Ultraleicht/Gleitschirm -> light-aircraft); B0/B5 gelten als "keine Kategorie"; oft nicht vorhanden; nur Fallback für die Typklasse. B2, B3, B6, B7 und alle C* werden wie Flugzeuge am Boden aus der Auswahl ausgeschlossen (ADR 0015).
- **Auswahl (Umsetzung)** — die bis zu zwei nächsten Flugzeuge im Umkreis, nach eigener Haversine-Distanz aus dem normalisierten Modell berechnet (nicht nach Anbieter-Distanz); im Walking Skeleton umgesetzt (infrastructure-001).
- **Route-Snapshot** — the offline copy of VRS standing-data (CC0) routes/ and airports/ in dataDir/vrs-standing-data, swapped atomically and indexed in memory (callsign -> airport ICAO legs); the only default RouteSource (ADR 0014). A callsign absent from it, or with an unknown airport, is Route unbekannt.
- **Mehrlegige Route** — a Route whose AirportCodes list more than two airports; kept as legs, shown as 'A -> B -> C', plausible if any leg passes every plausibility check (corridor, altitude profile, phase, heading).
- **Routenherkunft (route_source)** — Welche Quelle die Route einer Sichtung kannte (`vrs` | `adsbdb` | leer). Nur bei `vrs` wird der Routentext gespeichert; bei `adsbdb` bleibt `route` leer (Lizenz), "Route bekannt" zaehlt ueber die Herkunft. Siehe ADR 0016.
- **adsbdb-Route** — a route answered by the adsbdb web API, the first RouteSource in the default chain [adsbdb, vrs] (ADR 0016). Its text may be shown live and cached in memory but is never persisted (adsbdb terms): sightings record only `route_source = 'adsbdb'` with `route` NULL; only an explicitly VRS-labelled route text reaches SQLite. A 429 backs adsbdb off for backoffMinutes (VRS answers meanwhile). On a later Takt of the same visit, a VRS answer upgrades route and route_source together; VRS is never downgraded.
- **Budget-Protokoll (flightaware_calls)** — Ereignistabelle (Migration 0004), je bezahltem FlightAware-Aufruf ein Eintrag mit Zeitpunkt und Kosten. Verbrauchsschaetzung = max(eigene Periodensumme, Sync-total_cost + eigene Kosten der letzten usageLagMinutes). Bei Erreichen von monthlyBudgetUsd oder monthlyRequestCap wird bis zum Periodenende gestoppt; Periodenbeginn ist billingPeriodStartDay (UTC).
- **Quellen-Backoff (Sperre)** — Zustand je Flugquelle im Speicher: bei 429 gesperrt bis `Retry-After` bzw. `x-ratelimit-reset`, bei adsb.fi nach jeder 4xx mindestens 60 s; sonst Circuit Breaker (3 Fehler in Folge: 30 s, verdoppelnd bis 5 min, mit Jitter; Erfolg setzt zurück). Eine gesperrte Quelle wird übersprungen; `/healthz` nennt aktive Quelle und Zustand je Quelle (ok / backoff / blocked). Siehe ADR 0019.
- **Tagesbudget adsb.lol** — persistiertes Request-Limit je UTC-Tag (`sources.flight.adsbLol.dailyRequestCap`, Default 400 von 500). Ereignisse in `flight_source_calls` (Migration 0005); bei Erreichen blockt `FlightSourceChain.blockFor('adsb-lol', msBis00UhrUTC, 'blocked')` die Quelle bis Mitternacht UTC, auch nach Neustart. Ein niedrigerer `x-ratelimit-remaining`-Header gewinnt (hoeherer Verbrauch zaehlt), bei 429 gilt `x-ratelimit-reset` exakt. `/healthz` zeigt `budget {used, cap, remaining, resetsAt}` im adsb-lol-Eintrag von `flight.sources[]`.
- **Plausibilitaetspruefung (Route)** — a source's route is only stated if own observation agrees: (1) cross-track distance to the great-circle leg <= corridorBaseKm 50 + corridorPercent 8 % of leg length, capped at corridorMaxKm 150 (Config `sources.route.plausibility.corridorPercent` / `corridorMaxKm`; multi-leg: any leg passing all checks); (2) altitude profile: altitude <= climbMetersPerKm 120 x distance to origin + profileSlackM 600 (descent 80 m/km to destination), no limit once the envelope exceeds ~12 500 m; (3) flight phase: climb > 2.5 m/s farther than maxClimbDistanceKm 250 from origin (descent from destination) is implausible; (4) heading: bearing to the leg's next waypoint vs track deviates > maxHeadingDeviationDeg 65, only checked farther than originZoneKm 60 / destinationZoneKm 80 from the airports and above 3000 m. Missing track/vertical rate/altitude skips the dependent check. A route a source delivered but that was rejected at the current position is remembered in memory for cacheTtlHours and re-judged every tick against the current position without asking the source again; once plausible it is shown and counted as a `hit` (chosen) in route_lookups, while rejections count as `rejected`. `negativeTtlMinutes` applies only when every source answered unknown.
- **hexdb-Route** — a route answered by the hexdb.io web API (`GET /api/v2/routes/{callsign}`, keyless; 404 `route_not_found` = unknown), the first RouteSource in the default chain [hexdb, adsbdb, vrs]. hexdb states no licence (data partly from the same pool as adsbdb), so it is treated like adsbdb: shown live and cached in memory only, never persisted; sightings record only `route_source = 'hexdb'` with `route` NULL, and a later vrs/flightaware answer of the same visit may replace that finding. Multi-leg routes come from `airports[]`; the city of an airport is its name without the (International) Airport suffix, since hexdb has no municipality. A 429 backs hexdb off for `sources.route.hexdb.backoffMinutes`.

## Aggregates
_Noch nicht modelliert — entsteht in `modeling` / bei der Arbeit an Tasks._

## Key events
_Noch offen._

## Key commands
_Noch offen._

## Relationships with other contexts
- **Upstream of:** sky-scene (Auswahl), sighting-log (Sichtungen).
- **Anticorruption layer to:** externe kostenlose Flugdaten-/Routenquellen.
See `../../context-map.md`.

## Open questions
_Siehe `../../vision.md` → Open questions._
