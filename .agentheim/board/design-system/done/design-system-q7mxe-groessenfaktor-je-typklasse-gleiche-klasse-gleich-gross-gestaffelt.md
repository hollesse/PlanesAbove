---
id: design-system-q7mxe
title: Größenfaktor je Typklasse: gleiche Klasse gleich groß, Klassenunterschied spürbar aber gedeckelt; Anordnung in Flugrichtung gestaffelt (vorn/unten, hinten/oben) auf gleicher Tiefe
status: done
type: feature
context: design-system
created: 2026-10-30
depends_on: [design-system-pyheh]
blocks: []
tags: [typklasse, silhouette, entwurf, layout]
related_adrs: [0009]
related_research: []
prior_art: [design-system-pyheh]
---

## Why
Das eigentliche Problem der heutigen Zwei-Flugzeuge-Ansicht ist der **perspektivische Versatz**: Slot 2 ist schmaler (33 % vs. 50 %) und seitlich nach hinten versetzt, dadurch wirkt das zweite Flugzeug wie weiter entfernt. Zwei Flugzeuge derselben Typklasse (z. B. zwei Narrowbodys) erscheinen unterschiedlich groß, obwohl sie es nicht sein sollten. Den Grundfehler behebt der Gleich-groß-Entwurf (design-system-pyheh) bereits durch gleich breite Slots.

Dieser Task regelt zwei Dinge, die danach offen bleiben:

1. **Wie stark sich die Typklassen voneinander abheben.** Beim Entwurf wurde gemessen: alle Typklassen-SVGs nutzen dieselbe viewBox (1000x460), die gezeichnete Breite beträgt narrowbody 938, widebody 973, jumbo-hump 985, double-decker 991, regional-jet 850, turboprop 860, business-jet 564, light-aircraft 306, glider 350 (helicopter 914 von 1620). Widebody ist damit nur ca. 4 % länger als Narrowbody. Ein **realistisches** Maßstabsverhältnis ist ausdrücklich **nicht** das Ziel: dann würden Light Aircraft und Glider auf dem Tablet zu klein. Gewünscht ist ein spürbarer, aber gedeckelter Unterschied.
2. **Wie die beiden Flugzeuge angeordnet sind.** Betreiber-Entscheidung (2026-10-31): beide Flugzeuge liegen auf **derselben Tiefe** (gleiche Entfernung zum Betrachter, keine Perspektive, kein Vorne/Hinten im Sinne von nah/fern). Sie sind in **Flugrichtung gestaffelt**: das vordere Flugzeug (in Flugrichtung voraus) sitzt weiter unten im Bild, das hintere weiter oben. Das entspricht der Variante "Leicht versetzt" aus pyheh, aber ohne jede Größenabstufung durch die Position.

## What
- **Größenfaktor je Typklasse** einführen, ausschließlich als Skalierung der fertigen Silhouette im Slot (CSS/Transform/Wrapper-Größe). **Die Typklassen-SVGs selbst werden nicht verändert** (keine Anpassung von Pfaden, viewBox oder Maßen); Betreiber-Vorgabe 2026-10-31. Die Faktoren sind dokumentiert und bewusst gestaucht: Widebody/Jumbo/Double-Decker erkennbar länger als Narrowbody, Regional-Jet/Turboprop etwas kleiner, Business-Jet/Light Aircraft/Glider deutlich kleiner, aber mit einer definierten Mindestgröße relativ zur Slotbreite, damit sie auf dem Tablet lesbar bleiben. Kein realer Maßstab.
- **Festgelegte Faktoren** (Betreiber-Entscheidung 2026-11-01, Variante „Deutlich“), als sichtbare Rumpflänge relativ zur Narrowbody: double-decker 130 %, jumbo-hump 125 %, widebody 120 %, narrowbody 100 %, regional-jet 85 %, turboprop 80 %, helicopter 75 %, business-jet 65 %, light-aircraft 50 %, glider 50 %. Die Untergrenze ist damit 50 % der Narrowbody-Länge. Narrowbody füllt etwa 65 % der Slotbreite, damit der Double-Decker (130 %) ohne Beschnitt hineinpasst. Weil die SVGs unterschiedlich breit gezeichnet sind (gemessene Breiten oben), berechnet sich der Skalierungsfaktor je Klasse aus Ziel-Länge ÷ gezeichneter Breite; die Faktoren stehen an einer Stelle als Tabelle im Code (eine Konstante je Typklasse) mit Kommentar zur Herleitung.
- **Gilt auch für ein einzelnes Flugzeug** (Betreiber-Entscheidung 2026-11-01): Auch allein ist ein Segler klein. Der Faktor wirkt im Einzel-Slot genauso relativ zu dessen Breite.
- **Position trägt keine Größeninformation.** Beide Slots gleich breit; der Größenunterschied zweier Flugzeuge ergibt sich ausschließlich aus der Typklasse. Zwei Flugzeuge derselben Klasse sind pixelgleich groß, egal in welchem Slot.
- **Gestaffelte Anordnung** als Layout festlegen: Slot "vorn" (in Flugrichtung voraus) weiter unten, Slot "hinten" weiter oben, horizontal entsprechend versetzt. Die Flugrichtung der Silhouetten muss zur Staffelung passen (das vordere Flugzeug ist dasjenige, auf das die Nasen zeigen). Welche Flugdaten in "vorn" vs. "hinten" landen, bleibt wie bisher Slot 1 / Slot 2.
- Entwurf zuerst in Storybook (ADR 0002) auf Basis der pyheh-Stories; erst nach Abnahme durch den Betreiber Umsetzung in der App (eigener sky-scene-Folgetask).

## Acceptance criteria
- [ ] Jede der 10 Typklassen hat ihren Faktor aus der Tabelle in „What“ als eine Konstante im Code, mit Kommentar zur Herleitung (Ziel-Länge ÷ gezeichnete Breite).
- [ ] Zwei Flugzeuge derselben Typklasse in Slot vorn und Slot hinten haben Bounding-Boxen gleicher Breite und Höhe (Toleranz 1 px), bei 4:3 und 5:3.
- [ ] Die gemessenen sichtbaren Breiten im Slot stehen im Verhältnis der Tabelle (Toleranz ±3 Prozentpunkte relativ zur Narrowbody), z. B. Widebody 120 %, Light Aircraft 50 %; Narrowbody füllt 65 % ±3 % der Slotbreite.
- [ ] Im Einzel-Slot gilt dasselbe Verhältnis: ein einzelner Glider ist 50 % ±3 Prozentpunkte so lang wie ein einzelner Narrowbody (Story mit je einem Einzelflug).
- [ ] Anordnung gestaffelt: das in Flugrichtung vordere Flugzeug liegt tiefer im Bild als das hintere; beide liegen samt Plaketten vollständig im Himmel über der Info-Leiste, kein Beschnitt (4:3 und 5:3), Test über gemessene Bounding-Boxen.
- [ ] Kein Typ wird im Slot beschnitten (4:3 und 5:3), Test über gemessene Bounding-Boxen.
- [ ] Die Silhouetten-SVG-Dateien sind unverändert (Diff enthält keine Änderung an den Typklassen-SVGs).
- [ ] Bestehende Stories und Übergänge bleiben grün.
- [ ] Wirkung vom Betreiber in Storybook abgenommen: gleiche Klasse wirkt gleich groß, Klassenunterschied spürbar, Kleinflugzeuge lesbar. [human-eye]

## Notes
- Ursprüngliche Fassung dieses Tasks zielte auf ein "realistisches" Längenverhältnis Narrowbody/Widebody. Nach Rücksprache mit dem Betreiber (2026-10-31) umgeschrieben: Realismus ist nicht das Ziel, Gleichheit innerhalb einer Klasse und die Staffelung auf gleicher Tiefe sind es.
- Pfade: `src/client/ui/organisms/scene-layer-equal.ts`, `src/client/ui/templates/screen-equal.ts`, `src/client/ui/stories/scene-equal.stories.ts`, `transitions-equal.stories.ts`, `equal-helpers.ts`. Die Variante `versetzt` wird nach Flugrichtung ausgerichtet; `nebeneinander` bleibt als Story bestehen.
- Grundlage: `organisms/scene-layer-equal.ts`, `templates/screen-equal.ts`, Stories `scene-equal.stories.ts` / `transitions-equal.stories.ts`, Layout "Leicht versetzt" (Slot 1 top 8cqw, Slot 2 top 19,5cqw). Prüfen, ob die bisherige Versatzrichtung zur Flugrichtung der Silhouetten passt, ggf. spiegeln.

## Verifier note (iteration 1)

**REASONS:**
- Check 4/5 (ubiquitous language / README sync): the diff introduces a new domain concept, **Größenfaktor je Typklasse**, but `readmeDelta` is `[]`. The concept appears as a user-visible story name (`scene-equal.stories.ts`, "Einzelflug (Größenfaktor)"), a test-suite name, and new domain-layer identifiers in `src/client/ui/domain/plane-size.ts` (`PLANE_SIZE`, `planeBox`, `NARROWBODY_FILL` = 0.65). The design-system README's `## Ubiquitous language` has no such term, although it routinely records operator-decided design rules with their numbers even while approval is open. After integration the README would be stale on the factor table, narrowbody = 65 % of slot width, factor also for a single plane, and the stagger rule.
- Everything else verified: npm test (889 passed), typecheck, build-storybook exit 0; Playwright webkit equal-slots/stories/livery-front-fields 15/15 via scratch config; factor table matches; no SVG changed; stagger measured via bounding boxes.

**SUGGESTED_FIX:** Add a README_DELTA op to the design-system README's `## Ubiquitous language` defining **Größenfaktor (je Typklasse)**: the factor table, narrowbody = 65 % slot width, scaling only the silhouette (SVGs unchanged), same factor for a single plane, code location `domain/plane-size.ts`, and the stagger rule (vorn = Nasenseite tiefer, gleiche Tiefe, Position trägt keine Größe) — marked "Abnahme offen (design-system-q7mxe)". No code changes needed.

**ITERATION_HINT:** likely-fixable

## Outcome

Größenfaktor je Typklasse umgesetzt, ausschließlich als Skalierung der Silhouette im gleich breiten Slot; die Typklassen-SVGs sind unverändert.

- `src/client/ui/domain/plane-size.ts`: Tabelle `PLANE_SIZE` (eine Konstante je Typklasse: Ziel-Länge relativ zur Narrowbody, gezeichnete Breite, viewBox) mit Herleitungskommentar; `NARROWBODY_FILL = 0.65`; `planeBox(type)` liefert Breite und Linksversatz (Anteile der Slotbreite), sodass die gezeichnete Fläche mittig im Slot sitzt.
- `organisms/scene-layer-equal.ts`: `renderEqualPlaneSlot` setzt `--pa-eq-w` / `--pa-eq-ml` am Slot. `styles/ui.css`: Gleich-groß-Slots (single/one/two) bekommen festes Seitenverhältnis 1000:460, vertikale Zentrierung; das `.pa-plane` nimmt Breite/Versatz aus den Variablen. Live-Slots (`pa-slot-one/-two`) und Übergangs-Keyframes unverändert.
- Staffelung: Die Silhouetten zeigen mit der Nase nach rechts; Slot 2 (rechts, Nasenseite = vorn) liegt in der Variante "Leicht versetzt" bereits tiefer (19,5cqw) als Slot 1 (8cqw), daher keine Spiegelung nötig. Slots/Variablen unverändert.
- Neue Story "Einzelflug (Größenfaktor)" in `scene-equal.stories.ts` (Typklasse über Control Slot 1).
- Tests: Unit (`tests/unit/equal-slots.test.ts`): Tabelle vollständig, Sichtbreite = 0,65 × Faktor je Klasse, mittig, gleiche Klasse gleiche Box, Staffelrichtung. E2E (`tests/e2e/equal-slots.spec.ts`, 4:3 und 5:3): je Klasse gleiche Breite/Höhe in beiden Slots (±1 px), sichtbare Breiten im Verhältnis zur Narrowbody (±0,03), Narrowbody 65 % ±3 %, kein Beschnitt (innerhalb Bühne, über der Info-Leiste), vorderes Flugzeug tiefer, Einzel-Slot (Glider 50 %, Double-Decker 130 %).
- Ausgeführt: `npm test` (889 grün), `npm run typecheck`, `npm run build-storybook`; Playwright (webkit) mit temporärer Config im Scratchpad (nur Storybook-Server auf Port 6017, weil 5174 belegt): equal-slots und die übrigen Storybook-Specs grün; Specs, die `dist/server` brauchen (skeleton, stage-fill, photo-overlay, long-route), liefen mangels `npm run build` nicht und sind von der Änderung nicht berührt.
- Offen: [human-eye]-Abnahme durch den Betreiber in Storybook; danach Übernahme in die App (Folgetask unten).
