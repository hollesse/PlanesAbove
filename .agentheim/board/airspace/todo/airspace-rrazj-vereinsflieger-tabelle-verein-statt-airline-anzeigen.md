---
id: airspace-rrazj
title: Lokale Vereinsflieger per Hex-Code erfassen und den Verein statt der Airline anzeigen
status: todo
type: feature
context: airspace
created: 2026-10-30
completed:
depends_on: []
blocks: []
tags: [vereinsflieger, kleinflugzeug, tabellen]
related_adrs: []
related_research: []
prior_art: []
---

## Why
Vereinsflugzeuge aus der Nachbarschaft tauchen regelmäßig über dem Haus auf, haben aber keine Airline. Für sie ist der Verein die interessante Information. Beispiel: D-EBEC (Hex 3d07b6, Diamond DV20) gehört zur Sportfluggruppe Elz mit eigenem Flugplatz bei Limburg.

## What
- Neue kuratierte Tabelle `src/server/modules/airspace/tables/clubs.json` neben `airlines.json`, **normalisiert** (Betreiber-Entscheidung 2026-11-01: ein Vereinsname wird nur an einer Stelle gepflegt, auch wenn der Verein mehrere Flugzeuge hat):
  ```json
  {
    "vereine":   { "sfg-elz": { "name": "Sportfluggruppe Elz", "heimatplatz": "Flugplatz Elz" } },
    "flugzeuge": { "3d07b6":  { "verein": "sfg-elz", "registration": "D-EBEC" } }
  }
  ```
  Die Vereins-ID ist ein Slug (`^[a-z0-9-]+$`). Ein Flugzeug verweist per `verein` auf eine ID; angezeigt wird `vereine[id].name`. `registration` und `heimatplatz` dienen nur der Doku und werden nicht angezeigt (Betreiber-Entscheidung 2026-11-01: nur der Verein). Erster Eintrag: Verein `sfg-elz` (Sportfluggruppe Elz, Flugplatz Elz), Flugzeug `3d07b6` (D-EBEC). Die Tabelle wird beim Laden validiert wie die anderen Tabellen: Hex-Format `^[0-9a-f]{6}$`, Vereins-ID-Format, jedes Flugzeug verweist auf einen vorhandenen Verein, jeder Verein hat einen `name`.
- Steht der Hex in der Tabelle, tritt der Verein an die Stelle der Airline, überall, wo heute der Airline-Name wirkt: Info-Leiste (`flight.operator`), Satzbaustein Typ+Airline („Das ist eine Diamond DV20 der Sportfluggruppe Elz.“) und die Spalte `airline` der Sichtung. Ein Treffer in der Vereinstabelle hat Vorrang vor der Callsign-Präfix-Auflösung.
- Keine Lackierung: Vereinsflieger bekommen wie bisher die Standard-Lackierung (Kleinflugzeuge haben keine Lackierungen); ein Vereinseintrag meldet keinen „unmapped airline prefix“.
- Pflegehinweis im Projekt-README (Abschnitt Tabellen): wie man einen Vereinsflieger einträgt.

## Acceptance criteria
- [ ] `clubs.json` existiert in der normalisierten Form mit Verein `sfg-elz` und Flugzeug `3d07b6`; eine Tabelle mit ungültigem Hex, ungültiger Vereins-ID, einem Verein ohne `name` oder einem Flugzeug, das auf einen unbekannten Verein verweist, wird beim Laden abgelehnt (Test je Fall).
- [ ] Zwei Flugzeuge desselben Vereins zeigen denselben Namen; eine Namensänderung im Vereinseintrag wirkt auf beide (Test mit einer Testtabelle).
- [ ] Ein Flugzeug mit Hex `3D07B6` (Groß-/Kleinschreibung egal) und Callsign `DEBEC` zeigt `operator: "Sportfluggruppe Elz"` im Szenenzustand (Test).
- [ ] Der Satzbaustein Typ+Airline lautet für dieses Flugzeug „… der Sportfluggruppe Elz.“, in derselben Form wie bei Airlines (Test über `composeSpeechParts`/Sky-Service).
- [ ] Die Sichtung speichert `airline = "Sportfluggruppe Elz"`; es wird kein unmapped-Präfix gemeldet (Test).
- [ ] Ein Vereinseintrag schlägt eine Airline aus dem Callsign-Präfix (Vorrang-Test mit einem Callsign, das sonst eine Airline ergäbe).
- [ ] Flugzeuge ohne Vereinseintrag verhalten sich unverändert (bestehende Tests grün).
- [ ] Projekt-README beschreibt, wie man einen Verein und einen Vereinsflieger einträgt; airspace-README nennt den Begriff „Vereinsflieger“.

## Notes
- Captured 2026-10-30 via quick-capture, verfeinert 2026-11-01. Heimatplatz wird bewusst nicht angezeigt oder gesprochen.
- Auflösung heute: `resolveAirline` in `src/server/modules/airspace/typeclass.ts` (nur Callsign `^[A-Z]{3}[0-9]`), `identify()` in `src/server/modules/sky-scene/sky-service.ts` (~Zeile 90). Tabellen-Laden wie `airlines.json`.
- Schwestertask airspace-fehby (keine Route für Kennzeichen-Callsigns) ist unabhängig umsetzbar.
- Reale config.yaml anpassen: nein.
