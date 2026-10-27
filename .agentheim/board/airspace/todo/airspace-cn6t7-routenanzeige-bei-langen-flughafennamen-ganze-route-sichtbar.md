---
id: airspace-cn6t7
title: Routenanzeige bei langen Flughafennamen: ganze Route bleibt sichtbar; Playwright-Test mit den zwei längsten Namen
status: todo
type: bug
context: airspace
created: 2026-10-27
completed:
depends_on: [design-system-001-styleguide]
blocks: [design-system-grp94]
tags: [captured, route, display, layout, e2e]
related_adrs: [0021]
related_research: []
prior_art: []
---

## Why
Die Routenanzeige im Steckbrief kann länger werden als der verfügbare Platz. Die Zeile ist heute `white-space: nowrap` in cqw-Schrift (5cqw Einzelansicht, 3.3cqw Zwei-Flugzeuge). Die längsten Einträge der Flughafen-Tabelle (ADR 0021) sind „Santiago de Compostela (SCQ)" (28 Zeichen) und „Jerez de la Frontera (XRY)" (26); schon zwei solche Namen (57 Zeichen) brauchen bei 5cqw rund die doppelte Bildschirmbreite, eine dreilegige Route (83 Zeichen) die dreifache.

## What
Refinement 2026-10-27 mit dem Betreiber, zwei Entscheidungen sind gefallen:

1. **Mehrleg-Routen zeigen im Steckbrief nur Start → Ende.** Zwischenstopps wandern klein in die Eyebrow-Zeile („über Sharjah") und bleiben im gesprochenen Steckbrief. Der persistierte Routentext (`formatRoute`, `sightings.route`, `route-why`) bleibt die volle Kette „A → B → C"; nur die Anzeige trennt. Dafür muss `RouteInfo` (airspace) neben `text` die Leg-Anzeigetexte in Reihenfolge liefern, und sky-scene bildet daraus `FlightInfo.route` (erster → letzter) und ein neues `FlightInfo.via` (Zwischenstopp-Städte); `formatEyebrow` hängt „· über X" an.
2. **Der Umgang mit zwei langen Namen wird Storybook-first entschieden (ADR 0002), nicht hier implementiert.** Erst drei Alternativen als zusätzliche Stories (nur Story-lokales CSS, Komponente und ui.css unverändert), dann Abnahme durch den Betreiber. Kandidaten: (a) erst Stufen-Verkleinerung nach Länge, dann Umbruch nur vor dem Pfeil; (b) Umbruch vor dem Pfeil plus Verkleinerung; (c) nur einzeilige Verkleinerung. Ein Flughafenname bricht in keiner Variante innerhalb des Namens um.

**Aufteilung (erzeugt 2026-10-27):**
- `airspace-cn6t7` (dieser Task, airspace mit sky-scene-Berührung): Punkt 1, Unit-Tests, keine Layoutänderung → todo-fähig.
- design-system-h3b7q (Spike, todo): drei Alternativen mit Worst-Case-Daten (57 Zeichen, Einzel- und Zwei-Flugzeuge-Ansicht), depends_on design-system-z9rzp (schafft erst Platz), Ergebnis = gewählte Variante in den Notes; Stop-loss: ist die Wahl nach der ersten Variante schon klar, festhalten und abbrechen.
- design-system-grp94 (backlog, hängt am Spike): gewählte Variante umsetzen plus Playwright-Test im Projekt `webkit`, der eine Route mit den zwei längsten Tabellen-Namen rendert und prüft, dass alle Teile innerhalb des Routen-Containers liegen (Bounding-Box, kein horizontaler Überlauf).

## Acceptance criteria
- [ ] `RouteInfo` liefert die Leg-Anzeigetexte in Reihenfolge; `formatRoute`/persistierter Text unverändert (bestehende Tests, inkl. airspace-w1q3x UPS1-Fall, bleiben grün).
- [ ] Unit-Test sky-scene: Route `VHHH → OMSJ → EDDK` ergibt `route = "Hongkong (HKG) → Köln (CGN)"` und `via = ["Sharjah"]`; zweilegige Route ergibt `via = []`.
- [ ] `formatEyebrow` zeigt bei `via` „· über Sharjah" (mehrere Stopps mit Komma); Unit-Test.
- [ ] Gesprochener Steckbrief unverändert (Test belegt gleichen Text wie vorher).
- [ ] `npm test`, `npm run typecheck`, `npm run build` grün; airspace-README (Mehrlegige Route) ergänzt um „Anzeige Start → Ende, Zwischenstopp in der Eyebrow".

## Notes
- Captured via `quick-capture` 2026-10-27; refined 2026-10-27 (Betreiber-Entscheidungen oben). Layout-Frage und Playwright-Test gehen in design-system-h3b7q und design-system-grp94.
- Einstiegspunkte: `src/server/modules/airspace/route-service.ts` (`RouteInfo`, `formatRoute`, `airportLabel`), `src/server/modules/sky-scene/sky-service.ts` (`toScenePlane`), `src/shared/state.ts`, `src/client/ui/domain/flight.ts` (`formatEyebrow`), `src/client/ui/styles/ui.css` (`.pa-route-large`).
- Zusammenhang: design-system-z9rzp schafft Platz in der Zwei-Flugzeuge-Ansicht; airspace-w1q3x liefert die Mehrleg-Route, deren Startflughafen hier sichtbar wird.
