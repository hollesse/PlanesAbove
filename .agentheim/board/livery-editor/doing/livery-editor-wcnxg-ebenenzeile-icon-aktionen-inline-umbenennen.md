---
id: livery-editor-wcnxg
title: Ebenenzeile: Icon-Aktionen rechts (Stift, Pfeil hoch, Pfeil runter, Mülleimer), Umbenennen inline, Farbfeld öffnet den Farbpicker
status: doing
type: feature
context: livery-editor
created: 2026-11-01
completed:
depends_on: [livery-editor-nxdzh]
blocks: []
tags: [editor-feedback, ebenen]
related_adrs: [0035, 0037]
related_research: []
prior_art: [livery-editor-nxdzh]
---

## Why
Das Ebenenpanel funktioniert, aber die Aktionen liegen als Knopfleiste unter der Liste und Name/Farbe in separaten Feldern. Der Betreiber will die Aktionen je Zeile als Icon-Buttons rechts hinter dem Namen, Umbenennen inline und den Farbpicker direkt über das Farbfeld.

## What
Jede Ebenenzeile im Panel zeigt von links nach rechts: Sichtbarkeits-Schalter (wie heute), Farbfeld, Name (nimmt den Restplatz), dann rechts ausgerichtet vier Icon-Buttons in dieser Reihenfolge: **Stift** (umbenennen), **Pfeil hoch** (Ebene nach oben), **Pfeil runter** (Ebene nach unten), **Mülleimer** (löschen, ganz rechts). Die Icons sind inline SVG oder Unicode-Zeichen mit `aria-label`/`title` („Umbenennen“, „Nach oben“, „Nach unten“, „Löschen“); kein Icon-Font, keine Bibliothek.
- **Stift**: Klick macht den Namen der Zeile zu einem Textfeld (vorbelegt mit dem aktuellen Namen, Fokus im Feld) und den Stift zu einem **Haken**. Klick auf den Haken (oder Enter) speichert den Namen und zeigt wieder Text und Stift. Escape bricht ab und stellt den alten Namen wieder her. Nur eine Zeile ist gleichzeitig im Bearbeitungsmodus.
- **Farbfeld**: Klick öffnet den nativen Farbpicker (`<input type="color">`) für genau diese Ebene; Änderung färbt die Ebene sofort um. Das Farbfeld darf selbst das Input sein (gestylt) oder ein verstecktes Input anstoßen.
- Pfeile und Mülleimer wirken auf die Zeile, in der sie stehen, unabhängig von der Auswahl. Pfeil hoch in der obersten Zeile und Pfeil runter in der untersten Zeile sind deaktiviert.
- Die bisherige Aktionsleiste unter der Liste (`layer-up`, `layer-down`, `layer-delete`) und die separaten Felder `layer-name`/`path-color`-für-die-Auswahl entfallen, soweit sie durch die Zeilenaktionen ersetzt sind; der Farbwähler für den **nächsten** Pfad (Zeichenfarbe) bleibt.
- Logik bleibt in `tools/livery-editor/layers.ts` (unverändert); nur die Bedienung in `src/main.ts`/`index.html` ändert sich. Test-IDs je Zeile: `layer-rename-<i>`, `layer-rename-confirm-<i>`, `layer-name-input-<i>`, `layer-up-<i>`, `layer-down-<i>`, `layer-delete-<i>`, `layer-color-<i>`.

## Acceptance criteria
- [ ] Jede Zeile trägt die vier Icon-Buttons rechts in der Reihenfolge Stift, Pfeil hoch, Pfeil runter, Mülleimer, jeweils mit `aria-label` (Editor-E2E prüft Reihenfolge und Labels in einer Zeile).
- [ ] Stift → Textfeld mit altem Namen + Haken; Haken speichert den neuen Namen (Datei enthält ihn beim Speichern); Escape stellt den alten Namen wieder her (Editor-E2E).
- [ ] Pfeil hoch/runter verschieben genau die Zeile, in der sie stehen; in der obersten/untersten Zeile sind sie deaktiviert (Editor-E2E).
- [ ] Mülleimer löscht genau diese Ebene (Editor-E2E).
- [ ] Klick auf das Farbfeld einer Zeile öffnet den Farbpicker dieser Ebene; ein gesetzter Wert färbt die Ebene um (Editor-E2E setzt den Wert des Color-Inputs der Zeile und prüft die Farbe des Pfads im Brett).
- [ ] Bestehende Editor-E2E (Quad, Escape, Ebenenpanel-Reihenfolge, Rundung) bleiben grün, angepasst auf die neuen Test-IDs; `npm test`, `npm run typecheck`, `editor-chromium` grün.
- [ ] Die Zeile liest sich aufgeräumt: Name links, Aktionen rechts, nichts springt beim Umschalten in den Bearbeitungsmodus. [human-eye]

## Notes
Betreiber-Feedback vom 2026-11-01 nach dem Ausprobieren des Ebenenpanels (livery-editor-nxdzh). Direkt nach todo erfasst, weil die Anforderung vollständig beschrieben ist. Nicht in diesem Task: Logo-Ebenen, Drag-and-drop der Zeilen.
