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
- **Info-Leiste** (info bar): organism at the bottom of a screen in four states: one plane with route known, one plane with route unknown, two planes (two rows with Plaketten), slim "Zuletzt" bar.
- **Übergang** (transition): a declarative spec of stacked layers with one-shot 5 s CSS animations (22 in total: plane comes/goes/switches, weather changes, daytime changes), played from a Start button.
- **Schein (Himmel-Tinte-Glow)** — wide, soft glow behind text lying directly on the sky, in the counter colour of its Himmel-Tinte (light ink gets a black glow at ~40 % opacity, dark ink a white one at ~40 %). Tokens `--pa-sky-glow-on-light-ink` (rgba(0,0,0,.4)), `--pa-sky-glow-on-dark-ink` (rgba(255,255,255,.4)) and `--pa-sky-glow-blur` (0.8cqw); built from two stacked offset-free cqw-blurred text-shadows (Safari 16 safe), classes `pa-glow-on-light-ink` / `pa-glow-on-dark-ink`. Shown in the Atoms/Tokens story "Schein". Text on paper has none.

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
