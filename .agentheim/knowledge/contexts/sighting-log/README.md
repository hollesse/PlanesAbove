# Sichtungsprotokoll (sighting-log)

## Purpose
Schreibt still jede Sichtung (Zeit, Airline, Typ, Typklasse) mit, damit später datengetrieben entschieden werden kann, welche Lackierungen sich lohnen.

## Classification
supporting — in v1 nur Erfassung, Auswertung in v2.

## Actors
- **Papa** — später Leser der Auswertung.

## Ubiquitous language
- **Sichtung** — ein Flugzeug war (einmal je Flug) im Umkreis: Zeitpunkt, Airline, Flugzeugtyp, Typklasse, ob Lackierung vorhanden.
- **Besuch** — ein Aufenthalt eines Flugzeugs (icao24) im Umkreis eines Beobachtungsstandorts; nach einer Lücke länger als `visitGap` beginnt ein neuer Besuch, ebenso bei einem Standortwechsel (auch innerhalb von `visitGap`; `closest_distance_km` mischt nie zwei Standorte; Wechsel A, B, A setzt die alte A-Zeile fort). Pro Besuch genau eine Sichtungszeile mit Zeit, Airline/Callsign, Typ, Typklasse, Lackierung ja/nein und Auswahl-Slot (1/2 oder leer) (infrastructure-001, ADR 0007, sighting-log-k4m7q).
- **Routen-Befund (route_lookups)** — je Sichtung und je tatsaechlich gefragter Routenquelle eine Zeile: Quelle (freier Name, z. B. vrs/adsbdb/hexdb), Ergebnis (hit | unknown | unavailable | rejected), Konflikt-Flag (zwei Quellen lieferten plausible, aber verschiedene Routen), gewaehlt-Flag. Nur Befunde, nie Routentext oder Flughafencodes von adsbdb/hexdb (ADR 0016); Cache-Treffer schreiben nichts. Auswertung: npm run stats:routes.
- **Beobachtungsstandort** — der Punkt, von dem aus geschaut wird: Tabelle `observation_points`, Identität = lat/lon auf 4 Nachkommastellen gerundet + `radiusKm` (`UNIQUE`); `place` ist nur ein Label und wird bei Abweichung aktualisiert. Das Repository legt ihn beim Start per find-or-create an; jede neue Sichtungszeile trägt `observation_point_id`. Hydrate, Besuch-fortsetzen, `recordLookup` und `latest()` sehen nur Zeilen des aktuellen Standorts (sighting-log-k4m7q).
- **Standort unbekannt** — Sichtungen aus der Zeit vor der Standort-Erfassung (Migration 0006) behalten `observation_point_id` NULL (kein Backfill, kein Löschen); sie werden nie in einen Besuch hydriert und erscheinen in `stats:routes` als Gruppe „unbekannt“ (`--standort unbekannt`) (sighting-log-k4m7q).
- **Lackierungs-Statistik** — read-only evaluation of the sighting log of which airlines were shown with the default livery (livery_present = 0, light-aircraft/glider excluded), plus unmapped airline prefixes and sightings without airline: `npm run stats:liveries -- --db <file> [--days N] [--json] [--standort <id|unbekannt|alle>]` (livery-stats.ts).

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
