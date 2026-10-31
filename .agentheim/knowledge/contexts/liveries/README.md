# Lackierungen (liveries)

## Purpose
Katalog Airline × Typklasse → Lackierung, mit weißer Standard-Lackierung als Fallback. Besitzt das Lackierungs-Dateiformat, die Silhouette und Detailschicht je Typklasse und die Anzeige-Regel (Schichtung, Zuschnitt). Bis zur Umstellung (ADR 0031): Farbsätze aus CSS-Variablen je Airline (ADR 0009). Die Illustrationsarbeit selbst passiert im BC livery-editor.

## Classification
supporting — Lernwert hängt an korrekten Lackierungen, aber es ist ein Katalog, keine Logik.

## Actors
- **Papa** — zeichnet und pflegt Lackierungen.

## Ubiquitous language
- **Lackierung** — Bemalung einer Airline auf genau einer Typklasse. Ziel (ADR 0031): eigene Datei im Repo aus ungeschnittenen Pfadebenen und platzierten Logos. Heute (ADR 0009): Farbsatz (CSS-Variablen der Typklassen-SVGs) + optional Logo, auf alle Typklassen gleich.
- **Silhouette** — der leere Flieger einer Typklasse; Umriss, der beim Anzeigen die Lackierung zuschneidet. Eigene Datei je Typklasse.
- **Detailschicht** — Cockpitscheiben und Triebwerksdetails je Typklasse; liegt beim Anzeigen immer über der Lackierung. Keine Kabinenfenster, keine Türen. Eigene Datei je Typklasse.
- **Ebene** — ein Pfad oder ein Logo in der Lackierungsdatei, mit Farbe bzw. Bild, Reihenfolge und Verschiebung.
- **Anzeige-Regel** — Silhouette, darüber die an der Silhouette zugeschnittene Lackierung, darüber die Detailschicht; identisch in Himmelsszene, Storybook und Editor.
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
- **Open host for:** sky-scene (immer eine Antwort, notfalls Standard-Lackierung; fehlende Kombination Airline × Typklasse ist Weiß, keine Ableitung von anderen Typklassen).
- **Published language for:** livery-editor (liest und schreibt genau das Lackierungs-Dateiformat).
See `../../context-map.md`.

## Open questions
_Siehe `../../vision.md` → Open questions._
