---
id: infrastructure-pn3w4
title: Decide runtime split and stack: home-server service computes state, tablet is a thin vanilla-JS client
status: done
type: decision
context: infrastructure
created: 2026-10-26
completed:
depends_on: []
blocks: [infrastructure-001-walking-skeleton]
tags: [foundation, runtime, stack]
related_adrs: [0001, 0004]
related_research: []
prior_art: []
---

## Why
Old tablet (old WebView/Safari, little RAM, 24/7), free APIs with rate limits/uneven CORS/optional keys, and a durable sighting log all push toward deciding where the brain runs before anything is built.

## What
Record the architecture decision as an ADR (scope: `global`), based on the architect's draft below (or the builder's amended version).

## Acceptance criteria
- [ ] ADR committed under `.agentheim/knowledge/decisions/`, status `accepted`, scope `global`.
- [ ] Justification matches the architect's draft (or the user-amended version); deviations are named in the ADR.
- [ ] The ADR names the concrete platform:
  - home server: Lenovo ThinkCentre running ZimaOS;
  - display: iPad Pro 12.9" 1st gen and/or a smaller iPad (iPadOS 17).
- [ ] Browser baseline is fixed at **iPadOS 16 / Safari 16**, and the build target follows from it.
- [ ] The ADR names the test stack in line with ADR 0003:
  - a unit test runner (e.g. Vitest or the Node test runner);
  - Playwright with WebKit for E2E;
  - a mock mode for external APIs, with a scenario-file format;
  - an injectable clock.
- [ ] The ADR records ADR 0002 (Storybook-first, Atomic Design): client UI components are framework-free modules shared between Storybook and the app.
- [ ] No code change required.

## Notes
**Load-bearing for walking skeleton:** yes

**Builder input (2026-10-26):**
- **Home server confirmed:** an old Lenovo ThinkCentre running ZimaOS, always on. ZimaOS runs apps as Docker containers, so the single-service-in-a-container approach fits directly.
- **Display:** an old iPad. Two candidate devices, both 4:3:
  - **iPad Pro 12.9" 1st gen** (2015, max iPadOS 16)
  - a smaller 9.7"/10.5" iPad with home button, most likely iPad 6th gen or iPad Pro 10.5" (max iPadOS 17); the builder still has to confirm the model number.

  **Browser baseline: iPadOS 16 / Safari 16.** This keeps container queries (`cqw`), `aspect-ratio`, ES2020+ and ES modules available, so no ES5 down-levelling is needed.
- **UI:** built Storybook-first per ADR 0002. The client imports the approved design-system modules.

~~Open point (from architect):~~ (resolved) the vision says "ggf. Heimserver"; this ADR makes it required. Fallback if no home machine exists: free-tier cloud container (worse). Tablet OS/age unknown — pin the JS target in the walking skeleton once the real device is known.

### Architect's ADR draft

---
id: TBD
title: Home-server service computes state; tablet is a thin vanilla-JS browser client
scope: global
status: proposed
date: 2026-10-26
---

## Context
Display is an old tablet (old WebView/Safari, little RAM, 24/7). Free ADS-B/route/weather APIs have rate limits, uneven CORS and optional keys. The sighting log needs durable storage. The builder wants near-zero maintenance and a fast first result (ADR 0001). A home server may exist.

## Decision
- One Node.js (LTS) + TypeScript service on the home server — a modular monolith, one module per BC — does 30 s polling, enrichment, selection, weather, Steckbrief text, TTS rendering and the sighting log.
- It serves the static client and `GET /api/state` (current sky, selection with Steckbrief data, build id) as one JSON document.
- Client: plain HTML/CSS/JS, no framework, bundled with esbuild to a conservative target (ES2015 or lower, pinned once the device is known). Polls `/api/state` every 10–30 s, animates transitions, holds the Vorlese-Sperre locally (a newly received selection is buffered while audio plays and applied after it ends).
- The tablet never calls external APIs and stores nothing.

## Consequences
### Positive
- One poller regardless of tablet count; no CORS, no keys on device; durable storage trivial.
- Small, replaceable client; design SVG/CSS-variable assets reused as-is; one language front and back.
### Negative
- Requires an always-on home machine (single point of failure).
- A build step exists for the old-browser target.
### Neutral
- Frontend stays framework-free; revisit only if UI complexity demands it.

## Alternatives considered
- **Tablet-only SPA calling APIs directly** — no server, but CORS/key/rate-limit problems, no durable log, old-browser TLS issues.
- **Go/Python backend** — viable; rejected only to keep one language.
- **Frontend framework** — bigger bundles, old-WebView risk, little gain.
- **SSE/WebSocket push** — nicer, but polling is more robust on old WebViews and cheap on a LAN.

## Outcome
Decision recorded as global ADR (provisional `0004-home-server-service-thin-vanilla-js-client.md`, accepted). It fixes the runtime split (Node.js/TypeScript modular-monolith service in a Docker container on the ZimaOS ThinkCentre; thin framework-free iPad client polling `GET /api/state`), the browser baseline iPadOS 16 / Safari 16 with esbuild target ES2020, framework-free shared UI modules per ADR 0002, and the test stack per ADR 0003 (Vitest, Playwright WebKit, JSON scenario-file mock mode, injectable clock). Deviation from the architect's draft: build target ES2020 instead of ES2015. No code changed.
