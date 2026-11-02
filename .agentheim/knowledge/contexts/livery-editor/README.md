# Lackierungs-Editor (livery-editor)

## Purpose
Papas Desktop-Werkzeug zum Zeichnen und Bearbeiten von Lackierungen: zeigt Lücken (gesehene Airline × Typklasse ohne Lackierung), hängt ein Referenzfoto neben das Zeichenbrett, bietet Pfadwerkzeug, Ebenen, Farbwahl, Logo-Platzierung und Vorlagen, und schreibt Lackierungsdateien im Format des BC liveries ins Repo. Läuft auf dem Mac aus dem Repo heraus; nie auf dem iPad, nie auf dem Heimserver (ADR 0031).

## Classification
supporting — Werkzeug für die Illustrationsarbeit; die Himmelsszene braucht nur sein Ergebnis.

## Actors
- **Papa** — Illustrator und einziger Benutzer. Desktop, Maus und Tastatur, kein Touch.

## Ubiquitous language
- **Zeichenbrett** — die Fläche mit der leeren Silhouette einer Typklasse, über die gezeichnet wird; zeigt das beschnittene Ergebnis mit Detailschicht obenauf.
- **Lücke** — eine im Sichtungsprotokoll gesehene Kombination Airline × Typklasse, für die keine Lackierung existiert; Filter „nur Lücken“. Die Auswahl ist zweistufig: erst Airline (aggregiert über alle Typen, „n von m Typen fehlen“), dann Typklasse im Select mit Sichtungszahl und Status (fehlt/vorhanden).
- **Referenzfoto** — echtes Foto der Airline auf dieser Typklasse aus Wikimedia Commons (nur Commons, `GET /api/photos/reference` des Heimservers; Planespotters reicht zum Nachzeichnen nicht), nur zum Anschauen. Das **Fotopanel** unter dem Brett ist eine Galerie: ein Foto je Kennzeichen (das neueste), bis zu 20 Kennzeichen je Airline × Typklasse, mit ‹ ›, Position „3 / 12“ (ein „+“ solange noch Kennzeichen offen sind) und Beschriftung aus Kennzeichen, Aufnahmedatum und Fotograf · Quelle · Lizenz · Link auf die Quellseite (neuer Tab). Geladen wird lazy und nacheinander (aktuelles plus nächstes Foto); Kennzeichen ohne Commons-Foto werden übersprungen. Zustände „Keine Sichtung gewählt“, „Kein Foto“, „Foto nicht verfügbar“ (airspace-yvdbz, ADR 0039).
- **Ebene** — ein Pfad oder ein Logo mit Farbe bzw. Bild, Reihenfolge im Stapel und Verschiebung; optional mit Namen (max. 40 Zeichen, ohne Namen zeigt das Panel „Pfad n“ bzw. den Logonamen). Das Ebenenpanel listet oben zuerst (`layers[]` läuft unten→oben); eine Ebene ist auswählbar (Auswahl = Editor-Zustand `state.selected`, Umriss im Brett), nach oben/unten verschiebbar, löschbar, färbbar, benennbar. Sichtbarkeit ist reiner Editor-Zustand: ausgeblendete Ebenen werden im Brett nicht gezeichnet, bleiben aber in der gespeicherten Datei.
- **Pfad** — geschlossene gefärbte Form aus Punkten; wird ungeschnitten gespeichert.
- **Shift-Zwang** — mit gehaltener Shift-Taste liegt der nächste Punkt (und das Gummiband dorthin) waagerecht oder senkrecht zum vorigen Punkt; die dominante Achse gewinnt.
- **Rundung** — Griff in der Mitte eines Segments der gewählten Ebene oder, beim Zeichnen, jedes bereits vorhandenen Entwurfssegments (`draft-handle-<i>`); Wegziehen setzt `via[i]` (Punkt auf der Kurve, ganzzahlig gefangen) und macht aus der Geraden eine Kurve (wie in Photoshop). Doppelklick auf den Griff setzt `via[i]` zurück auf null (gerade). Der Entwurf trägt `via`; beim Schließen wird es mit null auf `points.length` aufgefüllt (Schließsegment gerade), Escape verwirft es.
- **Farbwahl** — Farbpicker je Ebene.
- **Farbfeld** — Triebwerkskörper, Flügel und Höhenleitwerk: bekommen je nur eine Farbe, keinen Pfad; Rumpf-Pfade enden an ihrem Rand. Gezeichnet wird auf Rumpf und Finne.
- **Ansicht** — stufenlose Deckkraft für Silhouette und Detailschicht auf weißem Hintergrund: ganz durchsichtig zeigt die ungeschnittenen Pfade, wo sie wirklich verlaufen; ganz deckend zeigt das Endergebnis wie auf dem iPad (zugeschnitten, Details obenauf).
- **Logo** — vorhandenes Logo (SVG oder PNG aus dem generierten LOGO_SVG-Index) als Ebene (`LogoLayer`: `src`, `x`, `y`, `scale`, `rotation`; Bezugspunkt ist die Logo-Mitte). Der Editor zeigt die Logos in einer Liste; ein Klick legt eines mittig auf den Rumpf. Die gewählte Logo-Ebene hat einen **Transform-Rahmen** im Overlay: Ziehen verschiebt, die vier Eckgriffe skalieren proportional um die Mitte, der Griff über der Oberkante dreht (Shift rastet auf 15°). Logos werden wie Pfade zugeschnitten (ADR 0032 §6). Der Editor zeichnet keine Logos, lädt sie aber hoch: Datei wählen, Name vergeben (a-z, 0-9, Bindestrich), Hochladen über das Schreib-Plugin nach `svg/logos/`; das Logo erscheint danach sofort in der Liste und im LOGO-Index und wird platziert.
- **Vorlage** — Ausgangspunkt statt leerem Brett: eine bestehende Lackierung (auch einer anderen Airline oder Typklasse) oder ein vorgefertigter Pfad (z. B. ganze Finne).
- **Öffnen** — eine gespeicherte Lackierung wieder bearbeiten; nichts ist je fertig.
- **Speichern** — schreibt die Lackierungsdatei ins Repo; der Commit ist Papas Sache.
- **Import** — einmalige Übersetzung der heutigen CSS-Lackierungen in Ebenen (jede gefärbte Fläche eine Ebene) bei der Umstellung.
- **Schreib-Plugin** — das Vite-Plugin des Editors und sein einziger Schreibweg ins Repo: validiert die Lackierungsdatei mit zod, schreibt nur in Zielverzeichnisse der Allow-List, schützt gegen Path-Traversal, schreibt atomar und stößt danach `build-assets` an (ADR 0035). Es hat einen zweiten Endpunkt `/logo` für Logo-Uploads: prüft Name (`^[a-z0-9][a-z0-9-]{0,31}$`), Größe (max. 512 KB), SVG-Sanitizer (kein script/foreignObject/iframe/embed/object, keine on*-Attribute, nur `#`/`data:`-hrefs, kein url()/expression() in style, viewBox Pflicht) bzw. PNG-Signatur, erzeugt für PNG ein Wrapper-SVG, überschreibt nie (409 bei vorhandenem Namen).
- **Allow-List** — die feste Liste der Zielverzeichnisse im Repo, in die das Schreib-Plugin überhaupt schreiben darf (Lackierungen unter `liveries/`, hochgeladene Logos unter `svg/logos/`); alles andere wird abgewiesen.
- **Deckkraft-Ansicht (Spike-Stand)** — Der Deckkraft-Regler der Silhouette blendet sie aus und zeigt dabei die ungeschnittenen Pfade (Geisterkopie); bei 100 % sieht man den Zuschnitt, bei 0 % den ganzen Pfad. Umsetzung: Option `silhouetteOpacity` von `renderLiverySvg`.
- **Eckmarker**: quadratischer Overlay-Griff (`vertex-handle-<i>`) an jedem Eckpunkt der ausgewaehlten Pfad-Ebene; Ziehen setzt `points[i]` (gefangen), `via` bleibt unveraendert. Unterscheidet sich vom runden Rundungsgriff in der Segmentmitte.
- **Vorschau** — solange die Leertaste gehalten wird (kein Textfeld fokussiert), ist das gesamte Overlay des Zeichenbretts (Auswahl, Marker, Griffe, Entwurf) ausgeblendet und Brett-Klicks sind wirkungslos; Loslassen bringt alles zurück, die Auswahl bleibt. Auswahl aufheben: Klick auf die gewählte Ebenenzeile oder Escape ohne Entwurf.
- **Gummiband** — gestrichelte Vorschau des nächsten Segments vom letzten Entwurfspunkt zur Maus (kein Drücken nötig); nahe dem ersten Punkt rastet sie dort ein; verschwindet beim Verlassen des Boards.
- **Airline-Palette** — Reihe von Farbfeldern im Editor mit allen Farben, die in den gespeicherten Lackierungen einer Airline (alle Typklassen) und im offenen Entwurf schon vorkommen: Pfad-Ebenen-Farben und Farbfelder (Triebwerke/Flügel/Höhenleitwerk), die nicht noch auf dem Renderer-Standard stehen; Logos tragen keine Farbe. Ohne Unterschied von Groß-/Kleinschreibung dedupliziert, häufigste zuerst. Klick färbt die gewählte Pfad-Ebene, sonst setzt er die Zeichenfarbe. Reine Ableitung (`tools/livery-editor/palette.ts`, `airlinePalette`), kein Dateiformat.

## Aggregates
_Noch nicht modelliert._

## Key events
_Noch offen._

## Key commands
_Noch offen._

## Relationships with other contexts
- **Conformist to liveries:** Dateiformat, Silhouetten, Detailschichten und Zuschnitt-Regel gehören liveries; der Editor erfindet nichts Eigenes.
- **Customer of sighting-log (lesend):** Lücken aus der Lackierungs-Statistik des laufenden Heimservers, erweitert um die Typklasse.
- **Customer of airspace (lesend):** Referenzfoto über `GET /api/photos/reference`, nur Commons (ADR 0033 Amendment).
- **design-system (ADR 0034):** Der Anzeigepfad (Render-Funktion, Molekül „lackiertes Flugzeug“, Silhouetten, Detailschichten) bleibt Storybook-first; der Editor konsumiert diese Module und dupliziert sie nie. Editor-eigene UI (Werkzeugleiste, Ebenenpanel, Farbpicker, Lückenliste, Fotopanel) liegt außerhalb des Gates und wird im laufenden Editor abgenommen. Nur Tasks, die Anzeigepfad-Bausteine ändern, tragen `depends_on: [design-system-001-styleguide]`.
See `../../context-map.md`.

## Open questions
- Was zählt als „gesehen“ für die Lücke (jede Sichtung oder Mindestzahl in N Tagen)?
