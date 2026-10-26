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
- **Template**: a full screen layout without real data (empty, one plane, two planes at 5:3).
- **Page**: a template filled with example data; transitions as playable stories.
- **Token**: a named design value (colour, font, spacing).
- **Plakette** (plaque): the round number 1 or 2 that links a plane to its info row.
- **Choreografie** (choreography): timing and order of the transition animations (e.g. 5 s).
- **Abnahme** (approval): the operator's sign-off of a component in Storybook. Only approved components go into the app.

## Rules
- **Storybook first:** a UI element the app needs that does not exist yet is first built as a story here, approved, and only then used in the app.
- Components are framework-free modules. The app imports exactly the modules Storybook renders; it never makes copies.
- Components must run on the old iPad (JS target from the runtime decision).

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
