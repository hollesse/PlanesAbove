# Design System

## Purpose
This context is PlanesAbove's own **Storybook instance**, organised by **Atomic Design** (ADR 0002). It holds every visual asset and UI component: type classes, liveries, logos, skies, tokens, info bars and transitions. Each one can be viewed and approved on its own before the app uses it. The source material is the Claude Design drafts: `Flugzeugmodelle.html`, `Himmel.html`, `Screens.html` and `svg/`.

## Classification
generic: frontend infrastructure with its own UX vocabulary and review process.

## Actors
- **Papa**: reviews and approves components in Storybook.
- **Workers**: build new components here as stories first, then use them in the app.

## Ubiquitous language
- **Storybook**: the separate dev and review instance. It is not shipped to the iPad.
- **Story**: one view of a component in one state or variant.
- **Atom**: the smallest building block (token, font, colour, sky, type-class silhouette, logo, plaque, text style).
- **Molecule**: a combination of atoms (painted plane = type class + livery + logo; header line; info row).
- **Organism**: a self-contained UI section (info bar in all of its states, scene layer with 0–2 planes).
- **Template**: a full screen layout without real data (empty, one plane, two planes). Default format is 4:3 (the target iPads); 5:3 (the Claude-Design drafts) is selectable via the `aspect` control or the "Entwurf 5:3" viewport.
- **Page**: a template filled with example data; transitions as playable stories.
- **Token**: a named design value (colour, font, spacing).
- **Plakette** (plaque): the round number 1 or 2 that links a plane to its info row.
- **Choreografie** (choreography): timing and order of the transition animations (e.g. 5 s).
- **Abnahme** (approval): the operator's sign-off of a component in Storybook. Only approved components go into the app.
- **Typklasse** (type class): one of the 10 plane silhouettes (narrowbody, widebody, jumbo-hump, double-decker, regional-jet, turboprop, business-jet, light-aircraft, glider, helicopter). Light Aircraft and Glider have no airline liveries, only the default.
- **Himmel** (sky): one of 28 sky illustrations, Tageszeit (dawn, day, dusk, night) x Wetterlage (clear, light, overcast, fog, rain, snow, storm).
- **Himmel-Tinte** (sky ink): colour of text laid over a sky, light (#F6EEDC) or dark (#1F2A33). Rule: light on dusk, night, rain and storm; dark otherwise.
- **Lackierung** (livery): a named set of `--skin-*` CSS custom properties applied to a Typklasse (catalog of 42 incl. the default). Unknown livery id falls back to the Standard-Lackierung.
- **Logo-Ankerpunkt** (logo anchor): the `data-anchor` a logo asset declares (logo-tail-center, -mid, -base, -lead, -fit, logo-fuselage-fwd; none = logo-tail) which selects the empty group of the plane silhouette the logo is placed into.
- **Info-Leiste** (info bar): organism at the bottom of a screen in four states: one plane with route known, one plane with route unknown, two planes (two rows with Plaketten), slim "Zuletzt" bar. Flight phase is shown as an arrow directly before the altitude (climb ↗, descent ↘, level →; Unicode glyphs in IBM Plex Mono, atom `renderAltitude`, arrow + number in one nowrap element), never as a word; the phase word lives only in the arrow's aria-label/title. Single view: "↗ 11 300 m · 870 km/h". Two-plane row: altitude (with arrow) and speed each on its own line in the right-hand stats column, leaving the width to the route.
- **Übergang** (transition): a declarative spec of stacked layers with one-shot 5 s CSS animations (22 in total: plane comes/goes/switches, weather changes, daytime changes), played from a Start button.
- **Schein (Himmel-Tinte-Glow, Variante E)** — dense, dark-ish halo behind the Kopfzeile (text lying directly on the sky), in the counter colour of its Himmel-Tinte, plus the Kopfzeile in IBM Plex Mono 500. Three stacked offset-free cqw text-shadows (Safari 16 safe: only `text-shadow`/`font-weight`): radii `--pa-sky-glow-blur-tight/-mid/-wide` = 0.3/1/2.4cqw; light ink gets black at 90/90/70 % (`--pa-sky-glow-on-light-ink-tight/-mid/-wide`), dark ink white at 80/80/60 % (`--pa-sky-glow-on-dark-ink-tight/-mid/-wide`). Classes `pa-glow-on-light-ink` / `pa-glow-on-dark-ink`. Shown in the Atoms/Tokens story "Schein". Text on paper (Info-Leiste, Plaketten, Zuletzt-Leiste) has no Schein and keeps its weight.
- **Kopfzeile-Zustand (live / veraltet)** — die Kopfzeile (Molekül) zeigt live „Live · HH:MM“, im veralteten Zustand (ADR 0008: letzte gute Szene bleibt) „Letzter Stand · HH:MM“ mit der Uhrzeit des letzten guten Stands, gleiche Position, Tinte und Schein. Eigenschaft `stale?: { since }` an Kopfzeile und Screen-Vorlage. Ersetzt den früheren, vom Betreiber abgelehnten Baustein „Stale-Hinweis“ (entfernt). Abnahme durch den Betreiber offen (design-system-r5d7v).
- **TransitionData / PlaneRef** — Input of the data-driven Uebergangs-Player: `from` and `to` plane lists (slot order), sky, place, clock, optional stale and `recent` texts per side. Specs reference planes by `PlaneRef {side: 'from'|'to', index}` (leaving layers read `from`, arriving or staying ones `to`) and recent text by side; a missing reference skips the layer, never throws. `sampleTransitionData(id)` is the Storybook default. Arriving layers carry `data-side`/`data-index` so the client can resolve taps. `TRANSITION_MS` (5000, derived from `DURATION`) is the length; the caller ends a transition with a fixed timer, not `animationend` (ADR 0020).
- **Lange Route (Variante D)** — handling of over-long route lines in the Info-Leiste (decision 2026-10-28, design-system-grp94). An airport name never wraps inside itself; the route never leaves the bar. CSS cannot measure text, so `fitRoutes(root)` / `fitRoutesWhenMounted(root)` (organism module `fit-route.ts`, exported from the barrel) measure the real layout after mount (webfonts loaded) and on every resize, and set the route's font-size in cqw. `skyStage` (stories) and the app client (after each render, incl. transition stages) call it. Single view (base 5cqw): shrink first in 2 % steps down to 60 %; only if it still overflows, break before the arrow (line 1 start airport, line 2 "→ end airport", classes `pa-route-wrap`/`pa-route-line`) at the name tier (longest label <= 16 chars 100 %, <= 22 80 %, else 65 %), shrinking further only if even that does not fit. So "Frankfurt (FRA) → New York (JFK)" stays one line, the longest table route "Santiago de Compostela (SCQ) → Jerez de la Frontera (XRY)" becomes two lines at 3.25cqw. Two-plane row (base 3.3cqw): always one line, shrink only, minimum 50 % (long route ~2.05cqw). Stories: Organisms/Info-Leiste · "Längste Route" (Einzel, Zwei), each at 4:3 and 5:3; verified by tests/e2e/long-route.spec.ts (WebKit), which reads the two longest labels from tables/airports.json.
- **Foto-Overlay** — Organism (`organisms/photo-overlay.ts`): abgedunkeltes Vollbild-Overlay über der Szene mit Foto im 4:3-Rahmen, Zeile Kennzeichen · Typ · Airline, Attribution (`licenceText` verbatim + Link als Text) und X rechts oben (mind. 64 px) zum Schließen; Tippen auf die Abdunklung schließt ebenfalls. Zustände: Ein Foto, Galerie (Zähler „2 / 5“, Punkte, Tippen linke/rechte Bildhälfte oder Wischen, kein Weiterblättern am Ende), Lädt, Kein Foto. Optional `autoCloseMs` (Kiosk). Nimmt Daten in Form des `Photo`-Modells (`domain/photo.ts`, ADR 0029) entgegen; Story-Beispieldaten sind Platzhalter-Grafiken ohne Hotlinks.

## Rules
- **Storybook first:** a UI element the app needs that does not exist yet is first built as a story here, approved, and only then used in the app.
- Components are framework-free modules. The app imports exactly the modules Storybook renders; it never makes copies.
- Components must run on the old iPad (JS target from the runtime decision).
- Livery variables are named exactly as the plane SVG files use them (`--skin-aft-sweep-N`, `--skin-fin-*`, ...); the draft name `--skin-tailband` does not exist and is not used.
- Components live in `src/client/ui/<level>/` (one folder per Atomic Design level); stories in `src/client/ui/stories/` carry the level as title prefix; SVG assets are generated into string modules by `npm run assets`.

## Aggregates
_Not applicable: component catalogue, no domain model._

## Key events
- Component approved (Abnahme).

## Key commands
- Build component as story; request approval.

## Relationships with other contexts
- **Gate for:** sky-scene (only approved components; new ones first in Storybook).
- **Shows:** liveries (every livery × type class can be viewed).
See `../../context-map.md`.

## Open questions
- Where does Storybook run permanently: only on the dev machine, or also as a static build on the home server?
