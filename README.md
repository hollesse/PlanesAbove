# PlanesAbove

Der Himmel über dem Haus: eine Anzeige, die zeigt, welches Flugzeug gerade über dem Haus fliegt (siehe `.agentheim/knowledge/vision.md`).

## Design-System (Storybook)

Alle visuellen Bausteine entstehen zuerst als Story in Storybook (ADR 0002) und werden vom Betreiber abgenommen.

```
npm install
npm run storybook          # Entwicklungsserver, http://localhost:6006
npm run build-storybook    # statische Seite nach storybook-static/
npm test                   # Unit-Tests (Vitest, jsdom)
npm run typecheck
npm run e2e                # Playwright: alle Stories rendern fehlerfrei (WebKit + Chromium)
npm run e2e:chromium       # nur Chromium (falls WebKit lokal nicht startet)
```

`npm run e2e` baut Storybook vorher selbst. Die Asset-Module werden von `npm run assets` erzeugt (läuft automatisch vor `test`, `storybook`, `build-storybook`).

### Layout

```
src/client/ui/            Framework-freie Komponenten; Storybook UND spaeter die App importieren genau diese Module
  index.ts                oeffentliche Oberflaeche (Barrel)
  domain/                 Katalog (Typklassen, Himmel, Lackierungen), Flugdaten-Formatierung, Beispieldaten
  atoms/ molecules/ organisms/ templates/ pages/   eine Ebene = ein Ordner
  transitions/            Uebergaenge (Spezifikation + Player), Keyframes in styles/transitions.css
  styles/                 tokens.css (lokale Schriften), ui.css, transitions.css
  tokens/fonts/           Archivo 900, IBM Plex Mono 400/500 (woff2, lokal)
  assets/svg/             bereinigte SVG-Assets aus den Entwuerfen (Quelle der Wahrheit)
  assets/generated/       von scripts/build-assets.mjs erzeugt (git-ignoriert)
  stories/                Stories, Titel Atoms/ Molecules/ Organisms/ Templates/ Pages/
tests/unit  tests/e2e     Vitest bzw. Playwright
.storybook/               Storybook-Konfiguration (html-vite, Viewports iPad Pro 12,9" / iPad 9,7" / Entwurf 5:3)
```

## Dienst und Client (Walking Skeleton)

Ein Node/TypeScript-Dienst (`src/server/`, ein Modul je Bounded Context unter `modules/`) holt alle 30 s die Flugzeuge von [adsb.fi](https://adsb.fi) (Failover auf [adsb.lol](https://adsb.lol), siehe ADR 0019), waehlt die zwei naechsten (mit Slot-Haltezeit: ein Flugzeug behaelt seinen Platz mindestens `scene.slotHoldTakte` Takte, Default 3 = 90 s, ausser es verlaesst den Umkreis; ADR 0017), schreibt Sichtungen nach SQLite und liefert `GET /api/state`, `GET /healthz`, `GET /audio/<key>.wav` sowie den Client. Der Client (`src/client/app/`, framework-frei, esbuild ES2020/Safari 16) setzt die Szene ausschliesslich aus den abgenommenen Komponenten in `src/client/ui/` zusammen.

```
npm run build              # dist/client (Kiosk-Client) + dist/server/server.mjs
cp config.example.yaml config.yaml   # Standort eintragen
CONFIG_PATH=./config.yaml npm start  # http://localhost:8080/
npm test                   # Unit- + Contract-Tests (Vitest, offline, ohne Netz)
npm run typecheck
npm run e2e                # baut Storybook + Dienst; Playwright WebKit + Chromium gegen den echten Dienst im Mock-Modus
npm run e2e:chromium       # nur Chromium
npx playwright install webkit && npx playwright test --project=webkit   # nur WebKit (lokal geprueft, gruen)
npm run stats:routes -- --db data/planesabove.db --days 7 [--json] [--standort <id|unbekannt|alle>]   # Routen-Statistik aus dem Sichtungsprotokoll (Quellen, Unbekannte, Konflikte)
npm run stats:liveries -- --db data/planesabove.db --days 30 [--json] [--standort <id|unbekannt|alle>]   # Lackierungs-Statistik: Airlines, die mit der Standard-Lackierung gezeigt wurden
```

### Mock-Modus und Szenarien

`mode: mock` + `scenario: scenarios/<name>.json` ersetzt Flug-, Routen- und TTS-Adapter durch Fakes (ADR 0004). Die Zeit steht still, bis `POST /mock/advance {"seconds":30}` sie vorrueckt (ein 30-s-Takt laeuft in Millisekunden); `GET /mock/sightings` listet die Sichtungen. Szenarien: `empty-sky`, `one-plane`, `two-planes`, `switch-during-narration`, `outage-recovery`. Ein Szenario ist eine zeitgeordnete Liste von Schritten (`at` in Sekunden) mit `planes` (Abstand/Peilung statt Koordinaten), `failure` (`http-403|http-429|http-5xx|timeout|network|parse|null`), `routes` und `tts` (`durationMs`, `failure`).

**Routenquelle.** Routen werden zuerst live bei [hexdb.io](https://hexdb.io/) abgefragt (`GET hexdb.io/api/v2/routes/{callsign}`, ohne Key; Default-Reihenfolge `[hexdb, adsbdb, vrs]`, die erste plausible Route gewinnt). hexdb nennt keine Lizenz (Daten u. a. von Jim Mason, wie bei adsbdb) und wird deshalb wie adsbdb behandelt: nur Arbeitsspeicher-Cache, **nie persistiert** (`route_source = 'hexdb'`, kein Routentext); Backoff nach 429 und Timeout unter `sources.route.hexdb`. Danach wird live bei [adsbdb](https://www.adsbdb.com/) abgefragt (`GET api.adsbdb.com/v0/callsign/{callsign}`, ohne Key). Nach den adsbdb-Bedingungen duerfen diese Daten nicht kopiert oder in andere Datenbanken uebernommen werden: Sie leben nur im Arbeitsspeicher-Cache und werden **nie persistiert** (Sichtungen speichern bei adsbdb-Treffern nur `route_source = 'adsbdb'`, keinen Routentext). Bei 429 pausiert adsbdb fuer `sources.route.adsbdb.backoffMinutes` (Default 5). Als Fallback (unbekannt, nicht erreichbar, 429, unplausible Route) dient der offline Snapshot der [VRS standing-data](https://github.com/vradarserver/standing-data) (Lizenz CC0-1.0): Der Dienst laedt `routes/` und `airports/` (~22 MB) nach `<dataDir>/vrs-standing-data/`, tauscht sie atomar aus und erneuert sie alle `sources.route.snapshotRefreshHours` (Default 24). Jede Route jeder Quelle muss die Plausibilitaetspruefung bestehen, sonst bleibt es `Route unbekannt` (eine abgelehnte Route wird fuer `cacheTtlHours` im Speicher gemerkt und bei jedem Takt gegen die aktuelle Position neu bewertet, ohne die Quelle erneut zu fragen; `negativeTtlMinutes` gilt nur, wenn jede Quelle `unbekannt` antwortete): Querabstand zur Grosskreislinie (`corridorBaseKm` 50 + `corridorPercent` 8 % der Streckenlaenge, gedeckelt bei `corridorMaxKm` 150), Hoehenprofil gegen Abflug- und Zielflughafen, Flugphase (Steig-/Sinkflug nur unterhalb `phaseMaxAltitudeM` 8000 m, oberhalb `phaseMinRateMs` 5 m/s und weiter als `maxClimbDistanceKm` 400 vom jeweiligen Flughafen; Hoehenprofil: `climbMetersPerKm` 150 / `descentMetersPerKm` 80 + `profileSlackM` 1500) und Kurs gegen die Route; Kurs wird nur weiter als `originZoneKm` (60) vom Abflug- und `destinationZoneKm` (80) vom Zielflughafen und oberhalb `minHeadingCheckAltitudeM` (3000) geprueft. Umgeleitete Routen: Schneidet der Grosskreis eines Streckenabschnitts (abgetastet alle `closedAirspaceSampleKm`, Default 100) einen gesperrten Luftraum aus `closedAirspaces` (12 grobe Default-Polygone, Stand 2026-10-27: u. a. Russland, Belarus, Ukraine, Iran, Irak, Nahost, Nordkorea; eine Angabe in `config.yaml` ersetzt die Liste vollstaendig, `[]` schaltet ab), entfaellt der Querabstand-Korridor und der Kurs darf um `detourHeadingDeviationDeg` (Default 90) statt `maxHeadingDeviationDeg` abweichen; Hoehenprofil und Flugphase bleiben aktiv (Beispiel KAL908 London-Seoul ueber Mitteleuropa). Die Polygone pflegt der Betreiber von Hand. Alle Schwellen stehen unter `sources.route.plausibility` (siehe `config.example.yaml`). `sources.route.order` (Default `[hexdb, adsbdb, vrs]`) legt die Reihenfolge fest.

**FlightAware AeroAPI (optional, kostenpflichtig, letzte Stufe).** Die freien Quellen kennen umgewidmete Flugnummern und Charterfluege oft nicht (Beispiele: LHX1HL, TKJ9GC, LAV8091). Optional kann deshalb als allerletzte Stufe [FlightAware AeroAPI](https://www.flightaware.com/aeroapi/) befragt werden. Das ist eine bewusste, begruendete Ausnahme von ADR 0001 (nur kostenlose, vertragsfreie Quellen), siehe ADR 0018.

- **Account und Key:** AeroAPI-Account (Personal-Tier, Kreditkarte noetig; bis zu 5 USD Guthaben im Monat, 0,005 USD je Ergebnissatz, also rund 1000 Abfragen). Der Key steht **nur** in der Umgebungsvariable `FLIGHTAWARE_API_KEY` (z. B. in der `.env` des Compose-Stacks), **nie** in `config.yaml`, und wird nie geloggt. Fehlt er, ist FlightAware deaktiviert (eine Warnung beim Start).
- **Aktivieren (Opt-in):** `flightaware` in `sources.route.order` aufnehmen, z. B. `order: [hexdb, adsbdb, vrs, flightaware]`. FlightAware wird unabhaengig von der Position immer zuletzt gefragt, und nur wenn alle freien Quellen unbekannt, nicht erreichbar oder unplausibel waren.
- **Filter:** Gefragt wird nur bei Typklasse narrowbody, widebody, jumbo-hump oder double-decker **und** bekannter Airline (Praefix in der Airline-Tabelle). Privatflieger, Hubschrauber, Business-Jets, Turboprops, Regionaljets und unbekannte Praefixe loesen nie einen bezahlten Aufruf aus.
- **Budget:** Hartes Limit je Abrechnungszeitraum: `sources.route.flightaware.monthlyBudgetUsd` (Default 4.50) und `monthlyRequestCap` (Default 900). Jeder Aufruf wird als Ereignis in der Tabelle `flightaware_calls` protokolliert; der Verbrauch ist `max(eigene Summe, letzter Usage-Sync + eigene Aufrufe der letzten usageLagMinutes)`. Vor jeder bezahlten Abfrage muss `Schaetzung + 0,005 USD < Budget` gelten, sonst bleibt die Route bis zum Periodenende unbekannt (eine Warnung je Periode). Der Usage-Sync (`GET /account/usage`, kostenlos) laeuft beim Start (ohne erfolgreichen Sync keine bezahlte Abfrage) und alle `usageSyncMinutes` (max. 30). Der Abrechnungsbeginn ist `billingPeriodStartDay` (Default 1, UTC); nach der Anmeldung gegen das Portal pruefen.
- **Lizenz:** Laut Personal-Lizenz duerfen die Ergebnisse "for personal or academic purposes" gespeichert werden: FlightAware-Routen stehen mit Text und `route_source = 'flightaware'` in `sightings.route` (anders als adsbdb). Die Befunde je Quelle stehen wie ueblich in `route_lookups`.
- **Betreiber-Regel:** Der API-Key wird **nie ohne Freigabe** aus einer Claude-Session (oder einem anderen Agenten) benutzt; vor jedem Live-Aufruf wird die Anzahl der Requests genannt und freigegeben. Tests laufen vollstaendig offline gegen aufgezeichnete Fixtures (`tests/fixtures/flightaware/`).

**Flugquelle und Attribution.** Positionen kommen keyless von [adsb.fi](https://adsb.fi) (open data, `GET opendata.adsb.fi/api/v3/lat/{lat}/lon/{lon}/dist/{nm}`; nur persoenliche, nicht-kommerzielle Nutzung, 1 Request/s), bei Ausfall von den naechsten Quellen aus `sources.flight.order` (Default `[adsb-fi, adsb-lol]`; Namen ohne Adapter werden beim Start mit Warnung uebersprungen). Pro Takt wird die erste verfuegbare Quelle gefragt, bei Fehler sofort die naechste. Backoff je Quelle: bei 429 Pause bis `Retry-After` bzw. `x-ratelimit-reset`; bei adsb.fi jede 4xx-Antwort mindestens 60 s (4xx zaehlen dort zur IP-Sperre); sonst Circuit Breaker (3 Fehler in Folge: 30 s, verdoppelnd bis 5 min, mit Jitter). `/healthz` zeigt `flight.active` und den Zustand je Quelle, bei adsb-lol zusaetzlich `budget` (used/cap/remaining/resetsAt). adsb.lol hat ein persistiertes Tagesbudget (`sources.flight.adsbLol.dailyRequestCap`, Default 400 von 500 Requests je UTC-Tag; bei Erreichen wird die Quelle bis 00:00 UTC uebersprungen, auch nach Neustart; ein niedrigerer `x-ratelimit-remaining`-Header gewinnt, bei 429 gilt `x-ratelimit-reset` exakt). Attribution: Data: [adsb.fi](https://adsb.fi) (Failover: [adsb.lol](https://adsb.lol), ODbL 1.0).

Contract-Fixtures liegen in `tests/fixtures/` (`vrs/` ist eine aufgezeichnete Teilmenge der VRS standing-data vom 2026-10-27, Details in `vrs/README.txt`; `adsblol-point-frankfurt.json` ist eine echte Antwort vom 2026-10-27; `adsbfi-v3-point-oberweyer.json` ist eine echte adsb.fi-v3-Antwort vom 2026-10-27 (`/api/v3/lat/50.45/lon/8.09/dist/17`, keyless, 3 Flugzeuge); die uebrigen sind konstruiert, siehe Kommentare in den Tests).

## Typquelle und Korrekturtabelle

Der Flugzeugtyp je Hex wird in dieser Reihenfolge bestimmt: (1) **Korrekturtabelle** `src/server/modules/airspace/tables/type-overrides.json` (Hex, 6 Zeichen klein, auf ICAO-Typcode; von Hand gepflegt, beim Start validiert; hexdb wird fuer diese Hexe nicht gefragt), (2) **hexdb** (`GET hexdb.io/api/v1/aircraft/{hex}`, ohne Key; weicht `ICAOTypeCode` von dem der Flugquelle ab, gewinnt hexdb), (3) der Typ der **Flugquelle**. Das Ergebnis geht durch die Typtabelle (Typklasse). hexdb-Antworten liegen nur im Arbeitsspeicher (`sources.aircraftType.hexdb.cacheTtlHours`, Default 24) und werden **nie gespeichert**; die Sichtung behaelt den `type_code` der Flugquelle, dazu `type_source` (`flight|override|hexdb`) und die eigene Typklasse (ADR 0026). Timeout (`sources.aircraftType.hexdb.timeoutMs`, Default 2000), Netzfehler und 429 werden nicht gecacht (Backoff nach 429: `sources.route.hexdb.backoffMinutes`); dann gilt der Typ der Flugquelle und der naechste Takt fragt erneut. Abschalten mit `sources.aircraftType.hexdb.enabled: false`; im Mock-Modus wird hexdb nie gefragt. Jede Korrektur steht einmal als Logzeile `aircraft type corrected` (`hex`, `flightType`, `correctedType`, `source`) im Log.

```
npm run stats:types -- --db data/planesabove.db --days 30 [--json]   # Sichtungen je type_source plus Hex-Codes mit override/hexdb
```

## Lackierungs-Statistik

Welche Airlines fliegen ueber dem Haus, werden aber mit der Standard-Lackierung (weiss) gezeigt? Das beantwortet

```
npm run stats:liveries -- --db data/planesabove.db --days 30 [--json] [--standort <id|unbekannt|alle>]   # standardmaessig nur der Standort der neuesten Sichtung
```

Der Befehl liest die SQLite-Datei nur lesend (wie `stats:routes`). Ausgewertet werden gezeigte Sichtungen (`slot IS NOT NULL`) der letzten `--days` Tage; `light-aircraft` und `glider` zaehlen nicht (dort gibt es keine Lackierung). Ausgegeben werden:

- **Kopfzeile**: Anteil der Sichtungen mit vorhandener Lackierung.
- **Airlines mit Standard-Lackierung**: Name, Praefix, Anzahl, dazu die Typklassen (z. B. `Emirates UAE 7 (double-decker 4, widebody 3)`), absteigend.
- **Praefixe ohne Airline-Eintrag**: die Zeilen `kind = 'airline'` aus `unmapped_keys` (ueber alle Zeiten und Standorte, nicht fensterbezogen); auch diese fallen auf die Standard-Lackierung.
- **Sichtungen ohne Airline** (Rufzeichen ohne Praefix-Muster): eine Summenzeile.

Ob der Grund ein fehlendes Katalog-Design oder eine fehlende Zuordnung ist, weiss das Log nicht. `--json` liefert `standort`, `standorte`, `airlines`, `unmappedPrefixes`, `withoutAirline`, `presentShare`.

## Routen-Statistik

Welche Routenquelle liefert wie oft was? Das beantwortet

```
npm run stats:routes -- --db data/planesabove.db --days 7 [--json] [--standort <id|unbekannt|alle>]   # standardmaessig nur der Standort der neuesten Sichtung
```

Auf dem Heimserver (ZimaOS, ohne Node und ohne `scripts/` im Image) liefert der laufende Dienst dieselbe Auswertung als API: `http://<server>:8080/api/stats/routes?days=1&format=text` (ohne `format=text` als JSON; optional `&standort=<id|unbekannt|alle>`; ungueltige Parameter ergeben 400). Entsprechend `/api/stats/liveries`. Die Endpunkte lesen nur.

Der Befehl liest die SQLite-Datei nur lesend; es muss kein Dienst laufen. Ausgewertet werden nur gezeigte Sichtungen (`slot IS NOT NULL`) der letzten `--days` Tage. Ausgegeben werden Tabellen:

- **Je Tag und Quelle** (inkl. `none`): wie viele Sichtungen welche Routenquelle hatten, plus Anteil bekannter Routen.
- **Je Quelle**: Befunde `hit` / `unknown` / `unavailable` / `rejected` (Treffer, unbekannt, nicht erreichbar, am Plausibilitaets-Korridor abgelehnt).
- **Liste der Unbekannten**: Zeit, Rufzeichen, Airline, Typklasse der Sichtungen ohne Route.
- **Unbekannt-Anteil je Airline-Praefix** (Rufzeichen-Praefix).
- **Konflikte**: Sichtungen, bei denen zwei Quellen plausible, aber verschiedene Routen lieferten.

Mit `--json` erscheint dasselbe als ein JSON-Objekt mit den Top-Level-Schluesseln `days`, `sources`, `unknown`, `airlines`, `conflicts`.

**Lizenz.** Die Tabelle `route_lookups` speichert nur Befunde (Quelle, Ergebnis, Konflikt-/Gewaehlt-Flag), nie Flughafencodes oder Routentext von adsbdb/hexdb. Routentext der VRS standing-data (CC0) steht nur in `sightings.route` (ADR 0016).

**Zusammenfuehrung hexdb/VRS.** hexdb und VRS werden bei jedem Lookup beide gefragt (VRS ist ein lokaler Snapshot, kostet keine Anfrage); adsbdb nur, wenn beide nichts liefern (liefert eine der beiden nichts Plausibles, wird ihr Partner vor adsbdb gefragt, unabhaengig von der konfigurierten Reihenfolge). Ist die hexdb-Route ein Endstueck der VRS-Mehrleg-Route (gleiches Ziel, hexdb-Start ist ein Zwischenstopp, Legs-Reihenfolge stimmt, verglichen ueber ICAO-Codes), gewinnt die VRS-Route (z. B. UPS1: hexdb nur Sharjah → Koeln, VRS Hongkong → Sharjah → Koeln); das ist kein Konflikt, und der VRS-Routentext (CC0) darf persistiert werden. Widersprechen sich beide, bleibt die erste Quelle der Reihenfolge vorn und der Konflikt wird erfasst. `npm run why:route` nennt die Zusammenfuehrung.

**Konflikte** werden ausserdem erfasst, wenn `sources.route.compareAll: true` gesetzt ist (Default `false`): Dann werden alle Quellen inklusive adsbdb gefragt, was zusaetzliche Anfragen kostet. Ohne `compareAll` werden Konflikte nur zwischen hexdb und VRS erkannt.

## Betrieb auf dem Heimserver (ZimaOS) und iPad-Pruefung

Diese Schritte sind die Geraeteabnahme (`infrastructure-d3v7k`). Lokal (Entwicklungsrechner) sind Podman-Build und -Lauf beider Images, der Piper-Sidecar und Playwright WebKit bereits geprueft (Schritt 11); auf ZimaOS laeuft Docker Compose mit den GHCR-Images, ohne Build.

**Quellketten.** Flugquelle: adsb.fi, bei Ausfall adsb.lol (ADR 0019). Route: hexdb und VRS-Snapshot (beide immer), adsbdb nur wenn beide nichts liefern, FlightAware als letzte Quelle (ADR 0016, 0018, 0023). Details in den Abschnitten Flugquelle und Routenquelle.

1. **Konfiguration.** Ueber die ZimaOS-Dateien-App die Ordner `/DATA/AppData/planesabove/config` und `/DATA/AppData/planesabove/data` anlegen und `config.example.yaml` als `/DATA/AppData/planesabove/config/config.yaml` ablegen. Setzen: `location.lat/lon` (echter Standort), `place`, Port 8080, `dataDir: /data`, `speech.adapter: piper`, `speech.endpoint: http://tts:5000`. Radius bleibt 30 km. Die Datei wird nicht eingecheckt. Frischer Datenbestand: die lokale `data/planesabove.db` wird nicht uebernommen.
2. **Start.** In der ZimaOS-Oberflaeche „Eigene App installieren“ waehlen und den Inhalt von `docker-compose.zimaos.yml` importieren (nur GHCR-Images, kein Build, kein Profil, Piper-Sidecar und Watchtower sind dabei). Die Images kommen aus GHCR (`ghcr.io/hollesse/planesabove`, `ghcr.io/hollesse/planesabove-tts`); beide Pakete sind oeffentlich, ZimaOS braucht kein Login. Vorab auf ZimaOS (SSH) mit `docker version` die Engine-Version pruefen: Ab Docker Engine 29 (Mindest-API 1.44) scheitert das alte `containrrr/watchtower`; die Compose-Dateien nutzen deshalb den gepflegten Fork `nickfedor/watchtower`. Alternative per SSH mit der Entwicklungsdatei: `docker-compose.yml` auf den Server legen, dann `docker compose --profile tts pull && docker compose --profile tts up -d` (ohne `--profile tts` startet nur der Dienst; dann `speech.adapter: fake` oder keine Sprache). **Nach jedem Import oder Neu-Ausrollen in der ZimaOS-Oberflaeche** einmal im Terminal `docker pull ghcr.io/hollesse/planesabove:main && docker pull ghcr.io/hollesse/planesabove-tts:main` ausfuehren: ZimaOS holt die Images ohne `RepoDigests`, Watchtower ueberspringt dann den Digest-Vergleich (`empty RepoDigests - skipping digest comparison`) und aktualisiert nie. Pruefen: `docker image inspect ghcr.io/hollesse/planesabove:main --format '{{json .RepoDigests}}'` darf nicht `[]` sein. Bei Fehlstart: `docker compose logs planesabove` (JSON-Zeilen; ungueltige Konfiguration nennt alle Fehler auf einmal). Die Compose-Datei deklariert ein eigenes Netz `planesabove`, in dem sich `planesabove` und `tts` ueber ihre Namen erreichen; ohne dieses Netz legt der ZimaOS-Import die Container ins Docker-Default-Bridge (`172.17.0.x`), wo Container-Namen nicht aufgeloest werden und `http://tts:5000` scheitert. Pruefen: `docker inspect planesabove --format '{{json .NetworkSettings.Networks}}'` muss `planesabove` nennen, nicht nur `bridge`.
3. **Gesundheit.** `http://<server>:8080/healthz` zeigt `"status":"ok"` (`degraded` = Quelle/Client still, `failing` = HTTP 503). Container-Status: `docker ps` (healthy).
   **Veraltet-Regeln.** (1) Server: Die Szene gilt als veraltet (Kopfzeile „Letzter Stand“), wenn der letzte erfolgreiche Abruf der Flugquelle aelter ist als `health.flightMaxAgeSeconds` (Default 3 x `pollIntervalSeconds` = 90 s); dieselbe Schwelle laesst `/healthz` die Quelle als `degraded` melden. Einzelne Aussetzer darunter bleiben „Live“. (2) Client: kein erfolgreicher Poll des Dienstes seit `client.staleAfterMinutes` (Default 5 min).
4. **iPad.** Safari: `http://<server>:8080/` oeffnen, Teilen > Zum Home-Bildschirm. Einstellungen > Bedienungshilfen > Gefuehrter Zugriff an, Automatische Sperre auf Nie, iPad an Ladegeraet. Tippen auf ein Flugzeug oder seinen Text spricht eine deutsche Zeile; nach jedem Neuladen braucht das Audio wieder einen Tipp.
5. **Gegenpruefung (Kriterium 2).** Gleichzeitig einen oeffentlichen Tracker (z. B. die adsb.lol Karte) ueber dem Haus ansehen: gezeigt werden hoechstens die 2 naechsten, innerhalb von 60 s nach dem Laden.
6. **Sprachausgabe (Befund b).** Pruefen, ob `<audio>` per Tipp auf dem iPad deutsch abspielt (Piper-Sidecar). Der Adapter schickt `POST <speech.endpoint>/synthesize` mit `{text, voice}` (gegen den laufenden Piper-Server geprueft, ADR 0013); `speech.endpoint` ist die Basis-URL (`http://tts:5000`), `speech.voice` muss `de_DE-thorsten-medium` heissen (eine unbekannte Stimme nimmt der Server stillschweigend durch seine Standardstimme). Das Log zeigt je Synthese `speech synthesized` (`adapter`, `voice`, `durationMs`); bei Fehlern `speech synthesis failed`. Kein Ton und in den DevTools ein 503 auf `/audio/<key>.wav` (`audio unavailable`) heisst: die Synthese ist fehlgeschlagen. Diagnose auf dem Server: `docker logs planesabove 2>&1 | grep "speech synthesis failed" | tail -3` (errorClass `network` = Sidecar nicht erreichbar, meist Namensaufloesung, siehe Schritt 2; `timeout` = Piper antwortet nicht; `http-4xx` = Stimme abgelehnt), `docker exec planesabove getent hosts tts` (muss eine IP liefern) und `docker logs planesabove-tts` (Werkzeug loggt jeden `POST /synthesize`; fehlen diese Zeilen, kam nie ein Request an). Ein veroeffentlichter Port am `tts`-Container ist dafuer nicht noetig: Container im selben Netz erreichen sich direkt auf Port 5000; `ports:` wirkt nur Richtung Host und LAN.

**Sprachausgabe mit ElevenLabs (optional, kostenlos).** Standard bleibt Piper. Wem die Piper-Stimme nicht gefaellt, kann `speech.adapter: elevenlabs` setzen (ADR 0012); der Dienst nutzt dann den Free-Plan und faellt bei Bedarf still auf Piper zurueck:
1. Account auf elevenlabs.io anlegen (Free-Plan, keine Karte) und unter „API Keys“ einen Schluessel erzeugen. Den Schluessel nur als Umgebungsvariable `ELEVENLABS_API_KEY` setzen (ZimaOS: Umgebungsvariablen der App; die Compose-Datei reicht sie per `${ELEVENLABS_API_KEY:-}` durch). Nie in `config.yaml` oder eine eingecheckte Datei schreiben.
2. In `config.yaml`: `speech: { adapter: elevenlabs, voice: <voice_id> }`. `speech.voice` ist Pflicht, es gibt keinen Default. Bibliotheksstimmen (Voice Library) sind im Free-Plan per API gesperrt (HTTP 402 `paid_plan_required`): die gewuenschte Stimme zuerst ueber „Add to My Voices“ im ElevenLabs-Konto hinzufuegen und dann deren `voice_id` (unter „My Voices“ bzw. `GET /v1/voices`) eintragen. Modell `eleven_flash_v2_5`; Ausgabe `pcm_22050`, nur PCM wird akzeptiert. Der `tts`-Sidecar muss weiterlaufen, er ist der Fallback.
3. Budget: Der Free-Plan hat 10000 Credits pro Monat (1 Credit ungefaehr 1 Zeichen). `monthlyCharacterBudget` (Default 9000) ist die Obergrenze; der Zaehler liegt in SQLite (`speech_usage`), ueberlebt Neustarts und beginnt mit dem Kalendermonat (Zeitzone `TZ`) neu. Bei ca. 100 Zeichen pro Steckbrief sind das etwa 90 neue Ansagen im Monat; gleiche Texte kommen aus dem Cache. Nur gelieferte Audios (und ein Timeout nach gesendeter Anfrage) belasten den Zaehler, HTTP-Fehler nicht. Ist das Budget leer, das Kontingent erreicht (429), der Schluessel/Plan/die Stimme abgelehnt (401/402/403/404/422) oder fehlt der Schluessel, kommt das Audio von Piper (Log: `speech budget exhausted, falling back to piper` als `warn`, danach `info`); Fallback-Audio wird unter dem Piper-Schluessel abgelegt, nach Monatswechsel rendert wieder ElevenLabs.
4. Einmal pruefen, ob der Free-Plan API-Zugriff hat und wie die Credits gezaehlt werden: `curl -s -H "xi-api-key: $ELEVENLABS_API_KEY" https://api.elevenlabs.io/v1/user/subscription` (`character_count` / `character_limit`); Stimmen: `curl -s -H "xi-api-key: $ELEVENLABS_API_KEY" https://api.elevenlabs.io/v1/voices`.
   Konfigurationsfehler erscheinen mit Status und ElevenLabs-Meldung im Log, z. B. `ElevenLabs rejected the request (status=402 code=paid_plan_required message=Free users cannot use library voices via the API. ...); check speech.voice (a library voice must first be added to "My Voices"), the permissions of ELEVENLABS_API_KEY and the plan; using the fallback voice` (`warn`, bei jeder Anfrage); die folgende Fallback-Zeile `speech bad-config (ElevenLabs status=402 ...), falling back to piper` ist `info`.
5. Bedingungen des Free-Plans: nicht-kommerzielle Nutzung, Namensnennung („ElevenLabs“) erst bei Veroeffentlichung der Audios, fuer den privaten Haushalt nicht einschlaegig.
7. **Routen-Stichprobe (Befund c).** Eine Stunde laufen lassen, danach im Browser `http://<server>:8080/api/stats/routes?days=1&format=text` aufrufen (auf dem Heimserver der Weg ohne Node; mit `&standort=<id>` fuer den Live-Standort) oder auf dem Entwicklungsrechner `npm run stats:routes -- --db /DATA/AppData/planesabove/data/planesabove.db --days 1` (Anteil mit Route, je Quelle, Unbekannte, Konflikte; mit `--standort` fuer den Live-Standort; siehe Abschnitt Routen-Statistik).
8. **Befunde (a)-(c)** festhalten: iPad-Modell, iPadOS/Safari-Version; deutsche Sprache ueber Server-Audio ja/nein; Routenanteil.
9. **Update (automatisch).** Jeder Push auf `main` startet `.github/workflows/deploy.yml`: typecheck, Unit-Tests, Build und die Playwright-E2E-Tests (WebKit + Chromium) muessen gruen sein, erst dann werden die Images nach GHCR gepusht (Tags `main` und `sha-<commit>`; das Piper-Image nur bei Aenderung unter `docker/piper/`). Der Dienst `watchtower` im Compose prueft jede Minute (`WATCHTOWER_POLL_INTERVAL=60`), zieht neue Images und ersetzt nur Container mit dem Label `com.centurylinklabs.watchtower.enable=true`. Welcher Stand laeuft, zeigt `/healthz` -> `commit` (die volle Commit-SHA, die CI als Build-Arg ins Image legt; `dev` ohne CI-Build). `buildId` ist dagegen nur der Hash der Client-Dateien und wechselt nur bei Client-Aenderungen; ueber ihn laedt sich das iPad selbst neu, ein reiner Server- oder Doku-Push laedt es also nicht neu.
10. **Rollback.** In `docker-compose.zimaos.yml` (bzw. `docker-compose.yml`) das Tag `:main` des Dienstes durch ein altes `:sha-<commit>` ersetzen, `docker compose up -d`. Watchtower laesst feste SHA-Tags unveraendert, bis wieder `:main` eingetragen wird.
11. **Lokaler Build (Entwicklungsrechner, Podman).** `docker compose up -d --build` baut aus `build:` und taggt als `ghcr.io/hollesse/planesabove:main`; Watchtower dort nicht starten. Ohne Compose: `podman build -t planesabove-tts:local docker/piper`, `podman build -t planesabove:local .`, dann `podman run -d -p 5001:5000 planesabove-tts:local` und `podman run -d -p 8089:8080 -e CONFIG_PATH=/config/config.yaml -v ./config.yaml:/config/config.yaml:ro -v ./data:/data planesabove:local` (in der `config.yaml` `dataDir: /data`, `speech.adapter: piper`, `speech.endpoint: http://host.containers.internal:5001`). Das Dienst-Image installiert mit `npm ci --ignore-scripts`, weil npm 10 sonst better-sqlite3 per node-gyp bauen wollte (die mitgelieferte Prebuild genuegt).
