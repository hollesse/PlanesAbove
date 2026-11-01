---
id: livery-editor-gn6gp
title: Logo-Ebene: vorhandenes Logo wählen, auf dem Brett platzieren (Transform-Rahmen: verschieben, skalieren, drehen), gerendert in Szene, Story und Editor
status: backlog
type: feature
context: livery-editor
created: 2026-11-01
completed:
depends_on: [livery-editor-rtnx3, livery-editor-v90sn]
blocks: [livery-editor-q0xd2]
tags: [editor-feedback, logo, ebenen]
related_adrs: [0031, 0032, 0035]
related_research: []
prior_art: [livery-editor-nxdzh, livery-editor-rtnx3, livery-editor-ec2zz]
---

## Why
Lackierungen brauchen Airline-Logos auf Finne und Rumpf. Laut ADR 0031/0032 kommen Logos fertig als Datei von außen; der Editor platziert sie nur (README: „Logo“). `LogoLayer` existiert im Schema, aber weder Renderer noch Editor kennen es.

## What
1. **Rendering (liveries-Format, ADR 0032 §6):** `renderLiverySvg` zeichnet `LogoLayer` in der Ebenenreihenfolge zusammen mit den Pfaden, zugeschnitten wie Pfade (gleicher clipPath/Maske). `src` ist der Schlüssel im generierten `LOGO_SVG`-Index (`src/client/ui/assets/svg/logos/<name>.svg`, PNGs sind dort bereits als data-URI eingebettet). Das Logo-SVG wird inline als `<g transform="translate(x y) rotate(rotation) scale(scale)"><svg viewBox=… width=… height=…>…</svg></g>` eingebettet; Bezugspunkt ist die Logo-Mitte (Breite/Höhe aus der viewBox des Logos). Unbekannter `src` → gestricheltes Platzhalter-Rechteck, kein Fehler. Editor-Vorschau (Deckkraft-Regler) zeigt Logos wie Pfade.
2. **Panel „Logo“:** Liste der vorhandenen Logos aus `LOGO_SVG` (Name + kleine Vorschau); Klick legt eine `LogoLayer` mittig auf dem Rumpf an (`scale` so, dass das Logo ~120 Brett-Einheiten breit ist, `rotation` 0) und wählt sie aus. Logo-Ebenen erscheinen im Ebenenpanel wie Pfade (Name = Logoname, Farbfeld entfällt/ausgegraut, Umbenennen/Verschieben/Löschen/Sichtbarkeit wie gehabt).
3. **Transform-Rahmen (Betreiber-Entscheidung):** Ist eine Logo-Ebene ausgewählt, zeigt das Overlay einen Rahmen um das Logo: Ziehen im Rahmen verschiebt (`x`,`y`), vier Eckgriffe skalieren proportional um die Mitte (`scale`), ein Griff oberhalb der Mitte dreht (`rotation` in Grad); mit Shift rastet die Drehung auf 15°-Schritte. Reine Geometrie in `tools/livery-editor/logo.ts` (`logoFrame(layer, size)`, `scaleFromCorner`, `rotationFromHandle`, `snapRotation`), Bedienung in `src/main.ts` nach dem Muster der Eck-/Rundungsgriffe (`handleGesture`, Leertaste-Vorschau blendet den Rahmen aus).
4. Speichern schreibt die `LogoLayer` (Schema unverändert: `src`, `x`, `y`, `scale`, `rotation`, optional `name`).

## Acceptance criteria
- [ ] `renderLiverySvg` rendert eine `LogoLayer` an Position/Skalierung/Drehung, zugeschnitten wie Pfade, in Ebenenreihenfolge; unbekannter `src` ergibt einen Platzhalter; narrowbody/widebody-Snapshot ohne Logos bleibt byte-gleich (Unit-Tests).
- [ ] `logo.ts`: Rahmen-Ecken aus Layer + Logogröße; Eckziehen liefert neue `scale` (proportional, Mitte fix); Drehgriff liefert Winkel; Shift rastet auf 15° (Unit-Tests).
- [ ] Editor-E2E: Logo aus der Liste wählen → Logo-Ebene im Panel und auf dem Brett; verschieben, Eck- und Drehgriff ziehen ändern `x/y`, `scale`, `rotation`; speichern → Datei deep-equal Fixture `liveries/logo-test/narrowbody.json` (ein Pfad + ein Logo); Pixelvergleich mit der Story grün.
- [ ] Logo-Ebene im Ebenenpanel: umbenennen, umsortieren, ausblenden, löschen funktionieren (E2E; vorhandene Panel-Tests grün).
- [ ] Bestehende Editor-E2E grün; `npm test`, `npm run typecheck`, WebKit-Story-Lauf und `editor-chromium` grün.
- [ ] Verschieben, Skalieren und Drehen fühlen sich wie ein Photoshop-Transform-Rahmen an. [human-eye]

## Notes
Refined 2026-11-01 (Betreiber: Transform-Rahmen; vorhandene Logos + Upload, Upload als eigener Task livery-editor-q0xd2). Logos werden wie Pfade zugeschnitten (ADR 0032 §6); ein Logo über einem Farbfeld (Flügel) wird also abgeschnitten — bewusst, Logos gehören auf Rumpf und Finne. Konflikt-Hinweis: `src/main.ts`, `livery-render.ts`.
