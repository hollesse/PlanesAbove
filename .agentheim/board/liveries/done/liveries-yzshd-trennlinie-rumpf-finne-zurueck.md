---
id: liveries-yzshd
title: Trennlinie zwischen Rumpf und Finne wieder sichtbar machen
status: done
type: bug
context: liveries
created: 2026-11-01
completed:
depends_on: [design-system-001-styleguide]
blocks: []
tags: [editor-feedback, silhouette, outline]
related_adrs: [0031, 0032]
related_research: []
prior_art: [livery-editor-zc7hk]
---

## Why
In der Altgrafik ist die Trennlinie zwischen Rumpf und Finne sichtbar: Der Rumpf-Umriss wird vollständig gezeichnet, auch durch die Finnenbasis hindurch, und der Finnen-Umriss nur außerhalb des Rumpfs. Der Spike hat Rumpf und Finne in `#body` zu einer Kontur vereinigt; damit ist die Linie weg. Das soll so nicht (Betreiber-Entscheidung: wie die Altgrafik).

## What
Die Silhouette bekommt getrennte Umriss-Geometrie für Rumpf und Finne; der Zuschnitt-Bereich für Pfade bleibt die Vereinigung aus Rumpf und Finne (ADR 0031 Punkt 4a: Pfadfläche = Rumpf + Finne).
1. `silhouette.svg` (narrowbody): neben `<g id="body">` (Vereinigung, bleibt der clipPath) zwei Umriss-Pfade `<path id="outline-fuselage">` (Rumpfkontur komplett, aus `fuselage-outline` der Altgrafik) und `<path id="outline-fin">` (Finnenkontur, aus `tail-outline`).
2. `scripts/build-assets.mjs` liefert `outlines` je Typklasse in `generated/plane-parts.ts` (Fallback: wenn keine Outline-Pfade vorhanden sind, ist `#body` der Umriss, damit künftige Typklassen weiter funktionieren).
3. `renderLiverySvg`: Schicht `lv-outline` zeichnet erst den Finnen-Umriss maskiert auf „außerhalb des Rumpfs“ (SVG `<mask>` mit Rumpf-Fläche schwarz, Rest weiß, ID je Render-Instanz wie der clipPath), dann den Rumpf-Umriss vollständig. Ergebnis: Die Rumpfoberkante läuft als Linie über die Finnenbasis.

## Acceptance criteria
- [ ] `renderLiverySvg` für narrowbody enthält zwei Umriss-Pfade; der Rumpf-Umriss wird ungemaskt gezeichnet, der Finnen-Umriss mit einer Maske, deren ID die Render-Instanz trägt (Unit-Test; zwei Renders im selben Dokument haben verschiedene Mask-IDs).
- [ ] Der clipPath für Pfade ist weiterhin `#body` (Vereinigung); ein Rumpf-Pfad, der in die Finne ragt, wird dort nicht beschnitten (bestehender Zuschnitt-Test bleibt grün).
- [ ] Typklassen ohne Outline-Pfade (Fallback) rendern wie bisher (Unit-Test mit synthetischen Parts).
- [ ] `npm test`, `npm run typecheck`, WebKit-Story-Lauf und `editor-chromium` grün.
- [ ] Im Editor und in der Story ist die Trennlinie zwischen Rumpf und Finne sichtbar wie in der Altgrafik. [human-eye]

## Notes
Refined 2026-11-01 aus dem Betreiber-Feedback zum Editor-Spike livery-editor-zc7hk (Kriterium [human-eye]). Im Spike-Outcome steht die Vereinigung als Vereinfachung („kein Mask-Trick nötig“); dieser Task nimmt den Mask-Trick aus der Altgrafik (`narrowbody-ol-mask`) wieder auf. Keine Änderung an der Lackierungsdatei.

## Outcome
silhouette.svg hat neben #body die Pfade outline-fuselage und outline-fin (Koordinaten 1:1 aus der Altgrafik). build-assets liefert optional `outlines` je Typklasse (Fallback: #body als Umriss). renderLiverySvg zeichnet in lv-outline erst den Finnen-Umriss mit Maske (ID `lvN-ol-mask`, Rumpf schwarz), dann den Rumpf-Umriss ungemaskt; clipPath bleibt #body. Tests: livery-render.test.ts (Masken-IDs, Clip, Fallback); npm test, typecheck, webkit und editor-chromium grün. [human-eye]-Kriterium offen für den Betreiber.
