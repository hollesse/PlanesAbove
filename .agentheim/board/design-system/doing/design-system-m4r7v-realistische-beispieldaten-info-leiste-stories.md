---
id: design-system-m4r7v
title: Realistische Beispieldaten in den Info-Leisten-Stories (Routen als „Stadt (IATA)“, echte Callsigns, Typen und Kennzeichen), lange Routen in jedem Zustand mit dabei
status: doing
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
- [ ] `SAMPLE_FLIGHTS` enthält genau die Beispieldaten aus der Tabelle unter „Beispieldaten“ (Notes); jede Route hat das Format „Stadt (IATA) → Stadt (IATA)“ mit den Städtenamen exakt wie in `tables/airports.json`; kein Platzhalter-Betreiber („Privat“) und kein Platzhalter-Typ („Business-Jet“) mehr.
- [ ] Ein Unit-Test prüft, dass jedes Routen-Label in `SAMPLE_FLIGHTS` (Start und Ziel) und jede `via`-Stadt so in `tables/airports.json` vorkommt (Stadt + IATA zum genannten ICAO-Code).
- [ ] Die regulären Info-Leisten-Stories (Ein Flugzeug · Route bekannt, Route unbekannt, Zwei Flugzeuge, Zuletzt) zeigen diese Daten; „Zwei Flugzeuge“ (C + D) zeigt zwei lange Routen, C mit „über Varadero“ in der Eyebrow.
- [ ] `RECENT_TEXT` sowie `LAST_ONE`/`LAST_TWO` in `transition-samples.ts` nutzen die neuen Callsigns (siehe Notes).
- [ ] Assertions auf alte Beispieltexte nachgezogen (`tests/unit/info-bar.test.ts`, `tests/unit/screen.test.ts`, ggf. `tests/e2e/long-route.spec.ts` „short single route stays on one line“ – dort eine kurze Route wie A beibehalten oder explizit eine kurze Route setzen).
- [ ] `npm test`, `npm run typecheck`, `npm run build`, `npx playwright test --project=webkit` grün (inkl. `long-route.spec.ts`).
- [ ] Betreiber findet die Stories realistisch. [human-eye]

## Notes
- Einstiegspunkte: `src/client/ui/domain/samples.ts`, `src/client/ui/stories/info-bar.stories.ts`, `pages.stories.ts`, `transitions.stories.ts`, `tests/e2e/long-route.spec.ts` (Assertion „Frankfurt → New York“ in „short single route stays on one line“).

### Beispieldaten (Refinement 2026-11-01, Betreiber: „nimm einfach ein realistisches Beispiel“)
Callsigns im ICAO-Format, wie der Dienst sie anzeigt (`DLH400`, nicht `LH400`). Höhe/Tempo/Phase wie bisher je Schlüssel, damit `formatMeta`/`formatStats`-Tests nur die Texte, nicht die Zahlen ändern. Flugzeug-Schlüssel/Lackierungen (`SAMPLE_PLANES`) bleiben unverändert.

| Key | Betreiber | Callsign | Typ | Kennzeichen | Route | via |
|---|---|---|---|---|---|---|
| A | Lufthansa | DLH1450 | Airbus A320neo | D-AINA | Frankfurt (FRA) → Thessaloniki (SKG) | – |
| B | NetJets Europe | NJE7GT | Embraer Phenom 300 | CS-PHJ | null (Route unbekannt) | – |
| C | Condor | CFG2032 | Airbus A330-900 | D-ANRA | Frankfurt (FRA) → Montego Bay (MBJ) | Varadero |
| D | Ryanair | RYR3TL | Boeing 737-800 | EI-DCL | Hahn (HHN) → Palma de Mallorca (PMI) | – |
| E | Condor | CFG1512 | Airbus A321 | D-AIAD | Frankfurt (FRA) → Barcelona (BCN) | – |
| F | easyJet | EZY8216 | Airbus A320 | G-EZWX | Berlin (BER) → London (LGW) | – |

ICAO-Codes für den Tabellen-Test: EDDF, LGTS, MKJS, MUVR, EDFH, LEPA, LEBL, EDDB, EGKK.
- `RECENT_TEXT` = `Zuletzt: Lufthansa DLH1450 · vor 6 Min`
- `LAST_ONE` = `Zuletzt: Lufthansa DLH1450 · gerade eben`, `LAST_TWO` = `Zuletzt: Lufthansa DLH1450 · Ryanair RYR3TL · gerade eben`
- Kopfkommentar in `samples.ts` anpassen („realistische Beispiele im Anzeigeformat“ statt „aus den Screens-Entwürfen“).
- „Längste Route“-Stories bleiben unverändert (Benchmark SCQ → XRY).

