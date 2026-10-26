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
- **Flugquelle (FlightSource)** — Port, der pro Takt die Flugzeuge im Umkreis liefert; Adapter: adsb.lol (primär), OpenSky (optional). Siehe ADR 0005.
- **Routenquelle (RouteSource)** — Port, der zu einem Rufzeichen eine Route oder den Wert *Route unbekannt* liefert; Adapter: VRS standing-data (offline), adsb.lol routeset, adsbdb (nur nicht persistiert). Siehe ADR 0005.
- **Veraltet (stale)** — Zustand der Auswahl bei Totalausfall aller Flugquellen: letzter guter Stand bleibt sichtbar, ist aber als veraltet markiert.

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
