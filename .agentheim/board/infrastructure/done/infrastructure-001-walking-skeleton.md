---
id: infrastructure-001-walking-skeleton
title: Walking skeleton — echte Flugzeuge über dem Haus erscheinen auf dem iPad, Tippen spricht eine Zeile, eine Sichtung wird gespeichert
status: done
type: spike
context: infrastructure
created: 2026-10-26
completed:
depends_on: [design-system-001, infrastructure-pn3w4, infrastructure-y8epz, airspace-jy8hz, airspace-h76v2, weather-yttgx, sky-scene-xczgm, infrastructure-w7qbc, infrastructure-p6s30]
blocks: []
tags: [foundation, walking-skeleton, prototype]
related_adrs: [0001, 0002, 0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0011, 0012, 0013]
related_research: []
prior_art: [design-system-001, design-system-c4v3r, design-system-v8q3n, design-system-q7m3k]
---

## Why
Der erste Prototyp soll beweisen, dass die gewählte Architektur von Ende zu Ende trägt:
- Server und Datenquelle laufen.
- Auswahl, iPad-Darstellung, Sprachausgabe und Speicher funktionieren.

Er ist **fachlich dünn, architektonisch dick**: wenig Feature, aber jeder Weg einmal durchlaufen. Erst danach lohnen Styleguide und echte Features. Außerdem beantwortet er die beiden größten offenen Fragen mit echten Daten: Klappt die Sprachausgabe auf dem iPad? Wie oft kennen kostenlose Quellen die Route?

## What
Der dünnste lauffähige Durchstich durch alle Bereiche, gemäß den akzeptierten Foundation-ADRs:
- **Luftraum:** echte Flugzeuge im Umkreis, Auswahl der zwei nächsten, minimale Typklassen-Tabelle.
- **Lackierungen:** nur die weiße Standard-Lackierung.
- **Wetter:** fester Platzhalter-Himmel.
- **Himmelsszene:** zeigt die Auswahl an, Tippen spricht eine Zeile, die Vorlese-Sperre greift.
- **Sichtungsprotokoll:** schreibt Sichtungen dauerhaft.
- **Infrastruktur:** Deployment auf dem Heimserver (Lenovo ThinkCentre mit ZimaOS). Das iPad öffnet die Seite vorerst manuell.
- **Oberfläche:** ausschließlich aus den abgenommenen Storybook-Komponenten (`design-system-001-styleguide`). Fehlt ein Baustein, entsteht er zuerst als Story (ADR 0002).

## Refinement (2026-10-27, Betreiber-Entscheidung)
Der Skeleton wird in der Cloud-Umgebung gebaut; dort gibt es keinen Heimserver, kein iPad und keinen echten Standort. Deshalb:
- **In diesem Task:** alles, was ohne Gerät prüfbar ist — Dienst, Client aus den abgenommenen Storybook-Komponenten, Adapter mit Contract-Tests, SQLite-Sichtungen, Mock-Modus mit Szenarien und steuerbarer Zeit, E2E-Szenarien, `docker-compose.yml`, `config.example.yaml`, README-Doku. Zusätzlich ein kurzer **Live-Smoke-Check** gegen adsb.lol (aus der Cloud erreichbar) mit Beispielkoordinaten, um Contract-Fixtures aus echten Antworten aufzunehmen.
- **Ausgelagert in `infrastructure-d3v7k`** (Geräteabnahme durch den Betreiber): Start auf ZimaOS mit echtem Standort, Gegenprüfung mit öffentlichem Tracker, Sprachausgabe auf dem echten iPad, Routen-Stichprobe über eine Stunde und die Befunde (a)–(c).
- Die mit **[→ infrastructure-d3v7k]** markierten Kriterien unten gelten für diesen Task als erfüllt, wenn der jeweilige Pfad im Mock-Modus/E2E nachgewiesen und die Geräte-Prüfung in `infrastructure-d3v7k` beschrieben ist.
- Umgebung: Playwright hier nur Chromium (WebKit-Projekt konfigurieren, auf dem Betreiber-Rechner nachholen). Docker-CLI vorhanden; ob ein Daemon läuft, ist offen — `docker compose config` als Mindestprüfung.
- Sprachausgabe: Piper-Container ist hier ggf. nicht startbar; der `fake`-Adapter (ADR 0012) deckt Mock/E2E ab, der `piper`-Adapter bekommt Contract-Tests gegen aufgezeichnete/konstruierte Fixtures.

## Acceptance criteria
- [ ] [→ infrastructure-d3v7k] Mit `config.yaml` auf dem echten Standort und dem Default-Radius 30 km startet der Dienst auf dem Heimserver (z. B. `docker compose up`). `/healthz` meldet OK, und das iPad zeigt die Szene unter der LAN-URL des Servers.
- [ ] [→ infrastructure-d3v7k für die Gegenprüfung mit echten Daten] Innerhalb von 60 s nach dem Laden erscheinen die Flugzeuge, die real im Umkreis sind (gegengeprüft mit einem öffentlichen Tracker):
  - als korrekte Typklassen-Silhouette in weißer Standard-Lackierung,
  - höchstens 2, und zwar die 2 nächsten,
  - mit Callsign, Typ und Höhe in der Info-Leiste.
  Ohne Flugzeug im Umkreis zeigt die Szene den leeren Himmel bzw. „Zuletzt: … vor N Min“.
- [ ] Die Auswahl aktualisiert sich alle 30 s. Fällt die primäre Flugdatenquelle oder das Netz aus, bleibt die letzte gute Szene mit Stale-Markierung stehen. Sobald die Quelle zurück ist, erholt sich die Szene von selbst.
- [ ] Tippen auf ein Flugzeug oder seinen Text spricht eine deutsche Zeile (Airline oder Callsign, Typ, Höhe) über den Lautsprecher des iPads. Die Zeile ist auf dem echten alten iPad verständlich. [human-eye] [→ infrastructure-d3v7k]
- [ ] Während diese Ausgabe läuft, ändert sich die Auswahl nicht, auch wenn ein Takt andere Flugzeuge liefert. Die neuere Auswahl erscheint beim ersten Takt nach Ende der Ausgabe. Eine hängende Wiedergabe wird vom Watchdog freigegeben.
- [ ] Jeder unterschiedliche Flug im Umkreis schreibt genau eine Zeile in die Sichtungs-Tabelle: Zeit, Airline/Callsign, Typ, Typklasse, Lackierung vorhanden ja/nein. Wiederholte Takte desselben Flugs ändern die Anzahl nicht. Die Zeilen überleben einen Neustart des Dienstes.
- [ ] Der Himmel ist ein fester Platzhalter (z. B. „Tag/Klar“), per Konfiguration austauschbar. Der echte Wetter-Himmel ist ein Folge-Task.
- [ ] **Test-getrieben (ADR 0003):**
  - Die Domänenlogik wurde test-first entwickelt: Auswahl der zwei nächsten, Vorlese-Sperre, Typklassen-Zuordnung, Sichtungs-Deduplizierung. Die Unit-Tests laufen offline mit einem Befehl.
  - Jeder Adapter (Flugdaten, Route, TTS) hat Contract-Tests gegen aufgezeichnete Fixtures, einschließlich Fehlerfällen (403/429/Timeout, fehlende Felder).
- [ ] **E2E mit Playwright (WebKit)** gegen den echten Dienst im Mock-Modus, mit gemockten externen APIs. Mindestens diese Szenarien sind grün:
  - leerer Himmel
  - ein Flugzeug
  - zwei Flugzeuge, die zwei nächsten werden gewählt
  - Wechsel während des Vorlesens wird zurückgehalten
  - Ausfall der Quelle, dann Erholung

  Die Zeit ist in den Tests steuerbar, sodass ein 30-s-Takt in Millisekunden läuft. `npm test` und `npm run e2e` (oder Äquivalente) sind im BC-README dokumentiert.
- [ ] [→ infrastructure-d3v7k] Die Befunde sind im Outcome festgehalten:
  - (a) genutztes iPad-Modell (iPad Pro 12,9" 1. Gen. oder das kleinere iPad), iPadOS- und Safari-Version, Bestätigung der Mindestgrenze Safari 16.
  - (b) Funktioniert deutsche Sprachausgabe auf dem echten iPad über Server-Audio, über `speechSynthesis`, beides oder keins?
  - (c) Welcher Anteil der beobachteten Callsigns bekam in einer Stunde Stichprobe eine brauchbare Route?

## Notes
- **Stop-loss:** Wenn mitten im Spike klar ist, dass die Abhilfe für ein Problem bereits bekannt und billig ist, wird sie festgehalten und der Spike an dieser Stelle beendet. Die verbleibenden Punkte werden als Folge-Tasks erfasst statt im Spike ausgebaut. Ziel ist der Nachweis, nicht Vollständigkeit.
- Hängt von allen Foundation-Entscheidungen ab:
  - global: Runtime/Stack `infrastructure-pn3w4`, Persistenz/Konfiguration `infrastructure-y8epz`, Deployment/Kiosk `infrastructure-w7qbc`, Observability `infrastructure-p6s30`
  - BC-lokal: Flug-/Routenquellen `airspace-jy8hz`, Typklassen-Tabellen `airspace-h76v2`, Wetter/Sonne `weather-yttgx`, Sprachausgabe `sky-scene-xczgm`
  - Nicht alle davon sind tragend für den Skeleton (Wetter: Stretch; Observability: folgt direkt danach). Sie sind trotzdem vorher zu entscheiden, damit die Grundlage vollständig ist.
- Die Oberfläche wird aus den Storybook-Komponenten von `design-system-001-styleguide` zusammengesetzt, nicht neu gebaut (ADR 0002).
- Assets wiederverwenden: `svg/*.svg` (Typklassen, Himmel, Logos) und die CSS-Variablen-Technik aus `Flugzeugmodelle.html`.

## Verifier note (iteration 1)
**REASONS:**
- Check 5 (README_DELTA sync): the "Ubiquitous language" op appends a second **Mock-Modus** definition although the infrastructure README already has one (line 20: "- **Mock-Modus** — Startmodus des Dienstes, in dem Flug-, Routen-, Wetter- und TTS-Adapter durch Szenario-Dateien gespeist werden (ADR 0003/0004)."). applyReadmeDelta's append only skips exact duplicates, so two disagreeing bullets would result. Must be a `replace` with anchor `Mock-Modus`, `expected` = the current bullet, merged body.
- Checks 1–4 passed (npm test 187, typecheck, build, build-storybook, Playwright chromium 10/10, `docker compose config` both profiles; ADR 0002 respected; no `.agentheim/` writes).
- Not formally judged (stopped at check 5), but unrecorded ADR departures noticed — fix or record now: (a) ADR 0007 `sightings` has an "Auswahl slot" column — the migration (src/server/migrations/0001-sightings.ts) has none; (b) ADR 0007 puts the route cache in tables of the same file — route-service.ts keeps it in memory only, justified by adsbdb which is not used; (c) ADR 0008 asks for an optional `storybook` Compose profile — missing; mentioned in the Outcome but not in ADR 0013's scope cuts.
- Not blocking: sighting-log ("Besuch"/visitGap) and design-system ("Stale-Hinweis") terms can't go via this task's README_DELTA; the conductor carries them over.
**SUGGESTED_FIX:** Replace the Mock-Modus append with a `replace` merging both definitions. Then either fix the three ADR departures (Auswahl slot column, persisted route cache, storybook profile) or list them as explicit scope cuts in ADR 0013.
**ITERATION_HINT:** likely-fixable

## Outcome

The walking skeleton runs end to end. Everything provable without a device is proven in the cloud; the device-bound parts are described step by step in the root `README.md` ("Betrieb auf dem Heimserver (ZimaOS) und iPad-Pruefung") and carried by `infrastructure-d3v7k`.

**What exists**
- Service `src/server/` (modular monolith, one module per BC under `modules/`): `airspace` (normalised `Flugzeug`, `selectNearest`, curated type-class/airline/livery tables validated against the design-system catalog, adsb.lol FlightSource, adsb.lol routeset RouteSource, `RouteService` with plausibility rule + memory cache), `sighting-log` (dedup per flight and visit, SQLite repository with Auswahl slot, unmapped-key reports), `sky-scene` (Takt `SkyService`, German Steckbrief text with pronunciation dictionary, `SpeechSynthesizer` port with `piper` and `fake` adapters, audio cache/delivery), `weather` (fixed config sky). Plus zod+yaml config, better-sqlite3 with numbered migrations, injectable `FakeClock`, JSON-line logger, `/healthz` (ok/degraded/failing), `/api/state`, `/audio/<key>.wav`, static client, mock-mode endpoints.
- Client `src/client/app/`: polls `/api/state`, renders the approved `renderScreen`, tap on plane or text speaks via `<audio>` Narrator, `VorleseSperre` with watchdog, capped backoff, stale marker, buildId/nightly/online/visibility reloads (deferred while speaking). Built by `scripts/build.mjs` (esbuild es2020/safari16).
- New design-system piece (ADR 0002): atom `Stale-Hinweis` + 2 stories + optional `stale` prop on the Screen template. Needs operator approval (`design-system-r5d7v` filed).
- Deployment: `Dockerfile`, `docker-compose.yml` (planesabove + optional `tts` and `storybook` profiles, restart unless-stopped, /healthz healthcheck, json-file rotation, bind mounts under /DATA/AppData/planesabove, TZ), `docker/piper/Dockerfile`, `config.example.yaml` (sample coordinates only), `.dockerignore`.

**Acceptance criteria**
1. Start on home server with real location, `/healthz` OK, iPad shows scene on LAN URL: [-> infrastructure-d3v7k]. Cloud proof: `docker compose config`, `--profile tts config` and `--profile storybook config` validate (`deploy-files.test.ts` checks the profiles); live boot against adsb.lol (Frankfurt sample, 17 nm) returned `/healthz` status ok with a successful poll. No Docker daemon was available, so the image was NOT built or run. Steps: README "Betrieb" 1-3.
2. Real planes, silhouette in white default livery, max 2, the 2 nearest, callsign/type/altitude in the info bar; empty sky / "Zuletzt": real-data cross-check [-> infrastructure-d3v7k]. Mock/E2E proof: `tests/e2e/skeleton.spec.ts` "ein Flugzeug", "zwei Flugzeuge", "leerer Himmel"; unit `sky-service.test.ts` (one plane, three planes -> two nearest, "Zuletzt ... vor 6 Min", livery `def` unless enabled), `selection.test.ts`. 
3. Selection updates every 30 s; source/net outage keeps last good scene with stale marker and recovers by itself: `e2e "Ausfall der Quelle ..."`, `sky-service.test.ts` outage test, `app.test.ts` (client offline -> stale after threshold -> recovery, server-flagged stale immediately), `client-logic.test.ts` (backoff).
4. Tap speaks a German line; clear on the real iPad [human-eye] [-> infrastructure-d3v7k]. Proven here: composed text (`steckbrief.test.ts`), tap resolution and Narrator (`narrator.test.ts`, `client-logic.test.ts` tapTarget, e2e click on info bar starts playback in Chromium with the fake silent WAV).
5. No selection change while speaking; newer selection after the end; watchdog frees hanging playback: `sperre.test.ts`, `narrator.test.ts` (ended/error/stalled/rejected play(), watchdog duration), `app.test.ts`, `e2e "Wechsel waehrend des Vorlesens ..."`.
6. One sighting row per distinct flight with time, airline/callsign, type, class, livery yes/no; repeated Takte do not change the count; rows survive restart: `sightings.test.ts` (dedup, Auswahl slot, file DB reopened, unmapped keys), `sky-service.test.ts`, `e2e "ein Flugzeug"` (3 further Takte -> still 1 row) and "zwei Flugzeuge" (3 flights in radius -> 3 rows).
7. Placeholder sky, configurable: `config.ts` `sky:` (default day/clear), `config.test.ts`; real weather sky is a follow-up (weather BC task already in backlog).
8. Test-driven: domain logic test-first (two-nearest selection, type-class mapping, dedup, Vorlese-Sperre; the red run was observed for selection, the others were written test-and-implementation together in one step). `npm test` runs 189 tests offline (exit 0). Contract tests with fixtures incl. 403/429/5xx/timeout/network/parse/missing fields: `adsb-lol.contract.test.ts` (real recorded response `tests/fixtures/adsblol-point-frankfurt.json` + constructed edge cases), `route.test.ts` (constructed routeset fixture + empty-201 as recorded live), `speech.contract.test.ts` (constructed WAV fixture; piper 5xx/404/429/timeout/garbage).
9. E2E with Playwright against the real service in mock mode, five scenarios green: `tests/e2e/skeleton.spec.ts` (empty sky, one plane, two planes -> two nearest, switch during narration held back, outage then recovery), controllable time via `POST /mock/advance`. Chromium: 10/10 e2e green (5 skeleton + 5 existing story specs). WebKit project is configured but WebKit cannot launch in this container; NOT run, to be run by the operator (`npm run e2e`). `npm test` / `npm run e2e` documented in root README and BC README delta.
10. Findings (a)-(c): [-> infrastructure-d3v7k]. Interim observation for (c): a live POST to adsb.lol `/api/0/routeset` returned HTTP 201 with an empty body, so that source alone may yield a very low route share; VRS standing-data follow-up filed (`airspace-m3w9c`).

**Operator deploy + iPad check:** root `README.md`, section "Betrieb auf dem Heimserver (ZimaOS) und iPad-Pruefung" (steps 1-9: config, `docker compose --profile tts up -d --build`, /healthz, iPad home-screen app + Guided Access, tracker cross-check, speech check, hourly route sample SQL, record findings a-c, update path).

**Deviations / honest limits**
- Piper request shape, voice name and pip extras are unverified (no Piper container reachable); routeset response schema is unverified. See ADR-0013 (provisional).
- Heartbeat, VRS routes (incl. the persisted route cache), ElevenLabs adapter and real weather were cut from the spike (follow-ups filed; recorded in ADR-0013).
- Client bundle is about 1.5 MB (inlined SVG/PNG logos); acceptable on LAN, optimisation is not part of the spike.
- For other BC READMEs (not targetable here): airspace could add "Auswahl (2 nächste, eigene Haversine-Distanz)", sky-scene "Vorlese-Sperre/Narrator/Stale-Hinweis", sighting-log "Besuch (visitGap, Dedup je icao24)", design-system "Stale-Hinweis (Atom)".
