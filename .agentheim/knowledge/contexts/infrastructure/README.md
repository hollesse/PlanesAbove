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
