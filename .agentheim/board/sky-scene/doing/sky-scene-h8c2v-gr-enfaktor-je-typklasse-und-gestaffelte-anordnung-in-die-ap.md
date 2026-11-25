---
id: sky-scene-h8c2v
title: Größenfaktor je Typklasse und gestaffelte Anordnung in die App übernehmen
status: doing
type: feature
context: sky-scene
created: 2026-11-01
depends_on: [design-system-q7mxe]
blocks: []
tags: [typklasse, silhouette, layout]
related_adrs: [0009]
related_research: []
prior_art: [design-system-q7mxe, design-system-pyheh]
---

## Why
Der Entwurf (design-system-q7mxe, Storybook) ist vom Betreiber abzunehmen; danach soll die App die Zwei-Flugzeuge-Ansicht mit gleich breiten Slots, Größenfaktor je Typklasse (Tabelle `domain/plane-size.ts`) und der in Flugrichtung gestaffelten Anordnung (hinten oben links, vorn unten rechts) statt der perspektivischen 50 %/33 %-Slots darstellen.

## What
- Gleich-groß-Slots (`pa-slot-eq-*`, `planeBox`) in den Szenen-Layer der App übernehmen, auch für Einzelflug und die Übergänge.
- Nur starten, wenn der Betreiber den Entwurf in Storybook abgenommen hat.

## Acceptance criteria
- [ ] App zeigt zwei Flugzeuge gleicher Klasse gleich groß, Größenverhältnisse nach Tabelle (±3 Prozentpunkte), gestaffelt in Flugrichtung, ohne Beschnitt (4:3 und 5:3).
- [ ] Übergänge kommt/geht/wechselt bleiben grün.
## Outcome (Abnahme durch den Chef offen)

Auftrag des Chefs 2026-11-25: Gleich-groß-Ansicht in die App übernehmen.

- `app.ts` rendert die Szene mit `renderScreenEqual` im Layout `versetzt` (gleich breite Slots `pa-slot-eq-*`, Größenfaktor je Typklasse aus `domain/plane-size.ts`, vorn = Nasenseite rechts tiefer). Übergänge über `EQUAL_TRANSITIONS` mit den Gleich-groß-Slot-Renderern und der Layout-Klasse an der Bühne; alle 11 Ids aus `pickTransition` sind abgedeckt.
- `templates/screen-equal.ts` kann jetzt alles, was `renderScreen` kann (Zuletzt-Leiste, Veraltet-Kopfzeile). Barrel exportiert Gleich-groß-Organism, -Template, -Übergänge und `plane-size`.
- Tippen auf Flugzeug/Plakette funktioniert unverändert (Selektoren `.pa-slot`, `.pa-badge-slot` gelten auch für die eq-Klassen).
- Tests: Unit `tests/unit/app.test.ts` (+2: eq-Slots mit Faktor je Typklasse, Übergang im eq-Layout), `npm test` 919 grün, typecheck grün. Neu `tests/e2e/app-equal-slots.spec.ts` (App mit Mock `two-planes`, 4:3 / 1180x820 / 5:3: gleiche Slotbreite, gestaffelt, Slots + Plaketten im Himmel über der Info-Leiste). E2E lief lokal nicht (Herdr-Box ohne Chromium-Systembibliotheken), läuft in der CI.
- Alte Klassen `pa-slot-one/-two/-single` und ihre Keyframes bleiben vorerst für die Storybook-Stories „Organisms/Szenen-Ebene“ und „Pages/Übergänge“ stehen; Aufräumen nach Abnahme.
