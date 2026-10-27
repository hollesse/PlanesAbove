---
id: design-system-h3b7q
title: Lange Route in der Info-Leiste: drei Alternativen als Storybook-Entwürfe, Betreiber wählt eine
status: todo
type: spike
context: design-system
created: 2026-10-27
completed:
depends_on: [design-system-001-styleguide, design-system-z9rzp]
blocks: [design-system-grp94]
tags: [info-leiste, route, layout, storybook, spike]
related_adrs: [0002, 0021]
related_research: []
prior_art: [design-system-001]
---

## Why
Die große Routenzeile (`.pa-route-large`, `white-space: nowrap`, 5cqw bzw. 3.3cqw) passt bei zwei langen Flughafennamen nicht mehr in die Breite: „Santiago de Compostela (SCQ) → Jerez de la Frontera (XRY)" (57 Zeichen) braucht bei 5cqw rund die doppelte Bildschirmbreite. Der Betreiber will die Lösung nicht blind festlegen, sondern erst drei Entwürfe in Storybook sehen (ADR 0002, Storybook-first) und dann entscheiden. Mehrleg-Routen zeigen künftig nur Start → Ende (airspace-cn6t7); der Worst Case sind also zwei lange Namen, nicht drei.

## What
Zusätzliche Stories unter „Organisms/Info-Leiste · Entwürfe lange Route", je Variante Einzelansicht und Zwei-Flugzeuge-Ansicht, mit Beispieldaten „Santiago de Compostela (SCQ) → Jerez de la Frontera (XRY)" und Eyebrow mit „· über Sharjah". Nur Story-lokales CSS (Klassen mit Präfix `pa-draft-`), Komponenten und `ui.css` bleiben unverändert. In keiner Variante bricht ein Flughafenname innerhalb des Namens um.

- **A – erst kleiner, dann umbrechen:** Größenstufe nach Länge des längsten Namens (bis 16 Zeichen voll, bis 22 etwa 80 %, darüber etwa 65 %); reicht das nicht, Umbruch nur vor dem Pfeil (zweite Zeile beginnt mit „→").
- **B – Umbruch vor dem Pfeil plus Stufe:** immer zwei Zeilen, sobald die Route länger als eine Schwelle ist, dazu dieselbe Größenstufe.
- **C – einzeilig, nur Verkleinerung:** keine zweite Zeile, Schrift schrumpft nach Gesamtlänge bis sie passt (Minimum definieren).

Jede Variante bekommt zusätzlich einen Normalfall („Frankfurt (FRA) → New York (JFK)"), damit sichtbar ist, dass kurze Routen unverändert bleiben.

**Stop-loss (ADR 0065):** Ist mid-spike nach der ersten gebauten Variante bereits klar, dass sie genügt (oder eine Variante offensichtlich ausscheidet), das festhalten und abbrechen; nicht alle drei um ihrer selbst willen fertigstellen. If, mid-spike, the mitigation is already known and cheap, record it and stop.

## Acceptance criteria
- [ ] Storybook enthält die Entwurfs-Stories (Variante A, B, C je Einzel- und Zwei-Flugzeuge-Ansicht plus Normalfall); `npm run e2e:chromium` (alle Stories rendern fehlerfrei) ist grün.
- [ ] Komponenten (`info-bar.ts`, `info-row.ts`) und `ui.css` sind unverändert (Diff berührt nur `src/client/ui/stories/`).
- [ ] In jeder Variante liegt der gesamte Routentext innerhalb des Info-Leisten-Containers (kein Überlauf), nachweisbar per Bounding-Box in der Story bei 4:3 und 5:3.
- [ ] Der Betreiber hat eine Variante gewählt; die Wahl steht in den Notes dieses Tasks und im Task design-system-grp94. [human-eye]

## Notes
- Betreiber-Wunsch 2026-10-27: „erstmal nur extra Designs in Storybook anlegen, ohne die Implementierung zu ändern, dann drei Alternativen designen und entscheiden."
- Einstiegspunkte: `src/client/ui/stories/info-bar.stories.ts`, `info-row.stories.ts`, `src/client/ui/domain/samples.ts`, `src/client/ui/styles/ui.css` (nur lesen).
- Nachfolger: design-system-grp94 setzt die gewählte Variante um und bringt den Playwright-Test mit den zwei längsten Namen.
