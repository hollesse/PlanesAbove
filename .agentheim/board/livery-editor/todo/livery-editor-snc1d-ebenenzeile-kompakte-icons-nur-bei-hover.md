---
id: livery-editor-snc1d
title: Ebenenzeile: kompakte Icon-Buttons, nur bei Hover oder Auswahl sichtbar, Name bekommt die ganze Breite
status: todo
type: feature
context: livery-editor
created: 2026-11-01
completed:
depends_on: [livery-editor-wcnxg]
blocks: []
tags: [editor-feedback, ebenen]
related_adrs: [0035, 0037]
related_research: []
prior_art: [livery-editor-wcnxg]
---

## Why
Die vier Icon-Buttons je Ebenenzeile erben das globale `button { padding: 6px 10px }` und nehmen im 280 px breiten Panel so viel Platz, dass der Name nur sehr kurz sein kann. Betreiber-Entscheidung: Icons kompakt und nur bei Hover oder Auswahl sichtbar.

## What
1. **Kompakt:** eigene Regel für `.layer-actions button`: 22×22 px, `padding: 0`, Icon ca. 14 px, Abstand 2 px; kein Rahmen-Hintergrund außer bei Hover/Fokus. Das Farbfeld bleibt 22 px. Panel-Breite auf 320 px.
2. **Nur bei Hover oder Auswahl:** `.layer-actions` ist in Ruhe unsichtbar (`opacity: 0`, `pointer-events: none`) und wird sichtbar (`opacity: 1`, `pointer-events: auto`) bei `.layer-row:hover`, `.layer-row.selected` und `.layer-row:focus-within` (Tastatur). Die Aktionen behalten ihren Platz nur, wenn sie sichtbar sind: in Ruhe `width: 0; overflow: hidden` (oder `display: contents`-frei per `max-width`-Übergang), damit der Name die ganze Breite bekommt und beim Einblenden nichts außerhalb der Zeile springt; ein kurzer Übergang (≤ 120 ms) ist in Ordnung.
3. Im Bearbeitungsmodus (Textfeld + Haken) bleiben die Aktionen sichtbar, solange das Feld Fokus hat (`:focus-within`).
4. Keine Logikänderung, nur `tools/livery-editor/index.html` (Styles) und minimal `src/main.ts`, falls Klassen nötig sind. Test-IDs bleiben.

## Acceptance criteria
- [ ] Jeder Icon-Button in `.layer-actions` ist höchstens 24×24 px groß (Editor-E2E misst die Bounding-Box).
- [ ] In Ruhe sind die Aktionen einer nicht ausgewählten Zeile unsichtbar (`opacity 0`) und nicht klickbar; bei Hover über der Zeile und bei ausgewählter Zeile sind sie sichtbar und klickbar (Editor-E2E: Hover → Klick auf Mülleimer funktioniert; ohne Hover ist die berechnete Opacity 0).
- [ ] Der Name einer nicht ausgewählten Zeile in Ruhe ist mindestens 180 px breit (Editor-E2E misst die Bounding-Box des Labels bei Panelbreite 320 px).
- [ ] Während des Umbenennens bleiben Textfeld und Haken sichtbar, auch wenn die Maus die Zeile verlässt (Editor-E2E: Stift klicken, Maus wegbewegen, Haken ist sichtbar und klickbar).
- [ ] Bestehende Editor-E2E (Quad, Escape, Ebenenpanel, Rundung, Ebenenzeile) bleiben grün; Tests, die Zeilen-Icons klicken, hovern vorher die Zeile oder wählen sie aus. `npm test`, `npm run typecheck`, `editor-chromium` grün.
- [ ] Die Zeile wirkt ruhig: Name in voller Breite, Icons erscheinen weich beim Überfahren, nichts springt. [human-eye]

## Notes
Betreiber-Feedback vom 2026-11-01 nach livery-editor-wcnxg; gewählt aus drei Vorschlägen (kompakt + Hover). Direkt nach todo. Nicht in diesem Task: Mehr-Menü, zweizeilige Ebenen.
