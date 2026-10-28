---
id: design-system-z9rzp
title: Flugphase als Pfeil vor der Höhe statt als Wort; in der Zwei-Flugzeuge-Ansicht Höhe und Geschwindigkeit je auf eigener Zeile, damit lange Routen mehr Platz haben
status: doing
type: feature
context: design-system
created: 2026-10-27
completed:
depends_on: [design-system-001-styleguide]
blocks: []
tags: [info-leiste, flugphase, layout, route, storybook]
related_adrs: [0002]
related_research: []
prior_art: [design-system-001]
---

## Why
Die Info-Leiste schreibt die Flugphase heute als Wort („im Horizontalflug", „Steigflug", „Sinkflug"). Das kostet Platz, den lange Routen (Mehrleg-Routen, lange Stadtnamen, siehe airspace-cn6t7) dringender brauchen. Ein Pfeil vor der Meterzahl sagt dasselbe kürzer, und Mona versteht einen Pfeil nach oben oder unten auch ohne Lesen. Werden in der Zwei-Flugzeuge-Ansicht Höhe und Geschwindigkeit zudem je auf eine eigene Zeile gesetzt, bleibt in der Zeile mehr Breite für die Route.

## What
Betreiber-Idee vom 2026-10-27, Storybook-first (ADR 0002): erst Story im design-system, Abnahme, dann nutzt sky-scene das Ergebnis automatisch, weil die Komponente dieselbe ist.

1. **Pfeil statt Wort.** `formatMeta`/`formatStats` in `src/client/ui/domain/flight.ts` geben die Phase nicht mehr als Wort aus, sondern als Pfeil direkt vor der Höhe: Steigflug ↗, Sinkflug ↘, Horizontalflug →. Einzelansicht: „↗ 11 300 m · 870 km/h" statt „11 300 m hoch · 870 km/h · im Steigflug". Ob Unicode-Pfeil in Plex Mono oder kleines Inline-SVG: der Worker entscheidet nach dem Rendering auf Safari 16 und notiert es; Pfeil und Zahl dürfen nie getrennt umbrechen.
2. **Zwei-Flugzeuge-Ansicht.** In `renderInfoRow` (Molecule) stehen Höhe (mit Pfeil) und Geschwindigkeit untereinander auf zwei Zeilen; die Route bekommt die frei werdende Breite. Plakette und Eyebrow bleiben wie bisher.
3. **Barrierefreiheit / Vorlesen.** Der Pfeil bekommt ein `aria-label` bzw. `title` mit dem bisherigen Wort („Steigflug"). Der gesprochene Steckbrief (Server, sky-scene) bleibt unverändert, dort wird die Phase weiter als Wort gesagt.
4. **Storybook.** Info-Leiste-Stories (alle vier Zustände) zeigen die neue Form; die Tokens-Story mit der Beispielzeile „11 300 m hoch · … · im Horizontalflug" wird mitgezogen. Eine Story mit der längsten Route (dreilegig, lange Namen) zeigt den Platzgewinn in der Zwei-Flugzeuge-Ansicht.
5. README des design-system: Eintrag „Info-Leiste" um Pfeil-Konvention und Zeilenaufteilung ergänzen.

Nicht Teil des Tasks: Umgang mit Routen, die trotzdem noch zu lang sind (airspace-cn6t7); Änderung der Sprachausgabe.

## Acceptance criteria
- [ ] Unit-Tests für `formatMeta` und `formatStats`: climb → „↗ 11 300 m", descent → „↘ …", level → „→ …"; kein Vorkommen der Wörter Horizontalflug/Steigflug/Sinkflug mehr im sichtbaren Text der Info-Leiste (nur noch in `aria-label`/`title`).
- [ ] Die Zwei-Flugzeuge-Ansicht rendert je Zeile Höhe und Geschwindigkeit als zwei eigene Textzeilen (DOM-Test: zwei Elemente mit den Werten, Route-Element daneben); Pfeil und Zahl stehen in einem gemeinsamen, nicht umbrechenden Element.
- [ ] Storybook-Stories für alle vier Info-Leisten-Zustände und die Tokens-Beispielzeile sind angepasst; `npm run e2e:chromium` (alle Stories rendern fehlerfrei) ist grün.
- [ ] Die Pfeile sind auf dem iPad (Safari 16) sauber gerendert und auf Lesedistanz klar als „hoch", „runter", „geradeaus" erkennbar. [human-eye]
- [ ] In der Zwei-Flugzeuge-Ansicht wirkt die Zeile mit langer Route ruhiger und lesbarer als vorher. [human-eye]
- [ ] `npm test`, `npm run typecheck`, `npm run build` grün; design-system-README ergänzt.

## Notes
- Betreiber-Begründung: weniger Platz, für Mona ohne Lesen verständlich, mehr Breite für lange Routennamen bei zwei Flugzeugen.
- Hängt inhaltlich mit airspace-cn6t7 (Routenanzeige bei langen Flughafennamen) zusammen: dieser Task schafft Platz, cn6t7 regelt den Rest (Umbruch/Verkleinerung). Sinnvoll ist, z9rzp zuerst zu bauen; cn6t7 ist noch im Backlog und wird beim Refinement darauf gesetzt.
- Einstiegspunkte: `src/client/ui/domain/flight.ts` (`PHASE_LABEL`, `formatMeta`, `formatStats`), `src/client/ui/molecules/info-row.ts`, `src/client/ui/organisms/info-bar.ts`, `src/client/ui/stories/tokens.stories.ts`.
- Pfeilwahl: Unicode ↗ ↘ → (U+2197, U+2198, U+2192) liegt in IBM Plex Mono vor; falls die Glyphen auf Safari 16 uneinheitlich ausfallen, Inline-SVG im selben Element wie die Zahl.
