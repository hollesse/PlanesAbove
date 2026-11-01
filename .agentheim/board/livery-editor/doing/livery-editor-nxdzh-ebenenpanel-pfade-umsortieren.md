---
id: livery-editor-nxdzh
title: Ebenenpanel: Pfade als Ebenen sehen, auswählen, umsortieren, ein-/ausblenden, löschen, färben, benennen
status: doing
type: feature
context: livery-editor
created: 2026-11-01
completed:
depends_on: []
blocks: []
tags: [editor-feedback, ebenen]
related_adrs: [0031, 0032, 0035]
related_research: []
prior_art: [livery-editor-zc7hk]
---

## Why
Es fehlt, dass man die Pfade als Ebenen sieht und verschieben kann, was weiter oben und was weiter unten liegt (README-Begriff „Ebene“).

## What
Ein Ebenenpanel neben dem Zeichenbrett listet die Ebenen der Lackierung von oben nach unten (oberste Ebene zuerst, Stapelreihenfolge = Reihenfolge in `layers`, letzte Ebene zuoberst). Je Ebene: Name, Farbfeld, Sichtbarkeits-Schalter. Eine Ebene ist auswählbar; die ausgewählte Ebene wird im Brett hervorgehoben (Umriss). Aktionen auf der Auswahl: nach oben, nach unten, löschen, Farbe ändern (Farbpicker), umbenennen. Ausgeblendete Ebenen werden im Editor nicht gezeichnet, in der Datei aber behalten; die Himmelsszene und die Story zeichnen alle Ebenen (Sichtbarkeit ist Editor-Zustand, nicht Datei-Inhalt). Namen werden gespeichert: `PathLayerSchema` und `LogoLayerSchema` bekommen ein optionales Feld `name` (max. 40 Zeichen); ohne Namen zeigt das Panel „Pfad n“.
Reine Logik (`moveLayer`, `removeLayer`, `recolorLayer`, `renameLayer`) in `tools/livery-editor/layers.ts`, Bedienung in `src/main.ts`.

## Acceptance criteria
- [ ] `layers.ts`: hoch/runter vertauscht Nachbarn und stoppt an den Rändern; löschen entfernt genau die Ebene; färben und umbenennen ändern nur die Ebene; alle Funktionen sind rein (Unit-Tests).
- [ ] `livery-file.ts`: optionales `name` wird validiert (Roundtrip-Test; > 40 Zeichen abgelehnt); bestehende Dateien ohne `name` bleiben gültig.
- [ ] Speichern schreibt die Ebenen in der im Panel gezeigten Reihenfolge; die Story rendert dieselbe Reihenfolge (Editor-E2E: zwei überlappende Pfade, Reihenfolge tauschen, speichern, Pixelvergleich mit der Story grün).
- [ ] Ausblenden einer Ebene entfernt sie aus dem Brett, nicht aus der gespeicherten Datei (E2E oder Unit-Test über den Render-Aufruf).
- [ ] `npm test`, `npm run typecheck`, `editor-chromium` grün.
- [ ] Das Panel liest sich wie ein Ebenenstapel: oben ist oben. [human-eye]

## Notes
Refined 2026-11-01 aus dem Betreiber-Feedback zum Editor-Spike livery-editor-zc7hk (Kriterium [human-eye]). Die Schema-Erweiterung um `name` liegt im Format des BC liveries (ADR 0032); sie ist additiv und optional, deshalb hier im Editor-Task mit erledigt und nicht als eigener liveries-Task. Konflikt-Hinweis: teilt `src/main.ts` mit hz0hb und ec2zz.
