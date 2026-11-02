---
id: livery-editor-jrh3c
title: Farbpalette der Airline - die in ihren Lackierungen schon genutzten Farben als Felder zum Anklicken, damit alle Typklassen dieselben Farben bekommen
status: doing
type: feature
context: livery-editor
created: 2026-11-02
completed:
depends_on: []
blocks: []
tags: [farbwahl, palette, editor-ui]
related_adrs: [0034]
related_research: []
prior_art: [livery-editor-wcnxg, livery-editor-nxdzh]
---

## Why
Papa zeichnet dieselbe Airline auf mehreren Typklassen (Narrowbody, Widebody, …). Die Farben sollen auf
allen Maschinen exakt gleich sein; heute muss er den Hexwert aus der alten Datei abschreiben oder im
Farbpicker nach Augenmaß treffen.

## What
Eine **Airline-Palette** im Editor: eine Reihe Farbfelder mit allen Farben, die in den Lackierungen der
gewählten Airline schon vorkommen.

- **Quelle:** alle gespeicherten Lackierungsdateien derselben Airline (`LIVERY_FILES`, Schlüssel
  `<livery>/<typklasse>`, alle Typklassen) plus der gerade offene Entwurf (`state.file`, live, auch
  ungespeichert). Gezählt werden Pfad-Farben (`layers[].color` der Pfad-Ebenen) und die Farbfelder
  (`fields.engines/wings/tailplane`). Logos tragen keine Farbe.
- **Dedupliziert** ohne Unterschied von Groß-/Kleinschreibung (`#1A1476` = `#1a1476`), angezeigt
  kleingeschrieben; Reihenfolge nach Häufigkeit über alle Dateien (häufigste zuerst), bei Gleichstand
  stabil nach erstem Vorkommen.
- **Klick auf ein Feld:** ist eine Pfad-Ebene gewählt, bekommt sie diese Farbe (wie über ihr Farbfeld im
  Ebenenpanel); ist nichts (oder eine Logo-Ebene) gewählt, wird sie zur Zeichenfarbe für den nächsten Pfad
  (`state.pathColor`, das Feld „Farbe“ zieht mit).
- Jedes Feld hat Hexwert als Tooltip/aria-label.
- Wechselt die Airline (Livery-ID oder Auswahl aus den Sichtungen), wird die Palette neu berechnet; ändert
  sich eine Farbe im Entwurf, ebenso.
- Gibt es für die Airline noch keine Farbe (neue Airline, leeres Brett), zeigt die Palette einen kurzen
  Hinweis statt einer leeren Reihe.

Editor-eigene UI — liegt außerhalb des Storybook-Gates (ADR 0034), kein `design-system-001`-Dependency.
Reine Ableitung aus Dateien, kein neues Dateiformat, kein Server-Endpunkt.

## Acceptance criteria
- [ ] Eine reine Funktion (z. B. `airlinePalette(liveryId, files, current)`) liefert die deduplizierten,
      nach Häufigkeit sortierten Farben aus allen Typklassen-Dateien der Airline plus dem aktuellen Entwurf;
      Unit-Tests decken ab: mehrere Typklassen, Groß-/Kleinschreibung, Farbfelder werden mitgezählt,
      Logo-Ebenen ignoriert, andere Airlines ignoriert, leere Eingabe → leere Liste.
- [ ] Der Editor zeigt die Palette als Reihe von Farbfeldern (`data-testid="palette-swatch"`, `data-color`
      mit dem Hexwert); bei leerer Palette einen Hinweis (`data-testid="palette-empty"`).
- [ ] E2E: Für eine Airline mit gespeicherter Lackierung erscheinen deren Farben in der Palette, auch wenn
      eine andere Typklasse geöffnet ist.
- [ ] E2E: Klick auf ein Feld bei gewählter Pfad-Ebene färbt diese Ebene (Ebenen-Farbfeld und Brett zeigen
      die Farbe); ohne Auswahl setzt der Klick die Zeichenfarbe, der nächste gezeichnete Pfad trägt sie.
- [ ] E2E: Eine im Entwurf neu verwendete Farbe erscheint ohne Speichern in der Palette.
- [ ] Die bestehende Editor-E2E-Suite bleibt grün (Default-Viewport 1280 px; die Palette darf das Brett
      nicht überdecken — siehe CI-Fehler mit dem Fotopanel, 35f56b5).
- [ ] Die Palette sitzt erkennbar bei der Farbwahl und stört den Zeichenfluss nicht. [human-eye]

## Notes
- Farbpicker je Ebene: `tools/livery-editor/src/main.ts` (`layer-color-<i>`, `recolorLayer`), Zeichenfarbe
  `path-color`, Farbfelder `field-engines/wings/tailplane`.
- `LIVERY_FILES` kommt aus `src/client/ui/assets/generated/liveries`; die Palette spiegelt nur gespeicherte
  (und per `build-assets` generierte) Dateien plus den offenen Entwurf. Eine gerade gespeicherte andere
  Typklasse taucht erst nach dem Regenerieren des Index auf — akzeptiert.
- Offen für später (nicht in diesem Task): Farben benennen („Lufthansa-Blau“), Palette auch in Farbfeldern
  (engines/wings/tailplane) per Klick setzen.
