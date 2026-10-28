---
id: design-system-m4r7v
title: Realistische Beispieldaten in den Info-Leisten-Stories (Routen als „Stadt (IATA)“, echte Callsigns, Typen und Kennzeichen), lange Routen in jedem Zustand mit dabei
status: backlog
type: feature
context: design-system
created: 2026-10-28
completed:
depends_on: [design-system-grp94]
blocks: []
tags: [info-leiste, storybook, samples, route]
related_adrs: [0002, 0021]
related_research: []
prior_art: [design-system-grp94, design-system-h3b7q]
---

## Why
Die Beispieldaten in `src/client/ui/domain/samples.ts` stammen aus den Claude-Design-Entwürfen: Routen ohne Flughafencode („Frankfurt → New York“), Platzhalter wie „Privat“ / „Business-Jet“. Die App zeigt Routen seit ADR 0021 immer als „Stadt (IATA)“, also mit längerem Text. Storybook soll so aussehen wie die Wand im Kinderzimmer, damit die Abnahme (ADR 0002) etwas Echtes bewertet.

## What
Betreiber-Wunsch 2026-10-28: „realistische Namen im Storybook in der Infoleiste, und die Beispiele mit den langen Texten mit drin.“
- `SAMPLE_FLIGHTS` auf das echte Anzeigeformat bringen: Routen als „Stadt (IATA) → Stadt (IATA)“ (Städtenamen wie in `tables/airports.json`), plausible Callsigns, Flugzeugtypen, Kennzeichen und Betreiber (z. B. statt „Privat“ ein echter Business-Jet-Betreiber oder Halter-Form, wie der Dienst sie anzeigt).
- Mindestens ein Beispiel je Info-Leisten-Zustand mit langer Route (zwei lange Namen aus der Tabelle, Mehrleg mit „über X“ in der Eyebrow wie seit airspace-cn6t7), so dass Umbruch/Verkleinerung (Variante D, grp94) in den regulären Stories sichtbar ist, nicht nur in „Längste Route“.
- Pages, Übergänge und Tests, die `SAMPLE_FLIGHTS` nutzen, laufen weiter; Assertions auf alte Beispieltexte („Frankfurt → New York“, `RECENT_TEXT`) nachziehen.

## Acceptance criteria
- [ ] Jede Route in `SAMPLE_FLIGHTS` hat das Format „Stadt (IATA) → Stadt (IATA)“; kein Platzhalter-Betreiber mehr.
- [ ] Die regulären Info-Leisten-Stories (ein Flugzeug, Route unbekannt, zwei Flugzeuge, Zuletzt) zeigen realistische Daten; mindestens ein regulärer Zustand mit langer Route.
- [ ] `npm test`, `npm run typecheck`, `npm run build`, `npx playwright test --project=webkit` grün (inkl. `long-route.spec.ts`).
- [ ] Betreiber findet die Stories realistisch. [human-eye]

## Notes
- Einstiegspunkte: `src/client/ui/domain/samples.ts`, `src/client/ui/stories/info-bar.stories.ts`, `pages.stories.ts`, `transitions.stories.ts`, `tests/e2e/long-route.spec.ts` (Assertion „Frankfurt → New York“ in „short single route stays on one line“).
