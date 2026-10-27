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
npm run e2e:chromium       # nur Chromium (WebKit laeuft in Containern ohne Systembibliotheken nicht)
npm run stats:routes -- --db data/planesabove.db --days 7 [--json]   # Routen-Statistik aus dem Sichtungsprotokoll (Quellen, Unbekannte, Konflikte)
```

### Mock-Modus und Szenarien

`mode: mock` + `scenario: scenarios/<name>.json` ersetzt Flug-, Routen- und TTS-Adapter durch Fakes (ADR 0004). Die Zeit steht still, bis `POST /mock/advance {"seconds":30}` sie vorrueckt (ein 30-s-Takt laeuft in Millisekunden); `GET /mock/sightings` listet die Sichtungen. Szenarien: `empty-sky`, `one-plane`, `two-planes`, `switch-during-narration`, `outage-recovery`. Ein Szenario ist eine zeitgeordnete Liste von Schritten (`at` in Sekunden) mit `planes` (Abstand/Peilung statt Koordinaten), `failure` (`http-403|http-429|http-5xx|timeout|network|parse|null`), `routes` und `tts` (`durationMs`, `failure`).

**Routenquelle.** Routen werden zuerst live bei [adsbdb](https://www.adsbdb.com/) abgefragt (`GET api.adsbdb.com/v0/callsign/{callsign}`, ohne Key). Nach den adsbdb-Bedingungen duerfen diese Daten nicht kopiert oder in andere Datenbanken uebernommen werden: Sie leben nur im Arbeitsspeicher-Cache und werden **nie persistiert** (Sichtungen speichern bei adsbdb-Treffern nur `route_source = 'adsbdb'`, keinen Routentext). Bei 429 pausiert adsbdb fuer `sources.route.adsbdb.backoffMinutes` (Default 5). Als Fallback (unbekannt, nicht erreichbar, 429, unplausible Route) dient der offline Snapshot der [VRS standing-data](https://github.com/vradarserver/standing-data) (Lizenz CC0-1.0): Der Dienst laedt `routes/` und `airports/` (~22 MB) nach `<dataDir>/vrs-standing-data/`, tauscht sie atomar aus und erneuert sie alle `sources.route.snapshotRefreshHours` (Default 24). Jede Route jeder Quelle muss den Plausibilitaets-Korridor bestehen, sonst bleibt es `Route unbekannt`. `sources.route.order` (Default `[adsbdb, vrs]`) legt die Reihenfolge fest.

**FlightAware AeroAPI (optional, kostenpflichtig, letzte Stufe).** Die freien Quellen kennen umgewidmete Flugnummern und Charterfluege oft nicht (Beispiele: LHX1HL, TKJ9GC, LAV8091). Optional kann deshalb als allerletzte Stufe [FlightAware AeroAPI](https://www.flightaware.com/aeroapi/) befragt werden. Das ist eine bewusste, begruendete Ausnahme von ADR 0001 (nur kostenlose, vertragsfreie Quellen), siehe ADR 0018.

- **Account und Key:** AeroAPI-Account (Personal-Tier, Kreditkarte noetig; bis zu 5 USD Guthaben im Monat, 0,005 USD je Ergebnissatz, also rund 1000 Abfragen). Der Key steht **nur** in der Umgebungsvariable `FLIGHTAWARE_API_KEY` (z. B. in der `.env` des Compose-Stacks), **nie** in `config.yaml`, und wird nie geloggt. Fehlt er, ist FlightAware deaktiviert (eine Warnung beim Start).
- **Aktivieren (Opt-in):** `flightaware` in `sources.route.order` aufnehmen, z. B. `order: [adsbdb, vrs, flightaware]`. FlightAware wird unabhaengig von der Position immer zuletzt gefragt, und nur wenn alle freien Quellen unbekannt, nicht erreichbar oder unplausibel waren.
- **Filter:** Gefragt wird nur bei Typklasse narrowbody, widebody, jumbo-hump oder double-decker **und** bekannter Airline (Praefix in der Airline-Tabelle). Privatflieger, Hubschrauber, Business-Jets, Turboprops, Regionaljets und unbekannte Praefixe loesen nie einen bezahlten Aufruf aus.
- **Budget:** Hartes Limit je Abrechnungszeitraum: `sources.route.flightaware.monthlyBudgetUsd` (Default 4.50) und `monthlyRequestCap` (Default 900). Jeder Aufruf wird als Ereignis in der Tabelle `flightaware_calls` protokolliert; der Verbrauch ist `max(eigene Summe, letzter Usage-Sync + eigene Aufrufe der letzten usageLagMinutes)`. Vor jeder bezahlten Abfrage muss `Schaetzung + 0,005 USD < Budget` gelten, sonst bleibt die Route bis zum Periodenende unbekannt (eine Warnung je Periode). Der Usage-Sync (`GET /account/usage`, kostenlos) laeuft beim Start (ohne erfolgreichen Sync keine bezahlte Abfrage) und alle `usageSyncMinutes` (max. 30). Der Abrechnungsbeginn ist `billingPeriodStartDay` (Default 1, UTC); nach der Anmeldung gegen das Portal pruefen.
- **Lizenz:** Laut Personal-Lizenz duerfen die Ergebnisse "for personal or academic purposes" gespeichert werden: FlightAware-Routen stehen mit Text und `route_source = 'flightaware'` in `sightings.route` (anders als adsbdb). Die Befunde je Quelle stehen wie ueblich in `route_lookups`.
- **Betreiber-Regel:** Der API-Key wird **nie ohne Freigabe** aus einer Claude-Session (oder einem anderen Agenten) benutzt; vor jedem Live-Aufruf wird die Anzahl der Requests genannt und freigegeben. Tests laufen vollstaendig offline gegen aufgezeichnete Fixtures (`tests/fixtures/flightaware/`).

**Flugquelle und Attribution.** Positionen kommen keyless von [adsb.fi](https://adsb.fi) (open data, `GET opendata.adsb.fi/api/v3/lat/{lat}/lon/{lon}/dist/{nm}`; nur persoenliche, nicht-kommerzielle Nutzung, 1 Request/s), bei Ausfall von den naechsten Quellen aus `sources.flight.order` (Default `[adsb-fi, adsb-lol]`; Namen ohne Adapter werden beim Start mit Warnung uebersprungen). Pro Takt wird die erste verfuegbare Quelle gefragt, bei Fehler sofort die naechste. Backoff je Quelle: bei 429 Pause bis `Retry-After` bzw. `x-ratelimit-reset`; bei adsb.fi jede 4xx-Antwort mindestens 60 s (4xx zaehlen dort zur IP-Sperre); sonst Circuit Breaker (3 Fehler in Folge: 30 s, verdoppelnd bis 5 min, mit Jitter). `/healthz` zeigt `flight.active` und den Zustand je Quelle, bei adsb-lol zusaetzlich `budget` (used/cap/remaining/resetsAt). adsb.lol hat ein persistiertes Tagesbudget (`sources.flight.adsbLol.dailyRequestCap`, Default 400 von 500 Requests je UTC-Tag; bei Erreichen wird die Quelle bis 00:00 UTC uebersprungen, auch nach Neustart; ein niedrigerer `x-ratelimit-remaining`-Header gewinnt, bei 429 gilt `x-ratelimit-reset` exakt). Attribution: Data: [adsb.fi](https://adsb.fi) (Failover: [adsb.lol](https://adsb.lol), ODbL 1.0).

Contract-Fixtures liegen in `tests/fixtures/` (`vrs/` ist eine aufgezeichnete Teilmenge der VRS standing-data vom 2026-10-27, Details in `vrs/README.txt`; `adsblol-point-frankfurt.json` ist eine echte Antwort vom 2026-10-27; `adsbfi-v3-point-oberweyer.json` ist eine echte adsb.fi-v3-Antwort vom 2026-10-27 (`/api/v3/lat/50.45/lon/8.09/dist/17`, keyless, 3 Flugzeuge); die uebrigen sind konstruiert, siehe Kommentare in den Tests).

## Routen-Statistik

Welche Routenquelle liefert wie oft was? Das beantwortet

```
npm run stats:routes -- --db data/planesabove.db --days 7 [--json]
```

Der Befehl liest die SQLite-Datei nur lesend; es muss kein Dienst laufen. Ausgewertet werden nur gezeigte Sichtungen (`slot IS NOT NULL`) der letzten `--days` Tage. Ausgegeben werden Tabellen:

- **Je Tag und Quelle** (inkl. `none`): wie viele Sichtungen welche Routenquelle hatten, plus Anteil bekannter Routen.
- **Je Quelle**: Befunde `hit` / `unknown` / `unavailable` / `rejected` (Treffer, unbekannt, nicht erreichbar, am Plausibilitaets-Korridor abgelehnt).
- **Liste der Unbekannten**: Zeit, Rufzeichen, Airline, Typklasse der Sichtungen ohne Route.
- **Unbekannt-Anteil je Airline-Praefix** (Rufzeichen-Praefix).
- **Konflikte**: Sichtungen, bei denen zwei Quellen plausible, aber verschiedene Routen lieferten.

Mit `--json` erscheint dasselbe als ein JSON-Objekt mit den Top-Level-Schluesseln `days`, `sources`, `unknown`, `airlines`, `conflicts`.

**Lizenz.** Die Tabelle `route_lookups` speichert nur Befunde (Quelle, Ergebnis, Konflikt-/Gewaehlt-Flag), nie Flughafencodes oder Routentext von adsbdb/hexdb. Routentext der VRS standing-data (CC0) steht nur in `sightings.route` (ADR 0016).

**Konflikte** werden nur erfasst, wenn `sources.route.compareAll: true` gesetzt ist (Default `false`): Dann werden alle Quellen gefragt, nicht nur bis zum ersten plausiblen Treffer, was zusaetzliche Anfragen kostet. Ohne `compareAll` ist die Konflikt-Tabelle leer.

## Betrieb auf dem Heimserver (ZimaOS) und iPad-Pruefung

Diese Schritte sind die Geraeteabnahme (`infrastructure-d3v7k`); in der Cloud-Umgebung wurde nur `docker compose config` geprueft.

1. **Konfiguration.** Auf dem Server `/DATA/AppData/planesabove/config/` und `/DATA/AppData/planesabove/data/` anlegen. `config.example.yaml` nach `/DATA/AppData/planesabove/config/config.yaml` kopieren, `location.lat/lon` (echter Standort), `place` und `dataDir: /data` setzen. Radius bleibt 30 km. Die Datei wird nicht eingecheckt.
2. **Start.** Repo auf den Server holen, dort `docker compose --profile tts up -d --build` (ohne `--profile tts` startet nur der Dienst; dann `speech.adapter: fake` oder keine Sprache). Alternativ `docker-compose.yml` in der ZimaOS-Oberflaeche als eigene App importieren. Bei Fehlstart: `docker compose logs planesabove` (JSON-Zeilen; ungueltige Konfiguration nennt alle Fehler auf einmal).
3. **Gesundheit.** `http://<server>:8080/healthz` zeigt `"status":"ok"` (`degraded` = Quelle/Client still, `failing` = HTTP 503). Container-Status: `docker ps` (healthy).
   **Veraltet-Regeln.** (1) Server: Die Szene gilt als veraltet (Kopfzeile „Letzter Stand“), wenn der letzte erfolgreiche Abruf der Flugquelle aelter ist als `health.flightMaxAgeSeconds` (Default 3 x `pollIntervalSeconds` = 90 s); dieselbe Schwelle laesst `/healthz` die Quelle als `degraded` melden. Einzelne Aussetzer darunter bleiben „Live“. (2) Client: kein erfolgreicher Poll des Dienstes seit `client.staleAfterMinutes` (Default 5 min).
4. **iPad.** Safari: `http://<server>:8080/` oeffnen, Teilen > Zum Home-Bildschirm. Einstellungen > Bedienungshilfen > Gefuehrter Zugriff an, Automatische Sperre auf Nie, iPad an Ladegeraet. Tippen auf ein Flugzeug oder seinen Text spricht eine deutsche Zeile; nach jedem Neuladen braucht das Audio wieder einen Tipp.
5. **Gegenpruefung (Kriterium 2).** Gleichzeitig einen oeffentlichen Tracker (z. B. die adsb.lol Karte) ueber dem Haus ansehen: gezeigt werden hoechstens die 2 naechsten, innerhalb von 60 s nach dem Laden.
6. **Sprachausgabe (Befund b).** Pruefen, ob `<audio>` per Tipp auf dem iPad deutsch abspielt (Piper-Sidecar). Wenn der Piper-Container nicht startet oder die Anfrage-Form abweicht (`docker/piper/Dockerfile` und `PiperSpeechSynthesizer` sind gegen Fixtures gebaut, nicht gegen einen laufenden Server), Fehler im Log (`speech synthesis failed`) und `speech.endpoint`/`speech.voice` anpassen.
7. **Routen-Stichprobe (Befund c).** Eine Stunde laufen lassen, danach `sqlite3 /DATA/AppData/planesabove/data/planesabove.db "select count(*), count(route) from sightings"` (Anteil mit Route).
8. **Befunde (a)-(c)** festhalten: iPad-Modell, iPadOS/Safari-Version; deutsche Sprache ueber Server-Audio ja/nein; Routenanteil.
9. **Update.** `git pull && docker compose up -d --build`; das iPad laedt sich ueber die neue `buildId` selbst neu.
