---
id: 0002
title: Storybook-first UI development following Atomic Design
scope: global
status: accepted
date: 2026-10-26
supersedes: []
superseded_by: []
related_tasks: [design-system-001-styleguide, infrastructure-001-walking-skeleton]
related_research: []
---

# ADR 0002: Storybook-first UI development following Atomic Design

## Context
PlanesAbove is a visual product. Its look already exists as Claude Design drafts: type-class SVGs,
liveries, logos, 28 skies, info-bar states and transitions. The builder wants two things:
- to review every visual piece in isolation before it ends up in the app;
- that nothing in the app's UI appears "out of nowhere".

The display client is plain HTML/CSS/JS without a framework, to stay compatible with an old iPad.

## Decision
- The design system is its own **Storybook instance** in the repo. It contains **every** visual
  asset and component, each viewable on its own, with controls for its variants:
  - every type class × every livery × logo;
  - all 28 skies;
  - typography and colour tokens;
  - info-bar states, plaques and transitions.
- Components are organised by **Atomic Design**:
  - **Atoms:** token, font, colour, sky, type-class silhouette, logo, plaque, label.
  - **Molecules:** painted plane (type class + livery + logo), header line, info row.
  - **Organisms:** info bar (one plane / two planes / route unknown / "Zuletzt"), scene layer with up to two planes.
  - **Templates:** the screen states (empty, one, two) at 5:3.
  - **Pages:** a scene filled with example data; transitions as playable stories.
- **Storybook first:** any UI element the app needs that does not exist yet is built and
  presented as a story first. Only then is it used in the app. App code consumes the same
  component modules that Storybook renders, never copies of them.
- Storybook is a development and review tool on the dev machine or home server. It is **not**
  shipped to the iPad. Components themselves stay framework-free (Storybook `html` renderer),
  so the iPad client gets exactly what was reviewed.
- Before any UI component is used in the app, the builder reviews and approves it in Storybook.

## Consequences
### Positive
- Every asset can be reviewed in isolation, including livery × type-class combinations that
  rarely appear in real traffic.
- One source of truth for UI; the app cannot drift from what was approved.
- New liveries can be checked in Storybook before they go live.

### Negative
- An extra toolchain (Storybook, Node dev dependencies) to maintain.
- Feature work involving UI has an added step (story first) and a human review wait.

### Neutral
- The existing pages `Flugzeugmodelle.html`, `Himmel.html` and `Screens.html` become the source
  material for the first stories. Once Storybook covers them they can be retired.

## Alternatives considered
- **Static styleguide page inside the app**: less tooling, but no isolated per-component view or controls, and it was not what the builder asked for.
- **Ladle / Histoire / Pattern Lab**: viable, but Storybook has the broadest renderer support (including plain HTML) and the largest ecosystem.
- **Build UI directly in the app**: fastest at first, but contradicts the review-before-use requirement.

## References
- `../vision.md`
- `../contexts/design-system/README.md`
