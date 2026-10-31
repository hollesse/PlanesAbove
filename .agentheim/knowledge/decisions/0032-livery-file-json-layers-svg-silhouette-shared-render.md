---
id: 0032
title: Lackierungsdatei als JSON-Ebenenmodell mit Farbfeldern; Silhouette und Detailschicht als SVG je Typklasse; eine gemeinsame Render-Funktion
scope: liveries
status: accepted
date: 2026-10-31
supersedes: []
superseded_by: []
related_adrs: [0002, 0003, 0009, 0010, 0029, 0030, 0031]
related_tasks: [liveries-w35k0]
related_research: []
---

# ADR 0032: Lackierungsdatei als JSON-Ebenenmodell mit Farbfeldern; Silhouette und Detailschicht als SVG je Typklasse; eine gemeinsame Render-Funktion

Konkretisiert ADR 0031 (was eine Lackierung ist) auf Dateiebene. ADR 0009 bleibt bis zur einmaligen Umstellung (ADR 0031 Punkt 6) in Kraft.

## Context
ADR 0031 legt fest: Lackierung je Airline × Typklasse, ungeschnittene Pfade und Logos in einer eigenen Datei, Silhouette und Detailschicht getrennt, Zuschnitt beim Anzeigen, Triebwerke/Flügel/Höhenleitwerk als Farbfelder. Offen ist das Format auf der Platte und wie dasselbe Bild im dünnen Client (Safari 16, kein Framework), in Storybook und im Editor entsteht. Heute ist der Umriss ein 6-px-Stroke auf den Farbflächen; beim Zuschnitt verschwindet dessen innere Hälfte. easyJet und Wizz färben Triebwerke, was durch Farbfelder abgedeckt ist.

## Decision
1. **Lackierungsdatei:** `src/client/ui/assets/liveries/<liveryId>/<typklasse>.json`, Inhalt `{version, livery, typklasse, fields, layers[]}`. `layers` laufen von unten nach oben.
2. **`fields`:** `{ engines, wings, tailplane }`, je genau eine Farbe, keine Pfade. Ein Schlüssel fehlt, wenn die Silhouette dieser Typklasse das Farbfeld nicht hat (z. B. Segelflugzeug ohne Triebwerk).
3. **`PathLayer`:** `points`, optional `via` je Segment (ein Punkt auf der Kurve; quadratischer Kontrollpunkt = 2·via − (a+b)/2), Farbe. **`LogoLayer`:** Quelle, `x`, `y`, `scale`, `rotation`. Zod-Schema in `domain/livery-file.ts`; der Client validiert beim Laden, der Build beim Index.
4. **Koordinatenraum:** die vorhandene viewBox jeder Typklasse ist Teil des Vertrags; Silhouette, Details und Lackierungsdatei teilen sie.
5. **Silhouette und Detailschicht:** `assets/planes/<typklasse>/silhouette.svg` und `details.svg`. Die Silhouette enthält `<g id="body">` (Rumpf plus Finne, der Zuschnittbereich) und je Farbfeld eine Gruppe `<g id="field-engines">`, `field-wings`, `field-tailplane`; alles reine Geometrie ohne Präsentationsattribute. Die Detailschicht enthält Cockpitscheiben sowie Einlassring und Fan der Triebwerke.
6. **Eine reine Funktion `renderLiverySvg`** (`domain/livery-render.ts`) setzt das Bild für sky-scene, Storybook und Editor. Schichtfolge von unten: Farbfelder in ihrer Farbe, weißer Körper, Pfade und Logos zugeschnitten (clipPath aus `#body`; IDs je Render-Instanz eindeutig), Körper-Umriss (Stroke) obenauf, Details.
7. **Zuordnung:** `airline-liveries.json` bleibt Präfix → liveryId. Die Typklassen-Dimension ergibt sich aus den vorhandenen Dateien über einen beim Build erzeugten Index, den Client und Server lesen; fehlt die Datei, gilt die weiße Standard-Lackierung (ADR 0031 Punkt 1).
8. **Logos** bleiben fertige Dateien von außen; der Editor referenziert sie nur.

## Consequences
### Positive
- Ein Renderer für alle Orte: Storybook-Abnahme und Himmelsszene zeigen dasselbe Bild.
- Dateien sind klein, diffbar und von Hand lesbar; Silhouettenänderungen machen sie nicht ungültig.
- Der Umriss über der Lackierung bleibt in voller Stärke sichtbar.

### Negative
- Die acht relevanten Silhouetten müssen in Körper, Farbfelder und Details aufgeteilt werden (einmalige Arbeit).
- Der Client rendert Zuschnitt zur Laufzeit (clipPath), etwas mehr Arbeit als feste CSS-Flächen.
- Build erzeugt einen zusätzlichen Index.

### Neutral
- `via` statt Bézier-Kontrollpunkt macht Zeichnen mit dem Cursor greifbar, die Datei bleibt trotzdem kompakt.
- Typklassen ohne Triebwerksgondeln lassen das Farbfeld einfach weg.

## Alternatives considered
- **Reines SVG als Lackierungsdatei** — mischt Papas Ebenen mit Silhouette, Zuschnitt wäre eingebacken; Editor müsste SVG parsen und rückschreiben.
- **CSS `clip-path: path()`** — in Safari 16 für diesen Zweck unzuverlässig, nicht pro Ebene mit IDs steuerbar.
- **Masken statt clipPath** — mehr Rechenaufwand, kein Gewinn bei harten Kanten.
- **Schlüssel `prefix|typklasse` in `airline-liveries.json`** — vervielfacht die Zuordnung; der Dateiindex liefert dieselbe Information ohne Pflege.

## Offene Punkte
- Wer teilt die acht relevanten Silhouetten in Körper, Farbfelder und Details auf: Claude Design oder von Hand?
- Behalten hochgeladene Logos die heutige SVG+PNG-Konvention unter `logos/`?

## References
- ADR 0031 (Lackierung als ungeschnittene Pfaddatei, Farbfelder), ADR 0009, ADR 0010, ADR 0030
- Vision, Abschnitt „Lackierungs-Editor"
- Code: `src/client/ui/domain/livery.ts`, `src/client/ui/molecules/painted-plane.ts`, `src/client/ui/assets/svg/`
