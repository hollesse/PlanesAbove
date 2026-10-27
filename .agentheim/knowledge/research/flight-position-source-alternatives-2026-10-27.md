---
topic: Resiliente FlightSource-Kette fuer Positionsdaten - Alternativen zu adsb.lol (429/Timeouts), Limits, Eigenempfaenger, Failover-Muster
date: 2026-10-27
requested_by: user
related_tasks: []
---

# Research: Alternativen und Failover fuer die Positionsquelle

Legende: BELEGT = auf Primaerquelle gelesen oder am Live-Response gemessen. SEKUNDAER = Aggregator/Suchsynopse/Mirror. ⚠️ UNVERIFIED = nicht bestaetigt. Mehrere Primaerseiten waren fuer WebFetch gesperrt (airplanes.live 403, flyitalyadsb 403; `api.adsb.lol/docs` antwortete dem Fetch selbst mit HTTP 429).

## Question
Warum liefert adsb.lol 429/Timeouts bei ~1 Req/30 s, welche keyless oder frei registrierbaren Alternativen mit Point-/Radius-Endpoint gibt es, was kostet ein eigener Empfaenger, und wie bauen wir daraus eine Kette, die den Bedarf von 2.880 Abfragen/Tag (30-s-Takt) deckt?

## Summary
- **Ursache des 429 ist ein dokumentationsfremdes Tageslimit, nicht Last.** Gemessene Live-Header (Koordinator, 2026-10-27 16:4x UTC): `x-envoy-ratelimited: true`, `x-ratelimit-limit: 500, 4;w=1, 60;w=60, 500;w=86400`, `x-ratelimit-remaining: 0`, `x-ratelimit-reset: 25203`. Das heisst 4 Req/s, 60/min und **500/Tag pro IP**. Bei 2.880/Tag ist adsb.lol keyless nach ca. 4 h erschoepft (500 x 30 s = 250 min). Die oeffentliche README nennt dieses Limit nicht (s. 1).
- **adsb.fi ist der beste Primaer-Kandidat:** keyless, dokumentiert 1 Req/s (kein Tageslimit genannt), ADSBx-v2-kompatibel, Radius bis 250 nm, Nutzung "personal, non-commercial" erlaubt (passt zum Projekt), Pflicht: Quellenangabe mit Link. Wichtig: der Pfad `/v2/lat/lon/dist` ist **deprecated**, neu ist `/v3/lat/{lat}/lon/{lon}/dist/{nm}`.
- **airplanes.live und adsb.one** haben gleiche Form (`/v2/point/{lat}/{lon}/{nm}`), dokumentiert 1 Req/s; airplanes.live nennt "no SLA", Nutzung nicht-kommerziell. Beide eignen sich als Fallback 2 und 3 (Drop-in: nur Base-URL).
- **OpenSky ist rechnerisch machbar** (bbox <= 25 sq° = 1 Credit, 2.880 <= 4.000/Tag), aber anderes Schema (State-Vector-Arrays) und keine Latenzzusage; nur als letzter Fallback mit Adapter.
- **Eigener Empfaenger** (RTL-SDR + readsb, ca. 40-70 EUR) beseitigt jede API-Abhaengigkeit; lokale `aircraft.json` hat dasselbe Feldschema wie die v2-Antworten. Empfehlung: parallel als Ausbauziel, nicht als Sofortloesung.

## Findings

### 1. adsb.lol
- **Doku:** README des API-Repos [1]: "Rate limits are dynamic based on the environment load."; "If you get 4xx errors, you are doing something wrong."; "In the future, you will require an API key" - Key soll durch Feeden von adsb.lol erhaeltlich sein; "Keys are not required yet" (Zusammenfassung des Fetch, README-Text sinngemaess, SEKUNDAER ueber Fetch-Modell). Eine Suche nach aktuellen Feeder-Key-Details (Header-Name, Ausstellung, Limits fuer Keyinhaber) fand **nichts** [2]; ⚠️ UNVERIFIED, ob der Key heute existiert.
- **Gemessen (BELEGT, Live-Header, nicht von mir erneut abgerufen):** Envoy-Ratelimit `500, 4;w=1, 60;w=60, 500;w=86400` = 4/s, 60/min, 500/Tag je IP; bei Ueberschreitung HTTP 429 mit `x-envoy-ratelimited: true`, `x-ratelimit-reset` = Sekunden bis Reset (25203 s = 7 h bei Abfrage, passt zu einem Tagesfenster). Das README ("dynamic") deckt diese feste Quote nicht ab - die Doku ist hinter dem Verhalten zurueck. Ob `Retry-After` gesendet wird: nicht gemessen/berichtet; ⚠️ UNVERIFIED, daher `x-ratelimit-reset` auswerten.
- **Eine Feeder-Stufe, die das hebt:** Vergleichsseite [3] (SEKUNDAER, Suchsynopse) listet fuer adsb.lol `re-api` nur fuer Feeder-IPs (kein Key); Limits fuer Feeder nicht gefunden. ⚠️ UNVERIFIED.
- **point vs. closest:** keine abweichenden Limits dokumentiert; die Envoy-Quote gilt offenbar pro IP ueber die API (nicht pro Endpoint geprueft). ⚠️ UNVERIFIED.
- **Statuslage:** Eine Statusseite/GitHub-Issue/Discord-Meldung zu Oktober 2026 wurde nicht gefunden (Suche ohne Treffer [2]; Discord nicht durchsuchbar). Die beobachteten Timeouts (curl > 30 s) sind mit einer reinen Quote nicht erklaert (Quote liefert sofort 429) - eine echte Teilstoerung ist wahrscheinlich, aber ⚠️ UNVERIFIED.

### 2. Keyless Alternativen
- **adsb.fi** [4] (README, BELEGT): "These are compatible with the ADSBexchange v2 API"; `/v3/lat/[lat]/lon/[lon]/dist/[dist]` (bis 250 NM); "The older `/v2/lat/lon/dist` endpoint is deprecated ... The corresponding v3 endpoint should be used for all new integrations." Limits: "Public endpoints: 1 request per second", Feeder-Snapshot alle 30 s. Anfragen mit 400/401/403/404/429 zaehlen zu einer temporaeren IP-Sperre bei "excessive invalid requests". Terms: "adsb.fi open data is for personal, non-commercial use only."; Weitergabe/Lizenzierung verboten; "You must cite adsb.fi and include a link to our home page." Kein Tageslimit genannt. ⚠️ UNVERIFIED: ob die v3-Antwort exakt die Felder `ac`, `now`, `total` wie `/v2/point` traegt (ADSBx-v2-Kompatibilitaet laut README; Adapter-Test noetig).
- **adsb.one** [5] (archiviertes README, BELEGT mit Vorbehalt): `/v2/point/[lat]/[lon]/[radius]` bis 250 nm; "The ADSB One API is rate limited to 1 request per second."; kein Key, keine Terms im README, Apache-2.0 fuer den Code. Widerspruch: ein Mirror (tedder/api) nennt 1 Req/2 s [6] (SEKUNDAER) - konservativ 1 Req/2 s annehmen. Repo ist archiviert; ob der Dienst noch laeuft/unter gleichem Pfad: ⚠️ UNVERIFIED (nicht live geprueft).
- **airplanes.live** [7] (Suchsynopse des offiziellen api-guide; Seite selbst 403): REST-API `api.airplanes.live/v2`, `/point/[lat]/[lon]/[radius]` bis 250 nm, "rate limited to 1 request per second", kein SLA, nicht-kommerziell; "Access does not currently require a feeder ... might change in the future"; Bitte, Daten beizutragen. Ein "Contributor-Tier mit 8.640 Req/Tag und Historie" stammt nur von der Vergleichsseite [3] (⚠️ UNVERIFIED). Die Annahme "feeder-only seit 2026/403 fuer Nicht-Feeder" liess sich **nicht** belegen; die Seite liefert meinem Fetch selbst 403 (Bot-Schutz, kein Beleg).
- **ADS-B Exchange:** nur ueber RapidAPI/Vertrag, kein freier Tier (Vorbericht route-coverage, SEKUNDAER); ausgeschlossen (ADR 0001).
- **Weitere (adsbhub, adsb.exposed, globe.adsb.* mit offener API, theairtraffic, planespotters):** nicht belegt gefunden; ⚠️ UNVERIFIED, nicht empfohlen. hexdb/planespotters sind Metadaten-, keine Positionsdienste.

### 3. OpenSky als Fallback [8] (offizielle REST-Doku, BELEGT)
- Auth: "OpenSky exclusively supports the OAuth2 client credentials flow."; "Tokens expire after 30 minutes." (401 = Token abgelaufen, neu holen).
- Credits: drei getrennte Buckets (`/states/*`, `/tracks/*`, `/flights/*`); anonym 400/Tag, Standard 4.000/Tag, aktive Feeder 8.000/Tag, lizenzierte Nutzer 14.400/Stunde.
- `/states/all` bbox: "≤ 25 sq° or serial-only query" = 1 Credit; 25-100 sq° = 2; 100-400 sq° = 3; > 400 = 4. Unsere Box 0,6° x 0,6° = 0,36 sq° (Hessen: Laengengradfaktor spielt fuer die Abrechnung keine Rolle) = **1 Credit**. 2.880/Tag < 4.000 -> machbar, Reserve 1.120 (Retries zaehlen!). Bei 429: Header `X-Rate-Limit-Retry-After-Seconds`.
- Latenz: Doku nennt keine Zahl (anonym "time resolution is 10 seconds"); "5-10 s" ⚠️ UNVERIFIED. Terms: die REST-Seite enthaelt keine Nutzungsbedingungen; die Forschungs-/Non-Commercial-Klausel steht auf der Website (nicht gelesen, ⚠️ UNVERIFIED). Abdeckung Hessen: nicht geprueft, Mitteleuropa gilt als gut abgedeckt (⚠️ UNVERIFIED).
- Antwortform: `states` als Positions-Arrays (icao24, callsign, lon, lat, baro_altitude ...), nicht readsb-JSON -> eigener Adapter; keine Flugzeugtyp-/Registrierungsfelder.

### 4. Eigener Empfaenger
- **Software:** readsb `--write-json=<dir>` schreibt `aircraft.json`, "--write-json-every=<sec> ... (default 1)" [9]. Feldschema in README-json.md (nicht gelesen); tar1090 und die v2-APIs basieren auf demselben readsb-Format (adsb.lol/airplanes.live betreiben readsb-Forks) - Schemagleichheit plausibel, SEKUNDAER; Unterschied: lokale Datei hat `aircraft` statt `ac` als Array und keine `r`/`t`-Registrierungsfelder ohne Datenbank (tar1090 ergaenzt sie clientseitig) - ⚠️ UNVERIFIED, Adaptertest noetig. Lat/Lon/Distanz muss die App dann selbst filtern (Radius 17 nm).
- **Hardware/Kosten (Schaetzung, ⚠️ UNVERIFIED Preise):** RTL-SDR-Stick mit TCXO/Filter 25-45 EUR, 1090-MHz-Antenne 15-30 EUR (oder Beilage), Raspberry Pi/ZimaOS-Host vorhanden; gesamt ca. 40-70 EUR. Latenz < 1-2 s (Datei-Update 1 s [9]).
- **Reichweite:** Keine belegte Messung fuer Hessen/150 m. Erfahrungswerte: ein Nutzer ca. 120 km am Boden draussen mit Beilagenantenne [10, SEKUNDAER, Reddit]; Herstellerangabe Pro Stick Plus "Over 300 nm/550 km depending on installation quality" [10, Vendor-Marketing]; ein Ratgeber nennt Fensterbank 30-80 Flugzeuge, Dachboden 100-200, ueber Dachfirst 300+ [10, SEKUNDAER]. Fuer 30 km Radius reicht auch Fensteraufbau meist aus; Schwachpunkt sind Flugzeuge tief und hinter Abschattung. Antennenplatzierung dominiert den Dongle.
- **Feeder-Nutzen:** Feeden schaltet bei adsb.fi den Snapshot-Endpoint frei [4], bei adsb.lol den geplanten Key [1] und `re-api` [3], bei airplanes.live evtl. Contributor-Stufe [3]. Aber: 1090ES enthaelt kein Ziel/Route (Vorbericht), Routenluecke bleibt.

### 5. Resilienzmuster (allgemein, SEKUNDAER/Empfehlung)
- Keine Primaerquelle zu "planes overhead"-Projekten gefunden, die Failover dokumentiert; die Muster unten sind Standardpraxis (429 -> Retry-After/Reset honorieren, Circuit Breaker) [11 sinngemaess: "Honor Retry-After and back off"] und meine Ableitung, keine Projektbelege.
- Geordnete Kette mit Quoten-Budget schlaegt reines Round-Robin, weil die Quellen unterschiedliche Verlaesslichkeit/Terms haben; Round-Robin nur ueber gleichwertige Quellen, um Tagesbudget zu verteilen.

## Vergleichstabelle

| Quelle | Endpoint-Form | Keyless | Dokumentiertes Limit | Latenz | Terms/Attribution | Drop-in | Rolle |
|---|---|---|---|---|---|---|---|
| adsb.lol | `/v2/point/{lat}/{lon}/{nm}` | ja | gemessen 4/s, 60/min, **500/Tag**/IP; README "dynamic" | ~Echtzeit | README: kein Hinweis; Key per Feeden geplant | Referenz | nur Reserve (<= ~400/Tag) |
| adsb.fi | `/v3/lat/{lat}/lon/{lon}/dist/{nm}` (v2 deprecated) | ja | 1 Req/s, kein Tageslimit genannt; 4xx/429 -> IP-Sperre | ⚠️ nicht dokumentiert | personal, non-commercial; Attribution + Link | gering (Pfad, ggf. Felder) | **Primaer** |
| airplanes.live | `/v2/point/{lat}/{lon}/{nm}` | ja (laut Guide "not currently" feeder-pflichtig) | 1 Req/s; Contributor 8.640/Tag ⚠️ | ⚠️ | non-commercial, kein SLA | minimal (Base-URL) | Fallback 2 |
| adsb.one | `/v2/point/{lat}/{lon}/{nm}` | ja | 1 Req/s (Mirror: 1/2 s) | ⚠️ | keine Terms gelesen | minimal | Fallback 3 (Dienststatus pruefen) |
| OpenSky | `/api/states/all?lamin..` | nein (OAuth2) | 4.000 Credits/Tag, bbox <= 25 sq° = 1 | ⚠️ 5-10 s unbelegt | Forschung/non-commercial ⚠️ | hoch (Adapter) | letzter Fallback |
| ADS-B Exchange | RapidAPI | nein | bezahlt | - | Vertrag | - | ausgeschlossen (ADR 0001) |
| Eigener Empfaenger | `http://host/data/aircraft.json` | ja (lokal) | keins | < 2 s | keine | mittel (Datei, Filter) | Primaer *oder* Fallback 0 nach Aufbau |

## Empfehlung

### Kette (geordnet, je Quelle Tagesbudget)
1. **adsb.fi v3** - traegt 100 % im Normalfall (Takt 30 s = 2.880/Tag bei 1 Req/s weit unter Limit). Vor Produktivnahme Antwortschema gegen `/v2/point` diffen.
2. **airplanes.live** `/v2/point` - bei Fehler von 1.
3. **adsb.one** `/v2/point`.
4. **adsb.lol** - nur mit Budgetzaehler <= 400/Tag (Reserve gegen 500); sinnvoll eher als Rundlauf-Beimischung (z. B. jeder 8. Takt = 360/Tag), um dessen Verfuegbarkeit zu beobachten, oder als Fallback.
5. **OpenSky** (Adapter) - nur wenn 1-4 alle ausfallen; Budget 1 Credit/Takt, Tageszaehler <= 3.500.
(Eigenempfaenger: vor 1, sobald vorhanden.)

### Takt-Optionen
- **30 s (2.880/Tag):** adsb.fi allein reicht; Round-Robin adsb.fi/airplanes.live/adsb.one (je ~960/Tag) schont jede Quelle, erschwert aber Fehlersuche. Empfohlen: geordnet, Round-Robin nur bei 429/Sperrgefahr.
- **60 s (1.440/Tag):** halbiert Last; fuer "Flugzeuge ueber mir" noch brauchbar, aber hoeheres Schlepp-Risiko bei Bewegung (Flugzeug 250 m/s = 15 km pro Takt) - UI interpoliert.
- **adsb.lol-only wuerde min. 173 s Takt erfordern** (86.400 s / 500), also ungeeignet.

### Backoff-Regeln (Vorschlag)
- **429:** Wartezeit = `Retry-After` (falls vorhanden) sonst `x-ratelimit-reset` (adsb.lol) bzw. `X-Rate-Limit-Retry-After-Seconds` (OpenSky); Quelle fuer diese Dauer als "offen/gesperrt" markieren (Circuit open), sofort naechste Quelle im selben Takt probieren. Nie im selben Takt dieselbe Quelle wiederholen. Wenn Reset > 15 min: bis Reset sperren (Tageslimit adsb.lol: bis Mitternachts-Reset).
- **Timeout/5xx:** Timeout 5 s (nicht 30 s), nach 3 Fehlern in Folge Circuit open mit exponentiellem Backoff 30 s -> 1 -> 2 -> 5 min (max 5 min) + Jitter; danach Half-Open: ein Probe-Request.
- **adsb.fi:** 4xx/429 zaehlen zur IP-Sperre [4] -> bei jedem 4xx-Fehler sofort Quelle >= 60 s sperren, Anfragen strikt >= 1,1 s Abstand.
- **Budgetzaehler** je Quelle persistiert (adsb.lol 400/Tag, OpenSky 3.500/Tag); bei Erreichen sperren, nicht erst 429 abwarten.
- **Szene stabil halten:** letzter guter Zustand bleibt, nach 3 Takten "stale" (bestehende Regel); Quellenwechsel nicht als neues Szenen-Ereignis werten; Hex-Schluessel quellenuebergreifend einheitlich (Kleinbuchstaben). Cache-Verweilzeit = 1 Takt, damit ein Failover keine Doppelmeldungen ausloest. Attribution (adsb.fi-Link) im UI anzeigen, sobald adsb.fi aktiv ist.
- **User-Agent** mit Kontakt setzen (Praxis, keine Quelle).

### Eigenempfaenger (ein Absatz)
Ein RTL-SDR-Empfaenger auf dem Heimserver (ca. 40-70 EUR, Stunden Aufbauaufwand: readsb, optional tar1090) macht die Anzeige unabhaengig von Drittdiensten, liefert < 2 s Latenz und ein `aircraft.json` im bekannten Schema; ein Fensterstandort in Hessen sieht den 30-km-Radius meist ausreichend (Reichweite nicht belegt, ca. 100-200 km realistisch ⚠️ UNVERIFIED), ein Aussenstandort ist deutlich besser. Zusaetzlich wird man Feeder bei adsb.fi/adsb.lol/airplanes.live und erhaelt dort Feeder-Stufen. Nachteile: keine Routen (1090ES traegt kein Ziel), Registrierung/Typ nur ueber Datenbank (tar1090-DB), Abschattung durch Bebauung, Wartung. Empfehlung: Kette sofort mit adsb.fi umbauen (Aufwand klein), Empfaenger als mittelfristige Resilienz-Stufe 0 planen; erst nach 1-2 Wochen Messung der Reichweite (`--stats-range`, [9]) entscheiden, ob er Primaerquelle wird.

## Sources
1. [adsblol/api README](https://raw.githubusercontent.com/adsblol/api/main/README.md) - "dynamic" Limits, 4xx-Satz, Key-Plan; undatiert (Fetch-Zusammenfassung).
2. [Websuche adsb.lol API-Key/429](https://github.com/adsblol/api) - keine Treffer zu aktuellem Key/Status; 2026-10-27.
3. [Data / ADS-B API comparison (flyitalyadsb)](https://flyitalyadsb.com/en/dati/confronto/) - Vergleichsseite, nur Suchsynopse, Seite 403; SEKUNDAER, 2026.
4. [adsb.fi opendata README](https://github.com/adsbfi/opendata) - Endpoints, 1 Req/s, Terms, Attribution.
5. [ADSB-One/api README](https://github.com/ADSB-One/api) - Point-Endpoint, 1 Req/s; archiviert.
6. [tedder/api Mirror](https://github.com/tedder/api) - nennt 1 Req/2 s (SEKUNDAER).
7. [airplanes.live API guide](https://airplanes.live/api-guide) - nur ueber Suchsynopse; Seite 403, Copyright 2023.
8. [OpenSky REST API](https://openskynetwork.github.io/opensky-api/rest.html) - OAuth2, Credits, bbox-Kosten, 429-Header.
9. [readsb README](https://github.com/wiedehopf/readsb/blob/dev/README.md) - `--write-json`, `--write-json-every`, RTL-SDR, `--stats-range`.
10. [rtl-sdr.com / FlightAware-Forum / Reddit (Suchergebnis)](https://www.rtl-sdr.com/rtlsdr4everyone-ads-b-with-an-lna-and-more-comparisons/) - Reichweitenanekdoten, Herstellerangabe Pro Stick Plus (Marketing).
11. Allgemeine 429-Praxis (Suchsynopse, "Honor Retry-After") - sekundaer, keine ADS-B-Quelle.
12. Messung 2026-10-27 16:4x UTC: Live-Response-Header von api.adsb.lol `/v2/point` (vom Koordinator geliefert).

## Nachträge

**Nachtrag 2026-10-27 16:5x UTC (Messung durch den Betreiber-Agenten, 1 Aufruf):** `GET https://opendata.adsb.fi/api/v3/lat/50.45/lon/8.09/dist/17` antwortete HTTP 200 mit dem readsb-Schema `{ac:[...], msg, now, total, ctime, ptime}`; jedes `ac`-Objekt trägt u. a. `hex, type, flight, r, t, category, lat, lon, alt_baro, alt_geom, gs, baro_rate, geom_rate, track, seen_pos, seen, dst, dir`. Alle 13 Felder, die der heutige adsb.lol-Adapter liest (`hex, flight, t, r, category, lat, lon, alt_baro, alt_geom, gs, baro_rate, geom_rate, track`), sind vorhanden. Die Frage nach dem v3-Schema ist damit geklärt: Drop-in möglich.

## Unverified claims
- adsb.lol: Existenz/Ausstellung/Limits des Feeder-Keys; `Retry-After`-Header; gleiche Quote fuer `/closest`; aktueller Status/Teilausfall.
- adsb.fi v3: exakte Feldgleichheit mit `/v2/point`; Latenz.
- adsb.one: Dienst live? 1 Req/s oder 1 Req/2 s.
- airplanes.live: Contributor-Tier 8.640/Tag; Feeder-Pflicht/403-Policy (Guide selbst 403 fuer Fetch).
- OpenSky: Latenz, Terms, Abdeckung Hessen.
- Empfaenger: Preise, Reichweite in Hessen/150 m, readsb-Schema (`aircraft` vs `ac`, Registrierungsfelder).
- Alle "weiteren Aggregatoren" (adsbhub, adsb.exposed, globe.adsb.*).

## Open questions
- Liefern adsb.lol-Antworten `Retry-After`? (Ein einzelner `curl -i` des Koordinators beantwortet das.)
- Stoert adsb.fi-Teilnutzung (Takt 30 s) die "personal, non-commercial"-Regel? (Nein laut Wortlaut; bei Zweifel Kontakt per adsb.fi.)
- Soll Takt/UI interpolieren, damit 60 s Takt visuell reicht?
- Feed-Konditionen von adsb.lol (Key) nach Aufbau eines Empfaengers erneut pruefen; ggf. Discord/Feeder-Doku von Hand lesen.
