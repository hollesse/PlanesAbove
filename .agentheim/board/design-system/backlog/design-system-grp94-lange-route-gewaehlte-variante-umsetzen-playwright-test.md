---
id: design-system-grp94
title: Lange Route: gewählte Variante in der Info-Leiste umsetzen; Playwright-Test (WebKit) mit den zwei längsten Flughafennamen
status: backlog
type: feature
context: design-system
created: 2026-10-27
completed:
depends_on: [design-system-001-styleguide, design-system-h3b7q, airspace-cn6t7]
blocks: []
tags: [info-leiste, route, layout, e2e, webkit]
related_adrs: [0002, 0003, 0004, 0021]
related_research: []
prior_art: [design-system-001]
---

## Why
Nach dem Entwurfs-Spike design-system-h3b7q steht fest, wie überlange Routen aussehen sollen. Diese Umsetzung bringt die Variante in die echte Komponente und belegt mit einem automatischen Test, dass die längsten Flughafennamen der Tabelle (ADR 0021) vollständig sichtbar bleiben. Das Projekt nutzt Playwright, Pflichtziel WebKit (ADR 0003/0004).

## What
- Gewählte Variante (siehe Notes von design-system-h3b7q) in `info-bar.ts`/`info-row.ts` und `ui.css` umsetzen; Entwurfs-Stories entfernen oder zur regulären Story „längste Route" zusammenziehen.
- Die zwei längsten Einträge der Flughafen-Tabelle werden aus `tables/airports.json` ermittelt (heute „Santiago de Compostela (SCQ)" und „Jerez de la Frontera (XRY)"), nicht geraten; der Test liest sie zur Laufzeit aus der Tabelle, damit er mit der Tabelle mitwächst.
- Playwright-Test in `tests/e2e/`: Story mit dieser Route in Einzel- und Zwei-Flugzeuge-Ansicht bei 4:3 und 5:3 rendern; Bounding-Box jedes Routen-Teils liegt innerhalb des Routen-Containers, kein horizontaler Überlauf (`scrollWidth <= clientWidth`).

## Acceptance criteria
- [ ] Bleibt offen bis h3b7q entschieden ist: Variante ist in den Notes benannt.
- [ ] Playwright-Test rendert die Route mit den zwei längsten Tabellen-Namen; alle Teile und der Pfeil liegen innerhalb des Routen-Containers, kein Text abgeschnitten, kein horizontaler Überlauf; grün im Projekt `webkit` (`npx playwright test --project=webkit`).
- [ ] Kurze Routen („Frankfurt (FRA) → New York (JFK)") rendern unverändert (bestehende Stories, DOM-Test).
- [ ] Umgang mit überlangen Texten ist im design-system-README unter „Info-Leiste" beschrieben.
- [ ] `npm test`, `npm run typecheck`, `npm run build` grün.

## Notes
- Hervorgegangen aus airspace-cn6t7 (Refinement 2026-10-27); dort liegt der Datenteil (Start → Ende, Zwischenstopp in der Eyebrow).
- Bleibt im Backlog, bis der Spike h3b7q die Variante liefert; dann hier eintragen und promoten.
