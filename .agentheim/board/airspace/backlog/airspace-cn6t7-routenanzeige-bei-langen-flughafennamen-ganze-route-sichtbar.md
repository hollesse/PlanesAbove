---
id: airspace-cn6t7
title: Routenanzeige bei langen Flughafennamen: ganze Route bleibt sichtbar; Playwright-Test mit den zwei längsten Namen
status: backlog
type: bug
context: airspace
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [captured, route, display, layout, e2e]
related_adrs: [0021]
related_research: []
prior_art: []
---

## Why
Die Routenanzeige im Steckbrief kann länger werden als der verfügbare Platz. Mehrleg-Routen (z. B. Hongkong → Sharjah → Köln) mit langen Stadtnamen laufen dann ab oder werden abgeschnitten. Die Anzeige muss die ganze Route zeigen.

Außerdem soll ein automatischer Test belegen, dass die längsten Flughafennamen der Tabelle vollständig sichtbar bleiben. Das Projekt nutzt Playwright, nicht Cypress; der Test entsteht daher als Playwright-E2E.

## What
- Entscheidung offen: Umgang mit überlangen Texten (Umbruch über mehrere Zeilen, Verkleinerung der Schrift, Kürzung mit Ellipse, Anzeige in einer zweiten Zeile). Die Ganze-Route-Anforderung gilt in jedem Fall; Kürzung nur von Stadtnamen, nie einzelne Legs weglassen.
- Die Flughafen-Tabelle (ADR 0021) liefert die Anzeigetexte in der Form `Stadt (IATA)`. Die beiden längsten Einträge der Tabelle werden für den Test ermittelt, nicht geraten.
- Playwright-Test: Mehrleg-Route mit den beiden längsten Flughafennamen (Route mit drei Legs, damit die Kette lang wird), im Mock-Modus rendern, prüfen dass alle Legs im sichtbaren Bereich liegen und nichts abgeschnitten wird (Element-Bounding-Box innerhalb des Containers, kein horizontaler Überlauf).
- Test läuft im WebKit-Projekt (Pflichtziel, ADR 0003/0004).

## Acceptance criteria
- [ ] Ein Playwright-Test rendert eine Mehrleg-Route mit den zwei längsten Flughafennamen aus der Tabelle; alle Legs und Pfeile liegen innerhalb des Routen-Containers, kein Text wird abgeschnitten.
- [ ] Der Test läuft im Projekt `webkit` grün (`npx playwright test --project=webkit`).
- [ ] Bei sehr langen Texten erscheint kein horizontaler Seitenüberlauf auf Phone-/iPad-Breite.
- [ ] Der Umgang mit überlangen Texten ist in der Task-Notiz entschieden und im README der Anzeige beschrieben.

## Notes
Captured via `quick-capture` on 2026-10-27 — raw, unrefined. Needs a `modeling` refine pass before it can be promoted.
Offene Frage für die Refinement-Runde: Umbruch, Verkleinerung, Kürzung oder zweite Zeile? Vorschlag: Umbruch über mehrere Zeilen als Default, Verkleinerung nur als Fallback.
Routing-Vermutung: airspace (Anzeige der Route nach ADR 0021); falls die Layout-Entscheidung eher zur Client-Komponente gehört, kann sie nach sky-scene oder design-system wandern. Antwort mit einer BC-Angabe verschiebt die Task per `reroute`.
