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
- **Typklasse** — eine der zehn gezeichneten Silhouetten (Ids wie im Design-System, ADR 0009), abgeleitet aus dem ICAO-Typcode über die Tabelle `type-classes`; ohne Treffer per Emitter-Kategorie-Fallback. Siehe ADR 0010.
- **Kategorie** — Kurz-/Mittel-/Langstrecke etc., für den Steckbrief; kuratierter Wert der Tabelle `type-classes` (nicht aus der Route berechnet), sonst *unbekannt*. Siehe ADR 0010.
- **Flugphase** — Steigflug, Sinkflug, Horizontalflug.
- **Flugquelle (FlightSource)** — Port, der pro Takt die Flugzeuge im Umkreis liefert; Adapter: adsb.lol (primär), OpenSky (optional). Siehe ADR 0005.
- **Routenquelle (RouteSource)** — Port, der zu einem Rufzeichen eine Route oder den Wert *Route unbekannt* liefert; Adapter: VRS standing-data (offline), adsb.lol routeset, adsbdb (nur nicht persistiert). Siehe ADR 0005.
- **Veraltet (stale)** — Zustand der Auswahl bei Totalausfall aller Flugquellen: letzter guter Stand bleibt sichtbar, ist aber als veraltet markiert.
- **Besonderheit** — optionaler Kurztext zu einem Flugzeugtyp (z. B. „Doppelstock“) in der Tabelle `type-classes`.
- **Airline-Tabelle (`airlines`)** — statische Zuordnung ICAO-3-Buchstaben-Präfix des Rufzeichens → Name, Land; bestimmt die Airline. Unbekanntes Präfix: Airline unbenannt, Standard-Lackierung. Siehe ADR 0010.
- **Lackierungs-Zuordnung (`airline-liveries`)** — kuratierte Tabelle ICAO-Präfix → Lackierungs-Id des Design-Systems; ohne Eintrag oder bei Typklassen ohne Lackierungen (Light Aircraft, Glider) gilt die Standard-Lackierung (`def`). Siehe ADR 0010.
- **Emitter-Kategorie** — ADS-B-Kategorie A1–A7 (A1 leicht, A2 mittel 1, A3 mittel 2, A4 High Vortex, A5 schwer, A6 Hochleistung, A7 Drehflügler); oft nicht vorhanden; nur Fallback für die Typklasse.
- **Auswahl (Umsetzung)** — die bis zu zwei nächsten Flugzeuge im Umkreis, nach eigener Haversine-Distanz aus dem normalisierten Modell berechnet (nicht nach Anbieter-Distanz); im Walking Skeleton umgesetzt (infrastructure-001).

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
