# Himmelsszene (sky-scene)

## Purpose
Was Mona sieht und hört: komponiert Himmel, bis zu zwei Flugzeuge und Info-Leiste zur Himmelsszene, spielt Übergänge ab, liest Steckbriefe vor und hält die Vorlese-Sperre.

## Classification
core — hier entsteht das Erlebnis, um das es geht.

## Actors
- **Mona** — schaut, tippt auf Flugzeug oder Text, hört den Steckbrief.
- **Erwachsene** — lesen die Info-Leiste.

## Ubiquitous language
- **Himmelsszene** — Himmel + bis zu zwei Flugzeuge + Info-Leiste, wie sie gerade angezeigt wird.
- **Übergang** — animierter Wechsel: Flugzeug kommt / geht / wechselt, Wetter wechselt, Tageszeit wechselt.
- **Steckbrief** — sachliche deutsche Ansage zu einem Flugzeug (Airline, Route mit Ländern, Höhe, Geschwindigkeit, Typ + Kategorie, ggf. Besonderheit der Typklasse).
- **Vorlesen** — Ausgabe des Steckbriefs per Sprachausgabe nach Tippen.
- **Vorlese-Sperre** — solange vorgelesen wird, übernimmt die Szene keine neue Auswahl.
- **Info-Leiste** — Textzeile(n) für Erwachsene unten im Bild; eine oder zwei Zeilen mit Nummern-Plakette.
- **Zuletzt** — Hinweis im leeren Himmel auf das zuletzt gesehene Flugzeug („vor N Min“).

## Aggregates
_Noch nicht modelliert — entsteht in `modeling` / bei der Arbeit an Tasks._

## Key events
_Noch offen._

## Key commands
_Noch offen._

## Frontend gate
Every frontend / UI task in this BC must `depends_on: [design-system-001-styleguide]`. **Storybook-first (ADR 0002):** this BC only composes components that exist and are approved in the design-system Storybook. A missing UI element is first built as a story in design-system, reviewed, then used here.

## Relationships with other contexts
- **Downstream of:** airspace (Auswahl je Takt), weather (aktueller Himmel), liveries (Lackierung je Airline × Typklasse).
- **Gated by:** design-system (Styleguide).
See `../../context-map.md`.

## Open questions
_Siehe `../../vision.md` → Open questions._
