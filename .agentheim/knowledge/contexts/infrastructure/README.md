# Infrastructure

## Purpose
Owns **globally-true** technical concerns: runtime, Tablet/Heimserver-Aufteilung, Kiosk-Dauerbetrieb, Deployment, Konfiguration (Standort, Radius), Secrets, Beobachtbarkeit, gemeinsame Transportwege. BC-local infra (a BC's own adapters, its own persistence) stays inside the originating BC.

## Classification
generic

## Actors
- **Papa** — Betreiber.

## Ubiquitous language
- **Tablet** — altes Android-/iOS-Gerät im Kinderzimmer, Anzeige im Kiosk-Modus.
- **Heimserver** — optionaler Rechner im Haus für Datenbeschaffung/Hosting.
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
