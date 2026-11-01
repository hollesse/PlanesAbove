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
- **Farbfeld** — Triebwerkskörper, Flügel und Höhenleitwerk: bekommen je nur eine Farbe, keinen Pfad; Rumpf-Pfade enden an ihrem Rand. Gezeichnet wird auf Rumpf und Finne.
- **Ansicht** — stufenlose Deckkraft für Silhouette und Detailschicht auf weißem Hintergrund: ganz durchsichtig zeigt die ungeschnittenen Pfade, wo sie wirklich verlaufen; ganz deckend zeigt das Endergebnis wie auf dem iPad (zugeschnitten, Details obenauf).
- **Logo** — hochgeladenes SVG oder PNG als Ebene; skalierbar, drehbar, platzierbar. Der Editor zeichnet keine Logos.
- **Vorlage** — Ausgangspunkt statt leerem Brett: eine bestehende Lackierung (auch einer anderen Airline oder Typklasse) oder ein vorgefertigter Pfad (z. B. ganze Finne).
- **Öffnen** — eine gespeicherte Lackierung wieder bearbeiten; nichts ist je fertig.
- **Speichern** — schreibt die Lackierungsdatei ins Repo; der Commit ist Papas Sache.
- **Import** — einmalige Übersetzung der heutigen CSS-Lackierungen in Ebenen (jede gefärbte Fläche eine Ebene) bei der Umstellung.
- **Schreib-Plugin** — das Vite-Plugin des Editors und sein einziger Schreibweg ins Repo: validiert die Lackierungsdatei mit zod, schreibt nur in Zielverzeichnisse der Allow-List, schützt gegen Path-Traversal, schreibt atomar und stößt danach `build-assets` an (ADR 0035).
- **Allow-List** — die feste Liste der Zielverzeichnisse im Repo, in die das Schreib-Plugin überhaupt schreiben darf; alles andere wird abgewiesen.
- **Deckkraft-Ansicht (Spike-Stand)** — Der Deckkraft-Regler der Silhouette blendet sie aus und zeigt dabei die ungeschnittenen Pfade (Geisterkopie); bei 100 % sieht man den Zuschnitt, bei 0 % den ganzen Pfad. Umsetzung: Option `silhouetteOpacity` von `renderLiverySvg`.

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
- **design-system (ADR 0034):** Der Anzeigepfad (Render-Funktion, Molekül „lackiertes Flugzeug“, Silhouetten, Detailschichten) bleibt Storybook-first; der Editor konsumiert diese Module und dupliziert sie nie. Editor-eigene UI (Werkzeugleiste, Ebenenpanel, Farbpicker, Lückenliste, Fotopanel) liegt außerhalb des Gates und wird im laufenden Editor abgenommen. Nur Tasks, die Anzeigepfad-Bausteine ändern, tragen `depends_on: [design-system-001-styleguide]`.
See `../../context-map.md`.

## Open questions
- Was zählt als „gesehen“ für die Lücke (jede Sichtung oder Mindestzahl in N Tagen)?
