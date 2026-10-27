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

Ein Node/TypeScript-Dienst (`src/server/`, ein Modul je Bounded Context unter `modules/`) holt alle 30 s die Flugzeuge von adsb.lol, waehlt die zwei naechsten, schreibt Sichtungen nach SQLite und liefert `GET /api/state`, `GET /healthz`, `GET /audio/<key>.wav` sowie den Client. Der Client (`src/client/app/`, framework-frei, esbuild ES2020/Safari 16) setzt die Szene ausschliesslich aus den abgenommenen Komponenten in `src/client/ui/` zusammen.

```
npm run build              # dist/client (Kiosk-Client) + dist/server/server.mjs
cp config.example.yaml config.yaml   # Standort eintragen
CONFIG_PATH=./config.yaml npm start  # http://localhost:8080/
npm test                   # Unit- + Contract-Tests (Vitest, offline, ohne Netz)
npm run typecheck
npm run e2e                # baut Storybook + Dienst; Playwright WebKit + Chromium gegen den echten Dienst im Mock-Modus
npm run e2e:chromium       # nur Chromium (WebKit laeuft in Containern ohne Systembibliotheken nicht)
```

### Mock-Modus und Szenarien

`mode: mock` + `scenario: scenarios/<name>.json` ersetzt Flug-, Routen- und TTS-Adapter durch Fakes (ADR 0004). Die Zeit steht still, bis `POST /mock/advance {"seconds":30}` sie vorrueckt (ein 30-s-Takt laeuft in Millisekunden); `GET /mock/sightings` listet die Sichtungen. Szenarien: `empty-sky`, `one-plane`, `two-planes`, `switch-during-narration`, `outage-recovery`. Ein Szenario ist eine zeitgeordnete Liste von Schritten (`at` in Sekunden) mit `planes` (Abstand/Peilung statt Koordinaten), `failure` (`http-403|http-429|http-5xx|timeout|network|parse|null`), `routes` und `tts` (`durationMs`, `failure`).

**Routenquelle.** Routen kommen aus dem offline Snapshot der [VRS standing-data](https://github.com/vradarserver/standing-data) (Lizenz CC0-1.0, taeglich aktualisiert): Der Dienst laedt `routes/` und `airports/` (~22 MB) nach `<dataDir>/vrs-standing-data/`, tauscht sie atomar aus und erneuert sie alle `sources.route.snapshotRefreshHours` (Default 24). Abfragen laufen gegen einen Index im Speicher, ohne Netz. Luecken (z. B. EWG9UX) bleiben `Route unbekannt`; ohne Snapshot und ohne Netz startet der Dienst trotzdem und loggt `warn`. `sources.route.order` erlaubt nur `vrs` (Default) und optional `adsbdb` (Online-Lookup, noch nicht verdrahtet; wird mit `warn` ignoriert).

Contract-Fixtures liegen in `tests/fixtures/` (`vrs/` ist eine aufgezeichnete Teilmenge der VRS standing-data vom 2026-10-27, Details in `vrs/README.txt`; `adsblol-point-frankfurt.json` ist eine echte Antwort vom 2026-10-27; die uebrigen sind konstruiert, siehe Kommentare in den Tests).

## Betrieb auf dem Heimserver (ZimaOS) und iPad-Pruefung

Diese Schritte sind die Geraeteabnahme (`infrastructure-d3v7k`); in der Cloud-Umgebung wurde nur `docker compose config` geprueft.

1. **Konfiguration.** Auf dem Server `/DATA/AppData/planesabove/config/` und `/DATA/AppData/planesabove/data/` anlegen. `config.example.yaml` nach `/DATA/AppData/planesabove/config/config.yaml` kopieren, `location.lat/lon` (echter Standort), `place` und `dataDir: /data` setzen. Radius bleibt 30 km. Die Datei wird nicht eingecheckt.
2. **Start.** Repo auf den Server holen, dort `docker compose --profile tts up -d --build` (ohne `--profile tts` startet nur der Dienst; dann `speech.adapter: fake` oder keine Sprache). Alternativ `docker-compose.yml` in der ZimaOS-Oberflaeche als eigene App importieren. Bei Fehlstart: `docker compose logs planesabove` (JSON-Zeilen; ungueltige Konfiguration nennt alle Fehler auf einmal).
3. **Gesundheit.** `http://<server>:8080/healthz` zeigt `"status":"ok"` (`degraded` = Quelle/Client still, `failing` = HTTP 503). Container-Status: `docker ps` (healthy).
   **Veraltet-Regeln.** (1) Server: Die Szene gilt als veraltet (Kopfzeile „Letzter Stand“), wenn der letzte erfolgreiche Abruf der Flugquelle aelter ist als `health.flightMaxAgeSeconds` (Default 3 x `pollIntervalSeconds` = 90 s); dieselbe Schwelle laesst `/healthz` die Quelle als `degraded` melden. Einzelne Aussetzer darunter bleiben „Live“. (2) Client: kein erfolgreicher Poll des Dienstes seit `client.staleAfterMinutes` (Default 5 min).
4. **iPad.** Safari: `http://<server>:8080/` oeffnen, Teilen > Zum Home-Bildschirm. Einstellungen > Bedienungshilfen > Gefuehrter Zugriff an, Automatische Sperre auf Nie, iPad an Ladegeraet. Tippen auf ein Flugzeug oder seinen Text spricht eine deutsche Zeile; nach jedem Neuladen braucht das Audio wieder einen Tipp.
5. **Gegenpruefung (Kriterium 2).** Gleichzeitig einen oeffentlichen Tracker (z. B. adsb.lol oder airplanes.live Karte) ueber dem Haus ansehen: gezeigt werden hoechstens die 2 naechsten, innerhalb von 60 s nach dem Laden.
6. **Sprachausgabe (Befund b).** Pruefen, ob `<audio>` per Tipp auf dem iPad deutsch abspielt (Piper-Sidecar). Wenn der Piper-Container nicht startet oder die Anfrage-Form abweicht (`docker/piper/Dockerfile` und `PiperSpeechSynthesizer` sind gegen Fixtures gebaut, nicht gegen einen laufenden Server), Fehler im Log (`speech synthesis failed`) und `speech.endpoint`/`speech.voice` anpassen.
7. **Routen-Stichprobe (Befund c).** Eine Stunde laufen lassen, danach `sqlite3 /DATA/AppData/planesabove/data/planesabove.db "select count(*), count(route) from sightings"` (Anteil mit Route).
8. **Befunde (a)-(c)** festhalten: iPad-Modell, iPadOS/Safari-Version; deutsche Sprache ueber Server-Audio ja/nein; Routenanteil.
9. **Update.** `git pull && docker compose up -d --build`; das iPad laedt sich ueber die neue `buildId` selbst neu.
