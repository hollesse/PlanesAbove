# Context map

## Contexts

### sky-scene (Himmelsszene)
- **Purpose:** Was Mona sieht und hört: komponiert Himmel, bis zu zwei Flugzeuge und Info-Leiste zur Szene, spielt Übergänge ab, liest Steckbriefe vor und hält die Vorlese-Sperre.
- **Core language:** Himmelsszene, Übergang, Steckbrief, Vorlesen, Vorlese-Sperre, Info-Leiste, „Zuletzt“
- **Classification:** core
- **Key actors:** Mona, Erwachsene im Zimmer

### airspace (Luftraum)
- **Purpose:** Weiß, welche Flugzeuge im Umkreis sind: fragt kostenlose Flugdaten im Takt ab, reichert sie an (Airline, Route, Typ → Typklasse/Kategorie, Flugphase) und bestimmt die Auswahl der zwei nächsten.
- **Core language:** Flugzeug, Umkreis, Takt, Auswahl, Route (bekannt/unbekannt), Typklasse, Kategorie, Flugphase
- **Classification:** core (Auswahl-Regel, Anreicherung) mit generischer Datenbeschaffung darunter
- **Key actors:** Papa (stellt Standort und Radius ein)

### weather (Wetter & Tageszeit)
- **Purpose:** Bildet echtes Wetter und Sonnenstand am Standort auf genau einen der 28 Himmel ab.
- **Core language:** Tageszeit, Wetterlage, Himmel
- **Classification:** supporting
- **Key actors:** —

### liveries (Lackierungen)
- **Purpose:** Katalog Airline × Typklasse → Lackierung (Pfadebenen + Logos als eigene Datei im Repo), dazu Silhouette und Detailschicht je Typklasse und die Regel, wie sie beim Anzeigen übereinandergelegt und zugeschnitten werden; weiße Standard-Lackierung als Fallback. Bis zur Umstellung: CSS-Farbsätze je Airline.
- **Core language:** Lackierung, Standard-Lackierung, Silhouette, Detailschicht, Ebene, Pfad, Logo, Typklasse
- **Classification:** supporting
- **Key actors:** Papa (Kurator)

### sighting-log (Sichtungsprotokoll)
- **Purpose:** Schreibt still jede Sichtung mit (Zeit, Airline, Typ). Auswertung kommt in v2.
- **Core language:** Sichtung
- **Classification:** supporting
- **Key actors:** Papa (später als Leser der Auswertung)

### livery-editor (Lackierungs-Editor)
- **Purpose:** Papas Desktop-Werkzeug zum Zeichnen: zeigt Lücken (gesehene Airline × Typklasse ohne Lackierung), hängt ein Referenzfoto daneben, bietet Pfadwerkzeug, Ebenen, Farbwahl, Logo-Platzierung, Vorlagen, und schreibt Lackierungsdateien ins Repo. Läuft auf dem Mac, nie auf dem iPad oder Heimserver.
- **Core language:** Ebene, Pfad, Rundung, Vorlage, Referenzfoto, Lücke, Import
- **Classification:** supporting (Werkzeug für die Illustrationsarbeit)
- **Key actors:** Papa (Illustrator)

### infrastructure
- **Purpose:** Global gültige technische Belange — Laufzeit, iPad/Heimserver-Aufteilung (ZimaOS), Kiosk-Betrieb, Deployment, Konfiguration, Beobachtbarkeit.
- **Classification:** generic

### design-system
- **Purpose:** Eigene Storybook-Instanz nach Atomic Design (ADR 0002) mit allen Assets, jedes einzeln abnehmbar; Gestaltungsgrundlage aus den Claude-Design-Entwürfen (`Flugzeugmodelle.html`, `Himmel.html`, `Screens.html`): Tokens, Typografie, Info-Leisten-Komponenten, Übergangs-Choreografie.
- **Classification:** generic (Frontend-Infrastruktur)

## Relationships

- **airspace → sky-scene** (customer-supplier, airspace upstream): Jeder Takt liefert eine Auswahl (0–2 Flugzeuge mit Steckbrief-Daten). sky-scene entscheidet selbst, wann sie die Auswahl übernimmt (Vorlese-Sperre).
- **weather → sky-scene** (customer-supplier, weather upstream): liefert den aktuellen Himmel (Tageszeit × Wetterlage).
- **liveries → sky-scene** (open host / published language): sky-scene fragt „Lackierung für Airline X auf Typklasse Y“ und bekommt immer eine Antwort (notfalls Standard-Lackierung). Typklasse ist die gemeinsame Sprache zwischen airspace und liveries.
- **liveries → livery-editor** (published language, liveries upstream): das Dateiformat der Lackierung, die Silhouetten und Detailschichten gehören liveries; der Editor liest und schreibt genau dieses Format und erfindet kein eigenes.
- **sighting-log → livery-editor** (customer-supplier, sighting-log upstream, lesend): der Editor fragt den laufenden Heimserver, welche Airline × Typklasse gesehen wurde, für den Lücken-Filter.
- **airspace (Fotokette) → livery-editor** (customer-supplier, lesend): das Referenzfoto kommt aus derselben Fotokette wie der Foto-Knopf.
- **airspace → sighting-log** (published events): jede neue Sichtung wird protokolliert; das Protokoll beeinflusst die Anzeige nicht.
- **Externe Flugdaten-/Wetterquellen → airspace / weather** (anticorruption layer): kostenlose Fremd-APIs werden hinter einer Übersetzungsschicht gehalten, damit ein Quellenwechsel die Domäne nicht berührt.
- **design-system → sky-scene** (Gate, Storybook-first): sky-scene verwendet ausschließlich abgenommene Storybook-Komponenten; fehlt ein Baustein, entsteht er zuerst in Storybook.
