# Lackierungen (liveries)

## Purpose
Katalog Airline → Lackierung (Farben + Logo) je Typklasse, mit weißer Standard-Lackierung als Fallback. Heimat der Illustrationsarbeit.

## Classification
supporting — Lernwert hängt an korrekten Lackierungen, aber es ist ein Katalog, keine Logik.

## Actors
- **Papa** — zeichnet und pflegt Lackierungen.

## Ubiquitous language
- **Lackierung** — Farbsatz (CSS-Variablen der Typklassen-SVGs) + optional Logo einer Airline.
- **Standard-Lackierung** — weiß; für Airlines ohne eigene Lackierung und für Typklassen ohne Lackierung (Light Aircraft, Glider).
- **Logo** — Airline-Emblem, an definierten Ankerpunkten der Typklasse platziert.
- **Typklasse** — gemeinsame Sprache mit airspace.

## Aggregates
_Noch nicht modelliert — entsteht in `modeling` / bei der Arbeit an Tasks._

## Key events
_Noch offen._

## Key commands
_Noch offen._

## Relationships with other contexts
- **Open host for:** sky-scene (immer eine Antwort, notfalls Standard-Lackierung).
See `../../context-map.md`.

## Open questions
_Siehe `../../vision.md` → Open questions._
