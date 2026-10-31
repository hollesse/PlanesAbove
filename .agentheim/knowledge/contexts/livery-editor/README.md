# Lackierungs-Editor (livery-editor)

## Purpose
Papas Desktop-Werkzeug zum Zeichnen und Bearbeiten von Lackierungen: zeigt Lücken (gesehene Airline × Typklasse ohne Lackierung), hängt ein Referenzfoto neben das Zeichenbrett, bietet Pfadwerkzeug, Ebenen, Farbwahl, Logo-Platzierung und Vorlagen, und schreibt Lackierungsdateien im Format des BC liveries ins Repo. Läuft auf dem Mac aus dem Repo heraus; nie auf dem iPad, nie auf dem Heimserver (ADR 0031).

## Classification
supporting — Werkzeug für die Illustrationsarbeit; die Himmelsszene braucht nur sein Ergebnis.

## Actors
- **Papa** — Illustrator und einziger Benutzer. Desktop, Maus und Tastatur, kein Touch.

## Ubiquitous language
- **Zeichenbrett** — die Fläche mit der leeren Silhouette einer Typklasse, über die gezeichnet wird; zeigt das beschnittene Ergebnis mit Detailschicht obenauf.
- **Lücke** — eine im Sichtungsprotokoll gesehene Kombination Airline × Typklasse, für die keine Lackierung existiert; Filter „nur Lücken“.
- **Referenzfoto** — echtes Foto der Airline auf dieser Typklasse aus der Fotokette der App (Commons, Planespotters als Fallback), nur zum Anschauen.
- **Ebene** — ein Pfad oder ein Logo mit Farbe bzw. Bild, Reihenfolge im Stapel und Verschiebung; einzeln auswählbar, verschiebbar, umsortierbar, ein-/ausblendbar.
- **Pfad** — geschlossene gefärbte Form aus Punkten; wird ungeschnitten gespeichert.
- **Shift-Zwang** — mit gehaltener Shift-Taste liegt der nächste Punkt waagerecht oder senkrecht zum vorigen.
- **Rundung** — Griff in der Mitte eines Segments; Wegziehen macht aus der Geraden eine Kurve (wie in Photoshop).
- **Farbwahl** — Farbpicker je Ebene.
- **Ansicht** — stufenlose Deckkraft für Silhouette und Detailschicht auf weißem Hintergrund: ganz durchsichtig zeigt die ungeschnittenen Pfade, wo sie wirklich verlaufen; ganz deckend zeigt das Endergebnis wie auf dem iPad (zugeschnitten, Details obenauf).
- **Logo** — hochgeladenes SVG oder PNG als Ebene; skalierbar, drehbar, platzierbar. Der Editor zeichnet keine Logos.
- **Vorlage** — Ausgangspunkt statt leerem Brett: eine bestehende Lackierung (auch einer anderen Airline oder Typklasse) oder ein vorgefertigter Pfad (z. B. ganze Finne).
- **Öffnen** — eine gespeicherte Lackierung wieder bearbeiten; nichts ist je fertig.
- **Speichern** — schreibt die Lackierungsdatei ins Repo; der Commit ist Papas Sache.
- **Import** — einmalige Übersetzung der heutigen CSS-Lackierungen in Ebenen (jede gefärbte Fläche eine Ebene) bei der Umstellung.

## Aggregates
_Noch nicht modelliert._

## Key events
_Noch offen._

## Key commands
_Noch offen._

## Relationships with other contexts
- **Conformist to liveries:** Dateiformat, Silhouetten, Detailschichten und Zuschnitt-Regel gehören liveries; der Editor erfindet nichts Eigenes.
- **Customer of sighting-log (lesend):** Lücken aus der Lackierungs-Statistik des laufenden Heimservers, erweitert um die Typklasse.
- **Customer of airspace-Fotokette (lesend):** Referenzfoto.
- **design-system:** Ob Storybook-first (ADR 0002) für die Editor-Bausteine gilt, ist offen (siehe Vision, Open questions). Bis zur Entscheidung gilt: jede UI-Aufgabe hier `depends_on: [design-system-001-styleguide]`.
See `../../context-map.md`.

## Open questions
- Gilt Storybook-first auch für den Editor?
- Was zählt als „gesehen“ für die Lücke (jede Sichtung oder Mindestzahl in N Tagen)?
