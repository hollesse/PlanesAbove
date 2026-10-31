---
id: 0031
title: Lackierung je Airline × Typklasse als ungeschnittene Pfaddatei im Repo; Silhouette und Detailschicht getrennt; Zuschnitt beim Anzeigen
scope: global
status: accepted
date: 2026-10-31
supersedes: []
superseded_by: []
related_adrs: [0001, 0002, 0009, 0010, 0030]
related_tasks: []
related_research: []
---

# ADR 0031: Lackierung je Airline × Typklasse als ungeschnittene Pfaddatei im Repo; Silhouette und Detailschicht getrennt; Zuschnitt beim Anzeigen

Ergänzt ADR 0009 (Lackierung als CSS-Variablen der Typklassen-SVGs). Bis zur Umstellung bleibt ADR 0009 in Kraft; danach gilt nur noch diese Entscheidung.

## Context
Die 42 heutigen Lackierungen sind Farbsätze aus CSS-Variablen, die auf feste Flächen der zehn Typklassen-SVGs fallen. Ein Farbsatz gilt für alle Typklassen gleich, auch für Typen, die die Airline nicht fliegt (Pflege ohne Nutzen). Entstanden sind sie mit Claude Design per Beschreibung: Formen und Rundungen waren ein Ratespiel, Fehler wie weiße Stellen am Rumpf ließen sich nicht direkt greifen. Papa will stattdessen selbst zeichnen, mit einem eigenen Desktop-Werkzeug (Vision, Abschnitt Lackierungs-Editor).

Dafür muss geklärt sein, was eine Lackierung ist, wo sie liegt und wie sie zum Bild wird. Kräfte: Das Repo ist öffentlich und alles, was für jede Installation gleich ist, lebt dort versioniert (ADR 0030). Die Himmelsszene muss für jede Anfrage eine Antwort bekommen (open host). Silhouetten können sich später ändern. Der Heimserver soll wartungsfrei bleiben und hat heute keine schreibende Oberfläche.

## Decision
1. **Eine Lackierung gilt für genau eine Airline auf genau einer Typklasse.** Es gibt keine Ähnlichkeits- oder Vererbungsregel zwischen Typklassen. Fehlt die Kombination, liefert liveries die weiße Standard-Lackierung.
2. **Eine Lackierung ist eine eigene Datei im Repo**, versioniert und öffentlich. Sie enthält ausschließlich Papas Ebenen: Pfade (geschlossene gefärbte Formen aus Punkten, Segmente optional gerundet) und platzierte Logos (Position, Größe, Drehung). Sie enthält keine Silhouette und keine Details.
3. **Silhouette und Detailschicht sind getrennte Dateien je Typklasse.** Die Detailschicht umfasst Cockpitscheiben und Triebwerksdetails, keine Kabinenfenster und keine Türen. Beide gehören dem BC liveries und werden vom Editor nicht verändert.
4. **Pfade werden ungeschnitten gespeichert.** Zuschnitt an der Silhouette und Schichtung (Silhouette, Lackierung, Details obenauf) passieren beim Anzeigen, in der Himmelsszene wie im Editor.
5. **Der Editor läuft auf dem Mac, nicht auf dem Heimserver.** Er liest Sichtungen und Fotos vom laufenden Heimserver über dessen vorhandene Lesewege und schreibt Dateien ins Repo, die Papa committet. Der Weg aufs iPad bleibt Commit, Image, Watchtower.
6. **Umstellung einmalig und vollständig.** Die heutigen CSS-Lackierungen bleiben in Betrieb, bis der Editor taugt. Dann werden sie per Import in das neue Format übersetzt (jede gefärbte Fläche eine Ebene), die Himmelsszene wechselt auf das neue Format, und der CSS-Weg entfällt.

## Consequences
### Positive
- Papa hat die Hand an der Form; Fehler sind direkt greifbar und korrigierbar.
- Keine Pflege von Kombinationen, die nie über dem Haus fliegen; der Lücken-Filter des Editors zeigt, was fehlt.
- Lackierungen sind gesichert, haben eine Geschichte und können eine Story in Storybook bekommen.
- Silhouetten dürfen sich ändern, ohne alle Lackierungen ungültig zu machen.
- Der Heimserver bleibt ohne Schreib-Oberfläche.

### Negative
- Mehr Dateien: pro Airline mehrere Lackierungen statt einer. Papas Zeichenaufwand steigt pro Airline, sinkt aber pro Lackierung.
- Zum Zeichnen müssen Mac und Heimserver laufen; am Ende steht ein Commit.
- Die Sichtungsauswertung kennt heute nur Airline, nicht Airline × Typklasse; sie muss für den Lücken-Filter erweitert werden.
- Zwei Formate leben bis zur Umstellung nebeneinander.

### Neutral
- Die Typklassen und die Zuordnung Airline-Präfix → Lackierung (airline-liveries.json) bleiben; der Schlüssel wird um die Typklasse erweitert.
- Logos kommen weiter fertig von außen (SVG/PNG); der Editor platziert sie nur.

## Alternatives considered
- **Flächen färben statt Pfade zeichnen (heutiges Modell, nur mit Editor-Oberfläche)** — nimmt Papa die Formfreiheit, die den Schmerz verursacht hat; Vorlagen wie „ganze Finne“ decken den Nutzen der Flächen als Abkürzung ab.
- **Eine Lackierung je Airline mit Ableitung auf andere Typklassen** — Ähnlichkeit ist eine Beobachtung über Papas Zeichnungen, keine Regel, die das System sicher anwenden kann; falsche Ableitungen wären schlechter als Weiß.
- **Editor auf dem Heimserver, Lackierungen als Betriebsdaten** — Verlust bei Plattenschaden, keine Versionierung, keine Storybook-Abnahme, erste schreibende Oberfläche auf einem wartungsfreien System; widerspricht ADR 0030.
- **Zuschnitt beim Speichern** — macht Lackierungen an die Silhouette eines Zeitpunkts gebunden und Verschieben verlustbehaftet.

## References
- Vision, Abschnitt „Lackierungs-Editor (Erweiterung vom 2026-10-31)“
- ADR 0009 (CSS-Lackierungen, bis zur Umstellung), ADR 0010 (Server-seitige Auflösung), ADR 0030 (Konfigurationsschichten, Repo als Ort des Gemeinsamen)
