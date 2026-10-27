# Sichtungsprotokoll (sighting-log)

## Purpose
Schreibt still jede Sichtung (Zeit, Airline, Typ, Typklasse) mit, damit später datengetrieben entschieden werden kann, welche Lackierungen sich lohnen.

## Classification
supporting — in v1 nur Erfassung, Auswertung in v2.

## Actors
- **Papa** — später Leser der Auswertung.

## Ubiquitous language
- **Sichtung** — ein Flugzeug war (einmal je Flug) im Umkreis: Zeitpunkt, Airline, Flugzeugtyp, Typklasse, ob Lackierung vorhanden.
- **Besuch** — ein Aufenthalt eines Flugzeugs (icao24) im Umkreis; nach einer Lücke länger als `visitGap` beginnt ein neuer Besuch. Pro Besuch genau eine Sichtungszeile mit Zeit, Airline/Callsign, Typ, Typklasse, Lackierung ja/nein und Auswahl-Slot (1/2 oder leer) (infrastructure-001, ADR 0007).

## Aggregates
_Noch nicht modelliert — entsteht in `modeling` / bei der Arbeit an Tasks._

## Key events
_Noch offen._

## Key commands
_Noch offen._

## Relationships with other contexts
- **Downstream of:** airspace (Sichtungen). Beeinflusst die Anzeige nicht.
See `../../context-map.md`.

## Open questions
_Siehe `../../vision.md` → Open questions._
