---
id: livery-editor-nxdzh
title: Ebenenpanel: Pfade als Ebenen sehen, auswählen, umsortieren, ein-/ausblenden, löschen, färben, benennen
status: done
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

## Outcome
Ebenenpanel im Editor: Liste oben zuerst, je Zeile Sichtbarkeits-Checkbox, Farbfeld, Name; Auswahl hebt den Pfad im Brett mit gestricheltem Umriss hervor; Aktionen Nach oben/unten, Löschen, Farbe, Name. Ein frisch geschlossener Pfad ist ausgewählt. Der ausgewählte Index liegt in `state.selected` (und als `data-selected` auf `#board`) für das spätere Kurvenwerkzeug. Sichtbarkeit ist ein zu `layers` paralleles `state.hidden`; das Brett rendert `visibleFile(file, hidden)`, gespeichert wird die volle Datei.

Reine Logik in `tools/livery-editor/layers.ts` (`moveLayer`, `removeLayer`, `recolorLayer`, `renameLayer`, `layerLabel`, `visibleFile`, generisches `moveItem`/`removeItem` für die parallele Sichtbarkeit), getestet in `layers.test.ts`. `PathLayerSchema`/`LogoLayerSchema` haben optionales `name` (max 40), Test in `tests/unit/livery-file.test.ts`.

E2E (`tests/e2e-editor/draw-and-compare.spec.ts`): zwei überlappende Pfade zeichnen, benennen, Reihenfolge tauschen, ausblenden (Datei behält beide Ebenen), speichern, Datei == neue Fixture `src/client/ui/assets/liveries/stack-order/narrowbody.json`, Pixelvergleich mit deren generierter Story `liveries-pfade--stack-order-narrowbody`. Die Screenshot-Hilfe blendet das Editor-Overlay (Auswahlumriss/Entwurf) aus, sonst wäre es nicht Teil des Vergleichs. Hinweis: neue committete Lackierung `stack-order` erscheint als zusätzlicher Eintrag in `LIVERY_FILES`. Das [human-eye]-Kriterium bleibt dem Betreiber.
