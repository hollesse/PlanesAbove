---
id: liveries-w35k0
title: Entscheidung: Lackierungsdatei als JSON-Ebenenmodell, Silhouette und Detailschicht als SVG je Typklasse, eine gemeinsame Render-Funktion
status: todo
type: decision
context: liveries
created: 2026-10-31
completed:
depends_on: []
blocks: []
tags: [decision, foundation, livery-format]
related_adrs: [0031]
related_research: []
prior_art: []
---

## Why
ADR 0031 legt fest, dass eine Lackierung eine eigene Datei aus ungeschnittenen Pfadebenen und Logos ist, Silhouette und Detailschicht getrennt, Zuschnitt beim Anzeigen. Offen ist, wie das auf der Platte aussieht und wie es im dünnen Client (Safari 16, kein Framework), in Storybook und im Editor identisch zum Bild wird.

## What
ADR schreiben (Vorschlag: 0032, scope liveries) nach dem Architekten-Entwurf in den Notes.

## Acceptance criteria
- [ ] ADR committed unter `.agentheim/knowledge/decisions/`, Begründung entspricht dem Architekten-Entwurf in den Notes (oder der vom Betreiber geänderten Fassung); in die INDEX eingetragen.
- [ ] Keine Code-Änderung in diesem Task.
- [ ] Der Betreiber hat den Entwurf gelesen und die offenen Punkte in den Notes beantwortet oder bewusst offen gelassen. [human-eye]

## Notes
**Architekten-Entwurf (2026-10-31):**
- Pfad der Lackierungsdatei: `src/client/ui/assets/liveries/<liveryId>/<typklasse>.json` mit `{version, livery, typklasse, layers[]}`, Ebenen von unten nach oben.
- `PathLayer`: `points`, optional `via` je Segment (ein Punkt auf der Kurve; quadratischer Kontrollpunkt = 2·via − (a+b)/2), Farbe. `LogoLayer`: Quelle, `x`, `y`, `scale`, `rotation`. Zod-Schema in `domain/livery-file.ts`.
- Koordinatenraum: die vorhandene viewBox jeder Typklasse wird Teil des Vertrags.
- Silhouette und Detailschicht als SVG unter `assets/planes/<typklasse>/{silhouette,details}.svg`; Silhouette mit `<g id="body">` als reine Geometrie ohne Präsentationsattribute.
- Eine reine Funktion `renderLiverySvg` (`domain/livery-render.ts`) für sky-scene, Storybook und Editor. Schichtfolge: weißer Körper, zugeschnittene Pfade und Logos (clipPath aus der Silhouette, IDs je Render-Instanz eindeutig), Körper-Umriss (Stroke) obenauf, dann Details.
- `airline-liveries.json` bleibt Präfix → liveryId; die Typklassen-Dimension ergibt sich aus den vorhandenen Dateien über einen beim Build erzeugten Index, den Client und Server lesen.
- Befunde aus dem Code: Der Umriss ist heute ein 6px-Stroke auf den Farbflächen; durch den Zuschnitt verschwindet die innere Hälfte, daher Umriss über der Lackierung neu zeichnen. easyJet und Wizz färben Triebwerke: Triebwerkskörper gehört zur Silhouette, nur Einlassring und Fan in die Detailschicht.
- Verworfen: reines SVG als Lackierungsdatei, CSS `clip-path: path()`, Masken, Schlüssel `prefix|typklasse`.

**Offene Punkte für den Betreiber:** Wer teilt die 8 relevanten Silhouetten in Körper und Details (Claude Design oder von Hand)? Ist die Triebwerksgrenze richtig? Flügel liegen heute als eigene Teile hinter dem Rumpf: Zuschnitt auf die ganze Vereinigung, oder eigener Zuschnittbereich für den hinteren Flügel (der Durchstich zeigt es)? Behalten hochgeladene Logos die heutige SVG+PNG-Konvention unter `logos/`?
