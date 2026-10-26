# Luftraum (airspace)

## Purpose
Weiß, welche Flugzeuge im Umkreis um das Haus sind: holt im Takt kostenlose Flugdaten, reichert sie an und bestimmt die Auswahl der zwei nächsten.

## Classification
core — die Auswahl-Regel und die Anreicherung (Route, Typklasse, Kategorie) bestimmen, ob das Display lebendig und richtig ist.

## Actors
- **Papa** — legt Standort und Radius fest.

## Ubiquitous language
- **Flugzeug** — ein aktuell beobachtetes Luftfahrzeug mit Position, Höhe, Geschwindigkeit, Kennzeichen, Flugnummer.
- **Umkreis / Radius** — Kreis um das Haus (Default ~30 km), in dem Flugzeuge zählen.
- **Takt** — Aktualisierung alle 30 Sekunden.
- **Auswahl** — die bis zu zwei nächsten Flugzeuge im Umkreis zu einem Takt.
- **Route** — Abflug → Ziel (Stadt + Land); kann **unbekannt** sein, das ist ein regulärer Zustand.
- **Typklasse** — eine der zehn gezeichneten Silhouetten, abgeleitet aus dem Flugzeugtyp.
- **Kategorie** — Kurz-/Mittel-/Langstrecke etc., für den Steckbrief.
- **Flugphase** — Steigflug, Sinkflug, Horizontalflug.

## Aggregates
_Noch nicht modelliert — entsteht in `modeling` / bei der Arbeit an Tasks._

## Key events
_Noch offen._

## Key commands
_Noch offen._

## Relationships with other contexts
- **Upstream of:** sky-scene (Auswahl), sighting-log (Sichtungen).
- **Anticorruption layer to:** externe kostenlose Flugdaten-/Routenquellen.
See `../../context-map.md`.

## Open questions
_Siehe `../../vision.md` → Open questions._
