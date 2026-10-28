# Infrastructure

## Purpose
Owns **globally-true** technical concerns: runtime, iPad/Heimserver-Aufteilung, Kiosk-Dauerbetrieb, Deployment, Konfiguration (Standort, Radius), Secrets, Beobachtbarkeit, gemeinsame Transportwege. BC-local infra (a BC's own adapters, its own persistence) stays inside the originating BC.

## Classification
generic

## Actors
- **Papa** — Betreiber.

## Ubiquitous language
- **iPad** — altes iPad im Kinderzimmer; Anzeige im Vollbild mit Geführtem Zugriff (Kiosk-Ersatz).
- **Heimserver** — Lenovo ThinkCentre mit ZimaOS, läuft durchgehend; betreibt Apps als Docker-Container.
- **Konfiguration** — Standort, Radius und Betriebsparameter, nur für den Betreiber.
- **Kiosk-Modus** — Vollbild-Dauerbetrieb ohne Bedienoberfläche des Geräts.
- **Zustandsdienst** — der eine Node.js/TypeScript-Dienst im Docker-Container auf dem Heimserver; pollt, reichert an, wählt aus, speichert das Sichtungslog und liefert `GET /api/state` plus den statischen Client (ADR 0004).
- **Dünner Client** — das Framework-freie HTML/CSS/JS auf dem iPad; pollt nur `/api/state`, ruft nie externe APIs, speichert nichts, hält die Vorlese-Sperre lokal.
- **Browser-Baseline** — iPadOS 16 / Safari 16; Build-Ziel ES2020 (esbuild), Container Queries und `aspect-ratio` verfügbar.
- **Mock-Modus** — Startmodus des Dienstes (`mode: mock` + `scenario`), in dem Flug-, Routen-, Wetter- und TTS-Adapter durch Szenario-Dateien gespeist werden (ADR 0003/0004); die Zeit steht still, bis `POST /mock/advance` sie vorrückt (nur für Tests/E2E, in `live` nicht erreichbar).
- **Datendatei** — die eine SQLite-Datei (WAL) auf dem gemounteten Datenvolume; enthält Sichtungslog und verwerfbare Caches; Backup = Datei kopieren (ADR 0007).
- **Konfigurationsdatei** — die eine `config.yaml`, beim Start per Schema validiert (fail fast mit lesbarer Meldung); Änderung = Datei bearbeiten + Neustart; Geheimnisse stehen nur in Umgebungsvariablen (ADR 0007).
- **Verwerfbarer Cache** — Routen-/Wetter-Cache mit TTL in der Datendatei; darf jederzeit gelöscht werden; adsbdb-Daten werden nie dort abgelegt (ADR 0005/0007).
- **Compose-App** — two Compose files. `docker-compose.zimaos.yml` is imported through the ZimaOS UI ("Eigene App installieren"): GHCR images only, no `build:`, no profiles, `planesabove` + `tts` (always on) + the maintained `nickfedor/watchtower` fork, no storybook. `docker-compose.yml` is for the dev machine / SSH route: `build:`, with `tts` and `storybook` behind Compose profiles. Data and config live in host volumes under `/DATA/AppData/planesabove` (ADR 0008, ADR 0025).
- **Selbstheilung (client)** — the client's recovery behaviour: retry with backoff, keep the last good scene, show a subtle stale indicator after N minutes, and fully reload nightly (~04:00), on `buildId` change, on `online`, and on returning to visible (ADR 0008).
- **Einrichtung (iPad)** — the documented one-off manual iPad setup: home-screen web app, Guided Access, Auto-Lock Never, permanently on charge, automatic iPadOS updates off. After an iPad reboot, Guided Access must be re-entered by hand (ADR 0008).
- **Gesundheitsstatus (health status)** — result of `GET /healthz`: `ok`, `degraded` (a source, the client or an age threshold is stale; HTTP 200) or `failing` (database not writable or scheduler stalled; HTTP 503). Per-source last-success ages, last client poll, DB writability and `buildId`. Calls no external API (ADR 0011, builds on ADR 0008).
- **Heartbeat (dead-man's-switch)** — the service pings an off-box URL (`HEARTBEAT_URL`, env only) every few minutes only while status is `ok`; missing pings make the external service notify the builder's phone. Optional; absent URL disables it (ADR 0011).
- **Client-Stille** — no `/api/state` request for N minutes (default 10); counts as `degraded` because the iPad is probably dead or unplugged (ADR 0011).
- **Stale-but-serving** — a failing source degrades the scene (stale marker, "Zuletzt ...") but never blanks it; only the health status and heartbeat reflect the failure (ADR 0011).
- **Strukturiertes Log** — JSON lines on stdout (`ts`, `level`, `msg`, `source`, `durationMs`, `errorClass`); errors logged on state transitions, never secrets; Docker json-file rotation (ADR 0011).
- **Szenario** — JSON-Datei in `scenarios/`: zeitgeordnete Schritte (`at` in Sekunden) mit Flugzeugen (Abstand/Peilung), Quellenausfall, Routen und TTS-Dauer/-Fehler.
- **Takt** — ein Abfragezyklus des Dienstes (Default 30 s): Quelle abfragen, Auswahl bilden, Routen anreichern, Sichtungen schreiben. Eine ausgefallene Quelle behält die letzte gute Szene und markiert sie als stale.
- **buildId** — Inhalts-Hash des Client-Bundles; ändert er sich, lädt sich der iPad-Client beim nächsten Poll selbst neu (aufgeschoben, solange vorgelesen wird).

## Aggregates
_Noch nicht modelliert — entsteht in `modeling` / bei der Arbeit an Tasks._

## Key events
_Noch offen._

## Key commands
_Noch offen._
- **Entwickler-Befehle** — `npm test` (Unit + Contract, offline), `npm run typecheck`, `npm run build` (dist/client + dist/server), `npm start` (mit `CONFIG_PATH`), `npm run e2e` / `npm run e2e:chromium` (Playwright gegen den echten Dienst im Mock-Modus; WebKit ist Pflichtziel und lokal grün: `npx playwright install webkit && npx playwright test --project=webkit`; nur in Cloud-Containern ohne Systembibliotheken startet es nicht). Details und Betriebsanleitung: Root-`README.md`.

## Relationships with other contexts
- Supports every BC.
See `../../context-map.md`.

## Open questions
_Siehe `../../vision.md` → Open questions._
- ~~Piper-HTTP-Anfrageform, Voice-Name und Pip-Extras ungeprüft~~ — geklärt in infrastructure-d3v7k (ADR 0024): `POST <endpoint>/synthesize` mit `{text, voice}` → WAV, Voice `de_DE-thorsten-medium`, Extra `piper-tts[http]`, gegen den laufenden Container geprüft.
- adsb.lol `routeset`: ein Live-Test lieferte HTTP 201 mit leerem Body (→ Route unbekannt); das Antwortschema ist weiter unverifiziert. Bevorzugte Routenquelle bleibt VRS standing-data (Folge-Task).
