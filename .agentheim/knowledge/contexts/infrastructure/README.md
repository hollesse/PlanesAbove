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
- **Mock-Modus** — Startmodus des Dienstes, in dem Flug-, Routen-, Wetter- und TTS-Adapter durch Szenario-Dateien gespeist werden (ADR 0003/0004).
- **Datendatei** — die eine SQLite-Datei (WAL) auf dem gemounteten Datenvolume; enthält Sichtungslog und verwerfbare Caches; Backup = Datei kopieren (ADR 0007).
- **Konfigurationsdatei** — die eine `config.yaml`, beim Start per Schema validiert (fail fast mit lesbarer Meldung); Änderung = Datei bearbeiten + Neustart; Geheimnisse stehen nur in Umgebungsvariablen (ADR 0007).
- **Verwerfbarer Cache** — Routen-/Wetter-Cache mit TTL in der Datendatei; darf jederzeit gelöscht werden; adsbdb-Daten werden nie dort abgelegt (ADR 0005/0007).
- **Compose-App** — the `docker-compose.yml` that ZimaOS installs as a custom app: the `planesabove` service, plus optional sidecars (`tts`, `storybook`) behind Compose profiles. Data and config live in host volumes under `/DATA/AppData/planesabove` (ADR 0008).
- **Selbstheilung (client)** — the client's recovery behaviour: retry with backoff, keep the last good scene, show a subtle stale indicator after N minutes, and fully reload nightly (~04:00), on `buildId` change, on `online`, and on returning to visible (ADR 0008).
- **Einrichtung (iPad)** — the documented one-off manual iPad setup: home-screen web app, Guided Access, Auto-Lock Never, permanently on charge, automatic iPadOS updates off. After an iPad reboot, Guided Access must be re-entered by hand (ADR 0008).

## Aggregates
_Noch nicht modelliert — entsteht in `modeling` / bei der Arbeit an Tasks._

## Key events
_Noch offen._

## Key commands
_Noch offen._

## Relationships with other contexts
- Supports every BC.
See `../../context-map.md`.

## Open questions
_Siehe `../../vision.md` → Open questions._
