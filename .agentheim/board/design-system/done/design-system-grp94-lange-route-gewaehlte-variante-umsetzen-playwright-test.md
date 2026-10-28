---
id: design-system-grp94
title: Lange Route: gewählte Variante in der Info-Leiste umsetzen; Playwright-Test (WebKit) mit den zwei längsten Flughafennamen
status: done
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
- [x] Variante ist in den Notes benannt (D, Kombination aus A und C; entschieden 2026-10-28).
- [ ] Playwright-Test rendert die Route mit den zwei längsten Tabellen-Namen; alle Teile und der Pfeil liegen innerhalb des Routen-Containers, kein Text abgeschnitten, kein horizontaler Überlauf; grün im Projekt `webkit` (`npx playwright test --project=webkit`).
- [ ] Kurze Routen („Frankfurt (FRA) → New York (JFK)") rendern unverändert (bestehende Stories, DOM-Test).
- [ ] Umgang mit überlangen Texten ist im design-system-README unter „Info-Leiste" beschrieben.
- [ ] `npm test`, `npm run typecheck`, `npm run build` grün.

## Notes
- **Betreiberwahl 2026-10-28: Variante D (Kombination aus A und C)**, siehe Story „D · Kombination" in `info-bar-long-route.stories.ts` angelegt und gemessen (alle vier D-Stories „passt" in 4:3 und 5:3). Regel: **Einzelansicht** erst verkleinern (in Stufen bis mindestens 60 % von 5cqw), Umbruch vor dem Pfeil nur wenn das immer noch nicht reicht; bei Umbruch Größe der Namensstufe (lange Namen 65 % = 3,25cqw, wie A lang). Normalfall „Frankfurt (FRA) → New York (JFK)" bleibt dadurch einzeilig bei 4,5cqw statt zweizeilig bei 5cqw (A-Normal wirkte bei 5:3 zu eng für die kleinen Texte). **Zwei-Flugzeuge-Ansicht** wie C: immer eine Zeile, nur verkleinern (Minimum 50 %, lange Route 2,05cqw).
- Hervorgegangen aus airspace-cn6t7 (Refinement 2026-10-27); dort liegt der Datenteil (Start → Ende, Zwischenstopp in der Eyebrow).
- Bleibt im Backlog, bis der Spike h3b7q die Variante liefert; dann hier eintragen und promoten.

## Outcome
Variante D (A + C, operator decision 2026-10-28) is now in the real component.

- **Mechanism (decision):** a runtime fit step, not CSS-only, because only measuring bounding boxes proves the "inside the bar" criteria. `src/client/ui/organisms/fit-route.ts` exports `fitRoutes(root)` (idempotent, restores the untouched route text from `data-route` each run) and `fitRoutesWhenMounted(root)` (waits until connected and webfonts loaded, fits, then re-fits via a ResizeObserver whose callback is deferred to rAF to avoid the "ResizeObserver loop" pageerror). Pure helpers `nameTier`, `breakBeforeArrow`, `routeFits` are exported too. Safari 16 safe (Range/getBoundingClientRect/ResizeObserver/document.fonts, guarded for jsdom). `ui.css` gained `.pa-route-wrap` / `.pa-route-line`.
- **Wiring:** `skyStage` in stories/helpers.ts calls it (all bar stories benefit); `src/client/app/app.ts` calls it on the stage after each `render` and each transition `show`. Exported via the ui barrel.
- **Stories:** draft file `info-bar-long-route.stories.ts` removed; `info-bar.stories.ts` gets "Längste Route · Ein Flugzeug" and "· Zwei Flugzeuge", each showing 4:3 and 5:3.
- **Tests:** `tests/e2e/long-route.spec.ts` (WebKit green): reads the two longest "Stadt (IATA)" labels from `src/server/modules/airspace/tables/airports.json` at run time, asserts the story text equals them, every route part and the arrow lie inside the bar/text column, no horizontal overflow, two-plane = one line, single = two lines broken before the arrow; short routes unchanged (no inline size, no wrap). `tests/unit/fit-route.test.ts` covers tier and arrow break; `stories.test.ts` count updated 4 -> 6.
- **Results:** `npm test` 526 passed, `npm run typecheck` clean, `npm run build` ok, full `playwright test --project=webkit` 18 passed (the known skeleton livery failure did not occur in this run). Note: the airports table lives at `src/server/modules/airspace/tables/airports.json`, not top-level `tables/`.
- Eyebrow "· über Sharjah" from the spike drafts was not carried over (data part belongs to airspace-cn6t7).
