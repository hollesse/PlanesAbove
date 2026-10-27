---
topic: Weitere Routenquellen und Heuristiken fuer die Luecken der Routenkette (adsbdb + VRS), inkl. Tracking-basierte und kostenpflichtige Optionen
date: 2026-10-27
requested_by: user
related_tasks: [airspace-w3k8d]
---

# Research: Routenabdeckung ueber adsbdb + VRS hinaus

Legende: BELEGT = auf Primaerquelle (Herstellerseite, README, Doku) gelesen. SEKUNDAER = nur Aggregator, Forum oder Suchsynopse. ⚠️ UNVERIFIED = nicht aus Primaerquelle bestaetigt. Mehrere Primaerseiten (FR24-Doku, AirLabs-Preise, AeroAPI-OpenAPI) liessen sich nicht abrufen (JS-Seiten, 403/404); das ist bei den betroffenen Zeilen vermerkt.

## Question
Welche Quellen oder Heuristiken koennen die verbleibenden Routenluecken schliessen (a: umgewidmete Flugnummern, b: Charter/ad-hoc-Callsigns, c: Privatflieger unter Kennzeichen), zu welchen Kosten, und was ist lizenzrechtlich mit adsbdb/hexdb.io und AeroAPI erlaubt? Randbedingung: ADR 0001 (nur kostenlose, vertragsfreie Quellen), ADR 0016 (adsbdb nie persistiert).

## Summary
- **Keine kostenlose, keyless Quelle kennt den tatsaechlich geflogenen Flug.** adsb.fi, airplanes.live, adsb.one und ADS-B Exchange bieten (soweit lesbar) keinen Routen- oder Historien-Endpoint; Feeder werden zu hoeheren Rate-Limits/Snapshot-Zugriff, nicht zu Routendaten. Mode S/ADS-B uebertraegt kein Ziel. Der Weg zu tracking-basierten Routen fuehrt ueber bezahlte APIs.
- **FlightAware AeroAPI Personal ist die einzige realistische Last-Resort-Option:** Personal "No minimum", "up to $5 free per month" ($10 fuer ADS-B-Feeder), `GET /flights/{ident}` = $0.005 je Ergebnissatz (15 Datensaetze), also ca. 1000 Abfragen/Monat gratis. Akzeptiert Designator (ICAO-Callsign) und Registrierung. Bei Fluegen ohne Flugplan ("position only") liefert FlightAware ausdruecklich kein Ziel (Staff-Aussage, Forum) - Luecke (b) und (c) sind damit nicht garantiert geschlossen. Es verlangt einen Account und kollidiert in der Strenge mit ADR 0001 ("keine Vertraege"), ist aber bei Nutzung innerhalb des Freikontingents kostenlos.
- **Groesster Hebel liegt nicht in einer neuen Quelle, sondern in den 12 Konflikten ("beide plausibel, aber verschieden") und 12 hexdb-Gewinnen.** hexdb.io (keyless, keine Lizenz genannt) bringt ~8 Punkte, ist aber vom selben Datenlieferanten (Jim Mason) gespeist wie adsbdb und daher wie adsbdb zu behandeln: nur Speicher-Cache, nie persistiert. Konflikte lassen sich mit eigener Beobachtung (Kurs, Steig-/Sinkflug, Querabstand) schiedsen - das ist eine Heuristik ohne externe Quelle.
- **Abflughafen-Schaetzung aus eigener Beobachtung** ist in der Literatur als "most probable airport"-Ansatz (Bibliothek `traffic`) und in OpenSkys `estDepartureAirport` vorhanden, aber ohne veroeffentlichte Trefferquote. Fuer unsere Geometrie (30 km Radius, 50-100 km von FRA/CGN/DUS entfernt) ist eine Quote nicht belegbar; sie muss mit den 27 uebereinstimmenden Fluegen als Ground Truth offline gemessen werden.
- **Lizenz:** adsbdb-Daten duerfen "not be copied, published, or incorporated into other databases without the explicit permission" - ein reiner Befund (bekannt ja/nein, Quelle, plausibel ja/nein) ist keine Kopie der Daten (Auslegung, keine Rechtsberatung); ein In-Memory-Cache ueber Stunden wird von der README nicht angesprochen. AeroAPI Personal erlaubt "Storage and distribution of derivative works for personal or academic purposes only".

## Findings

### 1. Tracking-basierte Quellen

**FlightAware AeroAPI (Personal).** Offizielle Produktseite [1]: Personal = "No minimum", Rate-Limit "10 result sets/minute", Abfragegebuehren entfallen "up to $5 free per month", $10 fuer ADS-B-Feeder; Inhalt: aktueller Flugstatus und Tracks, ohne Alerts, Historie, Foresight. Preis `GET /flights/{ident}`: $0.005 je Ergebnissatz, "one set equaling 15 records" (`/flights/{id}/position` $0.010, `/track` $0.012). Standard ab $100/Monat, Premium ab $1000/Monat [1]. Rechnerisch (eigene Arithmetik): $5 / $0.005 = 1000 Ergebnissaetze/Monat, mit Feeder 2000.
- *Ident:* Eine Referenzkopie nennt `ident` als "flight ident, registration, or fa_flight_id" mit `ident_type` = `designator | registration | fa_flight_id`, Beispiel `/flights/N12345?ident_type=registration`; `start` max. 10 Tage zurueck, `end` max. 2 Tage voraus [2] (SEKUNDAER; FlightAware-Staff nennt im Forum "within the last 14 days" fuer diesen Endpoint [3] - Widerspruch 10 vs. 14 Tage, fuer uns unerheblich). ICAO-Callsigns wie LAV8091 sind Designatoren, also zulaessig (Schluss aus [2], nicht live getestet).
- *Antwort:* Objekt mit `origin`/`destination` (code, code_icao, code_iata, name, city), `scheduled_/estimated_/actual_` out/off/on/in, `route`, `filed_altitude` [2]. Fuer einen Flug in der Luft haengen origin/destination am Flugplan bzw. am Match; fuer "position-only"-Fluege ohne Flugplan sagt FlightAware-Staff: `progress_percent` sei nicht aussagekraeftig, "we are unable to determine what the destination of the flight is" [3] (SEKUNDAER, Forum). `actual_off`/`actual_on` koennen aus ADS-B abgeleitet werden, wenn kein anderer Feed sie liefert [3]. Heisst: bei Linien-/Charterfluegen mit Flugplan ist die tatsaechliche Route erwartbar (loest Typ a und die meisten b), bei Privatfliegern ohne Plan (c) nicht. ⚠️ UNVERIFIED: wie oft Pegasus/AJet/Albastar-Charter in Europa einen Flugplan bei FlightAware haben; nur durch einen Live-Test an einem Beispiel (LAV8091, TKJ9GC) klaerbar.
- *Lizenz:* Personal "Storage and distribution of derivative works for **personal** or **academic** purposes only" [1]. Speicherung fuer den Eigengebrauch ist damit abgedeckt; Weitergabe/Open-Source-Auslieferung abgeleiteter Daten ist im Rahmen "personal" nicht klar (⚠️ UNVERIFIED: AeroAPI-ToS-Volltext nicht gelesen).
- *Kostenschaetzung* (eigene Arithmetik, 30 Tage, 1 Ergebnissatz je Callsign und Tag durch Caching, $0.005 je Satz): **Last Resort** (nur die ca. 40 % unaufgeloesten Callsigns, bei 300-500 distinct/Tag = 120-200/Tag) = 3600-6000 Saetze = $18-30, minus $5 Freikontingent = **ca. $13-25/Monat** (mit Feeder-Gutschrift $8-20). **Volle Nutzung** (alle 300-500/Tag) = 9000-15000 Saetze = $45-75, minus $5 = **ca. $40-70/Monat**. Hinweis: Die App zeigt nur 2 Flugzeuge je Takt; wenn nur die tatsaechlich angezeigten und ungeloesten Callsigns abgefragt werden (statt aller im Radius), faellt die Zahl weit unter 1000/Monat, also **$0** im Freikontingent (Annahme, aus Sichtungsprotokoll zu messen). Ob eine Kreditkarte fuer den Personal-Account hinterlegt werden muss: ⚠️ UNVERIFIED.

**Flightradar24 API.** Kein Free-Tier; offizieller FAQ-Hinweis auf drei Abos Explorer/Essential/Advanced [4], der Blog nennt einen Sandbox zum kostenlosen Testen ohne Credit-Verbrauch [5, nur ueber Suchsynopse]. Preise laut FR24-Launch-Post (via Suchsynopse): Explorer $9 / 30.000 Credits, Essential $90 (Dritte nennen $99 mit 450.000 bzw. 333.000 Credits - Widerspruch), Advanced $900 / 4,05 Mio. [6][7]; Rate-Limit Explorer 10 Req/min [7, SEKUNDAER]. Credit-Kosten je Endpoint: nicht gefunden (⚠️ UNVERIFIED). Endpoints: Live Flights (Light/Full), Flight Summary (Take-off/Landing-Events), Flight Tracks [7]; ob Live-Positionen `orig_icao`/`dest_icao` tragen: ⚠️ UNVERIFIED (Dokumentation ist JS-Seite, nicht lesbar; ein MCP-Wrapper nennt `get_live_flights_positions_full` und `get_flight_summary_full/light`). FAQ: Nutzung auch kommerziell erlaubt, Details in den AGB [8]; eine "personal/non-commercial"-Klausel wurde nicht gefunden. Wegen $9/Monat Pflichtabo ist FR24 im Vergleich zu AeroAPI (gratis bis $5) die teurere Last-Resort-Option.

**Aggregatoren mit freiem Positions-API.**
- *adsb.fi Open Data* [9] (README): Endpoints `/v2/hex|icao|callsign|registration|sqk|mil` und `/v3/lat/lon/dist` (250 nm); `/v2/snapshot` nur Feeder. Rate-Limit 1 Req/s public, Feeder-Snapshot 1 Req/30 s. Terms: personal, non-commercial; Quellenangabe adsb.fi mit Link; Weitergabe verboten. **Kein Routen- und kein Historien-Endpoint.** `/v2/callsign` liefert Flugzeuge zu einem Callsign, nicht Routen.
- *airplanes.live*: api-guide weiterhin nicht lesbar (403, siehe Vorbericht); ein Routen-Endpoint ist in keiner gelesenen Quelle genannt (⚠️ UNVERIFIED). Feeder-Status hebt dort Zugangs-/Limit-Beschraenkungen, nicht Routen (laut Vorbericht, user reports).
- *adsb.one*: der archivierte Stand [Vorbericht] nennt nur Point-/Positions-Endpoints, 1 Req/s (SEKUNDAER).
- *ADS-B Exchange*: Kommerzieller Zugang nur per Vertrag/Preis auf Anfrage; Drittseiten nennen eine RapidAPI-"Lite"-Stufe (ab ca. $10) fuer Hobbyisten [10] (SEKUNDAER, ⚠️ UNVERIFIED). Keine Routenfelder gefunden. Weiterverbreitung/Bulk-Resale ohne Zustimmung untersagt [10].
- *adsb.lol*: routeset tot (Vorgabe); ob Feeding einen Routen-Endpoint freischaltet: nicht belegt (⚠️ UNVERIFIED). Ein eigener Empfaenger macht Routen nicht verfuegbar, da 1090ES kein Ziel enthaelt (Abschnitt 3).

**Schedule-APIs (keine Tracking-Daten, daher nur fuer Linienfluege nuetzlich, also fuer unsere Luecken a/b/c praktisch irrelevant).**
- *aviationstack* [11] (offizielle Preisseite): Free = $0, **100 Requests/Monat**, "Non-Commercial Use", ohne Support; Basic $49.99 (10.000 Req). HTTPS-Angabe der Seite und Dritter widersprechen sich (⚠️ UNVERIFIED). 100 Req/Monat sind fuer 300+ Callsigns/Tag um zwei Groessenordnungen zu klein.
- *AirLabs* [12] (Doku `/flight`): Eingabe `flight_icao`/`flight_iata` (nicht Registrierung/Hex laut Seite), liefert `dep_icao`/`arr_icao`; beschrieben als Kombination aus "schedule data" und "real-time flight data", nur der "closest" Flug. Free-Plan-Quote: Doku nennt keine Zahl; Aggregatoren nennen ca. 1000 Anfragen/Monat und "Personal Use" [13] (SEKUNDAER, ⚠️ UNVERIFIED). Preisseite war nicht abrufbar.
- *AeroDataBox*: Herstellerseite nennt "Part of our coverage comes from ADS-B receivers' community" und Plaene mit "API credits" ohne Zahlen [14]; Geekflare (SEKUNDAER): RapidAPI Basic 600 Units/Monat gratis, Pro $5.35/6000 Units [15]. Ob Callsign-Abfragen Tracking-Origins liefern: ⚠️ UNVERIFIED.
- *Aviation Edge*: keine Freistufe, 1. Monat $7-39, danach $299+ (SEKUNDAER) [15]. Nicht tragbar.
- *FlightLabs*, *OpenFlights routes*: nicht geprueft. OpenFlights ist statisch (Datenbank unter ODbL, Airline-Daten von 2012 laut Vorbericht); fuer aktuelle Fluege nutzlos (⚠️ UNVERIFIED fuer routes.dat-Stand).

### 2. Heuristiken ohne externe Quelle
- **Vorhandene Algorithmen:** `traffic` (Python) hat `TakeoffAirportInference` (erste Position) und `LandingAirportInference` (letzte Position) mit "most probable airport"; Einschraenkung auf grosse Flughaefen noetig, sonst Fehltreffer (Beispiel Helipad statt EHAM), keine Genauigkeitsangabe [16]. OpenSkys Flights-API traegt `estDepartureAirport`, `estDepartureAirportHorizDistance`, `departureAirportCandidatesCount` (Mehrdeutigkeit) [17, SEKUNDAER ueber Client-Bibliotheken]; die offizielle REST-Doku enthaelt die Feldtabelle auf der abgerufenen Seite nicht und sagt nur "Flights are updated by a batch process at night" [18]. Akademisch: Bayes'sche Zielvorhersage mit ">75 %" fuer Dublin-Fluege (NPS-These, SEKUNDAER ueber Suchsynopse) [19]; ein Valladolid-Paper klassifiziert Starts/Landungen per Hoehenaenderung [19]. tar1090/readsb: keine Routenschaetzung gefunden (⚠️ UNVERIFIED, nicht im Quelltext geprueft). FlightAwares eigene "estimated"-Logik: nicht oeffentlich dokumentiert gefunden.
- **Realistische Trefferquote:** keine veroeffentlichte Zahl fuer unsere Geometrie. Eigene Ueberlegung (Inferenz, nicht belegt): Der Radius liegt 50-100 km von FRA/CGN/DUS; Ueberflieger in Reiseflughoehe (die meisten) haben weder Steig- noch Sinkflug, und zurueckextrapolieren liefert nur eine Richtung, keinen Flughafen. Brauchbar sind Steigflug/Sinkflug-Faelle auf bekannten An-/Abflugkorridoren (FRA ist der dominante Flughafen). Empfehlung: erst offline gegen die 27 uebereinstimmenden Fluege (Ground Truth) messen, bevor die Heuristik Text im Steckbrief erzeugt.
- **Staerkster Einsatz:** nicht als Quelle, sondern als **Schiedsrichter fuer die 12 Konflikte** und als zusaetzlicher Plausibilitaetstest fuer Luecke (a): Welche der beiden plausiblen Routen passt besser zu Kurs (Richtung A nach B), Querabstand und Flugphase (Steigflug nahe dem behaupteten Abflughafen, Sinkflug nahe dem Ziel)? Das ist unsere eigene Logik, keine Quelle, kein Lizenzthema.

### 3. Mode-S/ADS-B-Felder
- Die gelesenen Quellen nennen nur Kennung, Position, Geschwindigkeit, Kurs, Steigrate, Zielhoehe/Modus-Bits (Target State, EHS 40h "Selected Vertical Intention") [20][21]. **Kein Register mit Zielflughafen oder Flugplan gefunden.** Ein positiver Gegenbeweis gegen die Existenz in allen BDS-Registern liegt nicht vor; ICAO Doc 9871 wurde nicht gelesen (⚠️ UNVERIFIED im Sinne eines Negativbeweises). Dass kein oeffentlicher 1090ES-Feed ein Ziel ausgibt, ist konsistent damit: aggregierte Felder in readsb sind `nav_altitude_*`, `nav_modes` usw. [Vorbericht, readsb README], nicht Ziele.
- **Aussenseiter:** ACARS/VDL2 (VHF, separater Empfaenger) enthaelt in manchen Nachrichtentypen Abflug-/Zielstation ("DA", "DS", "AD" in OAG-Beispielen) [22]; nur bei Airlines, die diese Nachrichten senden, nicht bei Privatfliegern, und Hardware/Aufwand ausserhalb des Projektrahmens (⚠️ UNVERIFIED, Rechtslage des Mitlesens in DE nicht geprueft).

### 4. Lizenz-Check
- **adsbdb** [23]: Wortlaut (README): Flugroutendaten "may not be copied, published, or incorporated into other databases without the explicit permission" von David J Taylor; Code MIT; Rate-Limit in README nicht genannt (ADR 0016: 512/min, 1024/min mit Sperre, aus eigener Messung). Caching: nicht angesprochen. Auslegung: (i) *In-Memory-Cache ueber Stunden:* kein "incorporated into other databases", gaengige Praxis, vertretbar; (ii) *"Route bekannt ja/nein", Quelle, "plausibel ja/nein" in privater SQLite:* das sind eigene Beobachtungen ueber den Dienst, keine Kopie von Routendaten - vertretbar, solange kein Routenpaar, kein Flughafencode und kein Callsign-zu-Route-Mapping persistiert wird (genau die Linie von ADR 0016). Das bleibt eine Auslegung, keine Rechtsberatung; ausdrueckliche Klaerung nur durch Anfrage beim Rechteinhaber ueber das GitHub-Issue-Tracking moeglich.
- **hexdb.io** [24]: Startseite nennt keine Lizenz, keine AGB, kein Limit ("Free · No API key", "3.1M+ Requests served daily" als Statistik), Daten "courtesy of PlaneBase/PlanePlotter, Jim Mason, Steve Hibberd, ip2location and Airport-Data". Ohne Lizenz gilt nach allgemeinem Urheber-/Datenbankrecht kein Nutzungsrecht ausser dem erkennbar beabsichtigten Abruf (Inferenz). Da Jim Mason auch bei adsbdb als Autor der Routendaten genannt ist [23], ist dieselbe Restriktion plausibel (⚠️ UNVERIFIED). **Behandlung wie adsbdb:** nur Speicher-Cache und nur Befund, nie Routentext persistieren, nie ausliefern.
- **FlightAware AeroAPI** [1]: siehe Abschnitt 1; Personal erlaubt Speicherung abgeleiteter Werke fuer persoenliche Zwecke.
- **adsb.fi** [9]: personal/non-commercial, Quellenangabe Pflicht; kein Routen-Thema.

## Vergleichstabelle

Gewinn-Schaetzungen sind eigene Einschaetzungen (Inferenz) zu den Luecken a/b/c, nicht gemessen.

| Quelle | Kosten | Quota/Limit | Kennt den getrackten Flug? | Lizenz/Terms | Gewinn a (umgewidmet) | Gewinn b (Charter) | Gewinn c (Privat) |
|---|---|---|---|---|---|---|---|
| adsbdb (Ist) | 0 | 512/min je IP (ADR 0016) | Nein, Callsign-DB | Daten nicht kopieren/einbinden | Teils falsch (stale) | nein | nein |
| VRS (Ist) | 0 | offline | Nein, Callsign-DB | CC0 | stale | nein | nein |
| hexdb.io | 0 | keine genannt | Nein, Callsign-DB | keine Lizenz genannt | +8 Pkt. gemessen | nein | nein |
| Eigene Beobachtung (Heuristik) | 0 | - | Ja, nur Flughafen-Naehe | frei | mittel (Schiedsrichter fuer 12 Konflikte) | gering | gering |
| FlightAware AeroAPI Personal | $0 bis $5, danach $0.005/Satz; Last Resort ca. $13-25/Monat, voll ca. $40-70 | 10 Saetze/min | Ja, Flugplan + Tracking; "position-only" ohne Ziel | personal/academic, Speicherung erlaubt | hoch | hoch bis mittel (Flugplan noetig) | nein |
| Flightradar24 API | ab $9/Monat, kein Free-Tier | 30.000 Credits (Explorer) | Ja, laut Marketing ⚠️ UNVERIFIED | AGB, Personal-Klausel nicht gefunden | hoch ⚠️ | hoch ⚠️ | nein |
| adsb.fi / airplanes.live / adsb.one | 0 | 1 Req/s | Nein, keine Routen | personal/non-commercial | 0 | 0 | 0 |
| ADS-B Exchange | ab ca. $10 (RapidAPI, ⚠️) | unbekannt | Keine Routenfelder gefunden | kein Bulk-Resale | 0 | 0 | 0 |
| AirLabs | Free ca. 1000/Monat ⚠️ | unklar | Schedule + Live gemischt | Free "personal use" ⚠️ | gering | gering | nein |
| aviationstack | Free 100 Req/Monat | 100/Monat | Nein, Schedule | Free non-commercial | gering | nein | nein |
| AeroDataBox | Free 600 Units/Monat ⚠️ | 600/Monat | ⚠️ UNVERIFIED | unbekannt | gering | gering | nein |

## Empfehlung (priorisiert)
1. **hexdb.io als dritte Stufe aktivieren, mit adsbdb-identischer Behandlung (nur Speicher-Cache, nur Befund).** +8 Prozentpunkte fuer 0 Euro; Trade-off: Lizenz unklar, deshalb nie persistieren oder ausliefern, und vom selben Datenpool wie adsbdb, also hoher Gleichlauf der Fehler (bei umgewidmeten Callsigns fallen beide gleich aus).
2. **Konflikte (12/78) mit eigener Beobachtung entscheiden statt zufaellig die erste Quelle zu nehmen:** Route waehlen, deren Richtung/Querabstand/Flugphase besser zum Track passt; bei Gleichstand "Route unbekannt". Trade-off: keine neuen Daten, aber der groesste Einzelposten; Qualitaet vorher an den 27 uebereinstimmenden Fluegen offline messen (False-Positive-Rate).
3. **Abflugnaehe-Heuristik nur als Plausibilitaets-Zusatz, nicht als Textquelle**, und erst nach Messung freischalten. Trade-off: schliesst Luecken (a)/(b) nur bei Steig-/Sinkflug nahe grosser Flughaefen und kann einen falschen Flughafen suggerieren; fuer ein Kinderdisplay ist "Route unbekannt" besser als eine geratene Route.
4. **Bezahlter Last Resort: FlightAware AeroAPI Personal**, nur fuer ungeloeste Callsigns der *tatsaechlich angezeigten* Flugzeuge, Cache pro Callsign und Tag, hartes Monatslimit (z. B. 900 Saetze = $4.50, bleibt im Gratis-Guthaben). Erwartete Kosten bei dieser Nutzung $0; ohne Limit und bei allen 300-500 Callsigns/Tag $40-70/Monat. Trade-off: Account-Pflicht und Bruch mit ADR 0001, Luecke (c) bleibt ungeloest, Luecke (b) nur bei Flugplan. Vor Entscheidung ein Live-Test mit LHX1HL, TKJ9GC und LAV8091 (3 Abfragen, etwa $0.015).
5. **Flightradar24 nur, wenn AeroAPI den Test nicht besteht:** $9/Monat Pflichtabo, Felder und Credit-Kosten unbestaetigt, damit teurer und weniger dokumentiert als AeroAPI.
6. **Nicht verfolgen:** Schedule-APIs (aviationstack, AirLabs, AeroDataBox, Aviation Edge: Freikontingent zu klein oder keine Tracking-Daten), Feeder-Programme fuer Routen (keine Routenendpoints), ACARS-Empfang (Aufwand und Rechtslage).

## Sources
1. [FlightAware AeroAPI Produktseite](https://www.flightaware.com/commercial/aeroapi/) - Personal/Standard/Premium, $5 frei, $0.005 je Satz, 15 Datensaetze, Speicherrecht (Primaer, abgerufen 2026-10-27).
2. [wal.sh AeroAPI 4.28 Reference](https://wal.sh/research/ads-b/aeroapi-reference) - `ident`, `ident_type`, Felder, Zeitfenster (SEKUNDAER, Kopie der Referenz).
3. [FlightAware Forum "Current flight is not displayed in AeroAPI"](https://discussions.flightaware.com/t/current-flight-is-not-displayed-in-aeroapi/85629) und [Out/off/on/in Erklaerung](https://discussions.flightaware.com/t/scheduled-estimated-actual-out-off-on-in-explanation/94112) - Staff-Aussagen zu position-only und Fallback aus ADS-B (Forum, nur ueber Suchsynopse).
4. [Flightradar24 API FAQ](https://support.fr24.com/support/solutions/folders/3000022922) - drei Plaene, Credits, Suspendierung (Primaer, nur ueber Suchsynopse).
5. [FR24 Blog "How to get started with the API"](https://www.flightradar24.com/blog/b2b/how-to-get-started-with-the-flightradar24-api/) - Sandbox, $9 (403 beim Abruf, nur Suchsynopse).
6. [FR24 Blog "Introducing the API"](https://www.flightradar24.com/blog/b2b/flightradar24-api/) - Preise Explorer $9 / Essential $90 / Advanced $900 (403, nur Suchsynopse).
7. [api-evangelist/flightradar24](https://github.com/api-evangelist/flightradar24) - Drittprofil: $9/30.000, $99/450.000, $900/4,05 Mio., Rate-Limits, Endpoints (SEKUNDAER).
8. [FR24 Support "Can the API be used for commercial purposes"](https://support.fr24.com/support/solutions/articles/3000128176-can-the-api-be-used-for-commercial-purposes-) - kommerziell erlaubt, AGB verweisen (nur Suchsynopse).
9. [adsbfi/opendata README](https://github.com/adsbfi/opendata) - Endpoints, 1 Req/s, personal non-commercial, Quellenangabe (Primaer).
10. [ADS-B Exchange Support/Pricing, apispine](https://apispine.com/ads-b-exchange/pricing) und [ADSBx Data-Seite](https://dev.adsbexchange.com/data/) - Preise Dritter, kein Bulk-Resale (SEKUNDAER).
11. [aviationstack Pricing](https://aviationstack.com/pricing) - Free 100 Req/Monat, non-commercial (Primaer).
12. [AirLabs /flight Doku](https://airlabs.co/docs/flight) - `flight_icao`, `dep_icao`/`arr_icao`, Schedule + Live (Primaer).
13. [spotsaas AirLabs Pricing](https://www.spotsaas.com/product/airlabs/pricing) - Aggregator, Free ca. 1000, Personal Use (SEKUNDAER).
14. [AeroDataBox](https://aerodatabox.com/) - ADS-B-Community als Teilquelle, Changelog 2026-09-08 "API credits" (Primaer, ohne Preise).
15. [Geekflare Best Flight Data APIs 2026](https://geekflare.com/guides/flight-data-api/) - Preisvergleich AeroDataBox/Aviation Edge/aviationstack/FR24 (SEKUNDAER).
16. [traffic: algorithms.metadata](https://traffic-viz.github.io/api_reference/traffic.algorithms.metadata.html) - Take-off/Landing-Airport-Inference (Primaer, ohne Genauigkeit).
17. [WebService::OpenSky::Core::Flight](https://metacpan.org/pod/WebService::OpenSky::Core::Flight) - `estDepartureAirport`-Felder (SEKUNDAER, Client-Bibliothek).
18. [OpenSky REST API](https://openskynetwork.github.io/opensky-api/rest.html) - "updated by a batch process at night" (Primaer).
19. NPS-These [Flight destination prediction (Bayes)](https://calhoun.nps.edu/entities/publication/467beee1-1724-457d-8527-63fea4704ce3) und [Valladolid Manuscript](https://uvadoc.uva.es/bitstream/10324/38748/1/Manuscript_v10.pdf) - akademische Ansaetze (nur Suchsynopse).
20. [mode-s.org Basics](https://mode-s.org/1090mhz/content/mode-s/1-basics.html) - erwaehnt BDS 5,0/6,0, kein Ziel-Register (Primaer, unvollstaendig).
21. [ICAO NACC ADS-B Out Overview](https://www2023.icao.int/NACC/Documents/Meetings/2021/ADSB/P01-OverviewADSBOut-ENG.pdf) - ADS-B-Out-Inhalte (nur Suchsynopse).
22. [airframes.io Blog "Decoding ACARS Messages"](https://blog.airframes.io/?p=1498) und [OAG ACARS OOOI Examples](https://www.oag.com/hubfs/Inbound-Services/OAG-ACARS-OOOI-Message-Types-and-Examples.pdf) - DA/DS/AD-Felder in manchen Nachrichten (nur Suchsynopse).
23. [mrjackwills/adsbdb](https://github.com/mrjackwills/adsbdb) - Copy-Restriktion, MIT, kein Limit genannt (Primaer).
24. [hexdb.io](https://hexdb.io/) - Endpoints v2, Datenquellen, keine Lizenz/AGB (Primaer, abgerufen 2026-10-27; Seite Seite nennt "Database last updated 27/10/26" (Review-Check 2026-10-27)).

## Unverified claims
- AeroAPI: Verhalten von `/flights/{ident}` fuer Charter-Callsigns ohne Flugplan, Kreditkartenpflicht fuer Personal, ToS-Volltext, 10 vs. 14 Tage Fenster.
- Flightradar24: Credit-Kosten je Endpoint, ob Live-Positionen origin/destination tragen, Essential-Preis ($90 vs. $99), Personal/non-commercial-Klausel, Sandbox-Details.
- AirLabs Free-Quote und Preise, AeroDataBox-Quote und Callsign-Verhalten, aviationstack-HTTPS in Free, ADS-B-Exchange-RapidAPI-Preise.
- hexdb.io: Lizenz, Gleichheit der Restriktion mit adsbdb, Rate-Limit.
- airplanes.live/adsb.one: Fehlen eines Routen-Endpoints (Seiten nicht lesbar); ob Feeding bei adsb.lol Routen freischaltet.
- Kein Zielfeld in allen Mode-S-BDS-Registern (Negativbeweis nicht aus Doc 9871 gelesen); tar1090/readsb enthaelt keine Routenschaetzung.
- Trefferquote der Abflugnaehe-Heuristik fuer unsere Geometrie (keine Quelle, nur Inferenz).
- Alle Gewinn-Schaetzungen der Vergleichstabelle fuer Luecken a/b/c.

## Open questions
- Ein Live-Test von AeroAPI mit LHX1HL, TKJ9GC, LAV8091 und einer Privatmaschine: Origin/Destination und `position_only` pruefen (ca. $0.02).
- Messung am Sichtungsprotokoll: Wie viele ungeloeste Callsigns gehoeren zu *angezeigten* Fluegen pro Monat (bestimmt, ob AeroAPI kostenlos bleibt)?
- Offline-Auswertung der Heuristik gegen die 27 uebereinstimmenden und die 12 Konfliktfluege (Trefferquote und False-Positive-Rate).
- Anfrage bei David J Taylor/Jim Mason: Duerfen adsbdb-/hexdb-Befunde (nicht Routen) pro Quelle in privater SQLite stehen; ist ein Stunden-Cache in Ordnung?
- Passt ein Account mit Freikontingent zu ADR 0001 ("keine Vertraege")? Entscheidung des Betreibers; ggf. ADR-Ergaenzung.
