---
id: infrastructure-pn3w4
title: Decide runtime split and stack: home-server service computes state, tablet is a thin vanilla-JS client
status: todo
type: decision
context: infrastructure
created: 2026-10-26
completed:
depends_on: []
blocks: [infrastructure-001-walking-skeleton]
tags: [foundation, runtime, stack]
related_adrs: [0001]
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
- [ ] Builder has confirmed a suitable always-on home machine exists (Raspberry Pi / NAS / old laptop); if not, the decision is revisited before acceptance.
- [ ] No code change required.

## Notes
**Load-bearing for walking skeleton:** yes

**Open point (from architect):** the vision says "ggf. Heimserver"; this ADR makes it required. Fallback if no home machine exists: free-tier cloud container (worse). Tablet OS/age unknown — pin the JS target in the walking skeleton once the real device is known.

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
