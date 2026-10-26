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
