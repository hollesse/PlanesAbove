---
id: livery-editor-v90sn
title: Auswahl aufheben (Panel-Klick auf die gewählte Zeile, Escape) und Vorschau mit gehaltener Leertaste ohne Overlay
status: doing
type: feature
context: livery-editor
created: 2026-11-01
completed:
depends_on: [livery-editor-rtnx3]
blocks: []
tags: [editor-feedback, ebenen, zeichenbrett]
related_adrs: [0035, 0037]
related_research: []
prior_art: [livery-editor-nxdzh, livery-editor-rtnx3]
---

## Why
Heute ist immer eine Ebene ausgewählt, und ihr Auswahlumriss, die Eckmarker und Rundungsgriffe liegen über dem Bild. Papa will das Ergebnis kurz ohne Overlay ansehen und auch den Zustand „nichts ausgewählt“ haben. Betreiber-Entscheidung: Variante 3 von drei Vorschlägen.

## What
1. **Auswahl aufheben:** Klick auf die bereits ausgewählte Zeile im Ebenenpanel setzt `state.selected = null`. Escape ohne laufenden Entwurf (Entwurf hat 0 Punkte) tut dasselbe; Escape mit laufendem Entwurf verwirft wie bisher nur den Entwurf. Bei `selected = null` zeigt das Overlay keinen Auswahlumriss, keine Eckmarker, keine Rundungsgriffe; keine Zeile ist hervorgehoben; Griffe für Entwurfssegmente bleiben. Ein Klick aufs Brett setzt wie bisher sofort den ersten Punkt (das Brett selbst deselektiert nie). Nach dem Schließen eines Pfads ist die neue Ebene wie bisher ausgewählt.
2. **Vorschau:** Solange die Leertaste gehalten wird (und kein Textfeld den Fokus hat), bekommt `#board` die Klasse `preview`: das gesamte Overlay (Auswahl, Marker, Griffe, Entwurfspunkte) ist ausgeblendet (`visibility: hidden`), Mausklicks aufs Brett sind währenddessen wirkungslos. Beim Loslassen ist alles wieder da, die Auswahl bleibt. Kein Toggle, nur Halten.
3. Bedienung in `tools/livery-editor/src/main.ts` und Styles in `index.html`; keine Logikänderung in `layers.ts`/`curve.ts`.

## Acceptance criteria
- [ ] Klick auf die ausgewählte Ebenenzeile hebt die Auswahl auf: keine Zeile `.selected`, Overlay ohne `selection-outline`, `vertex-handle-*`, `curve-handle-*` (Editor-E2E); erneuter Klick auf die Zeile wählt sie wieder.
- [ ] Escape ohne Entwurf hebt die Auswahl auf; Escape mit Entwurf verwirft nur den Entwurf und lässt die Auswahl stehen (Editor-E2E).
- [ ] Ohne Auswahl setzt ein Klick aufs Brett den ersten Entwurfspunkt; nach dem Schließen ist die neue Ebene ausgewählt (Editor-E2E).
- [ ] Leertaste gedrückt: Overlay unsichtbar (`visibility: hidden`), Auswahl bleibt erhalten, Klick aufs Brett setzt keinen Punkt; Leertaste losgelassen: Overlay wieder sichtbar, Auswahl unverändert (Editor-E2E mit `keyboard.down/up`).
- [ ] Leertaste in einem Textfeld (Umbenennen, Lackierungs-ID) tippt ein Leerzeichen und löst keine Vorschau aus (Editor-E2E).
- [ ] Bestehende Editor-E2E grün; `npm test`, `npm run typecheck`, `editor-chromium` grün.
- [ ] Der kurze Blick aufs Ergebnis fühlt sich wie in Photoshop an: Leertaste halten, sehen, loslassen, weitermachen. [human-eye]

## Notes
Betreiber-Feedback vom 2026-11-01. Direkt nach todo. Baut auf nxdzh (Panel, `state.selected`) und rtnx3/ec2zz (Overlay-Griffe) auf.
