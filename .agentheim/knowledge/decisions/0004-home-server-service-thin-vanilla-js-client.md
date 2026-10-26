---
id: 0004
title: Home-server service computes state; iPad is a thin vanilla-JS browser client
scope: global
status: accepted
date: 2026-10-26
supersedes: []
superseded_by: []
related_tasks: [infrastructure-pn3w4, infrastructure-001-walking-skeleton]
related_research: [free-flight-weather-tts-apis-2026-10-26]
---

# ADR 0004: Home-server service computes state; iPad is a thin vanilla-JS browser client

## Context
The display is an old iPad (little RAM, runs 24/7, Safari/WebKit). Free ADS-B, route and weather APIs have rate limits, uneven CORS and optional keys. The sighting log needs durable storage. The builder wants near-zero maintenance and a fast first result (ADR 0001). The builder confirmed a home server: an old Lenovo ThinkCentre running ZimaOS, always on, which runs apps as Docker containers.

Display candidates, both 4:3:
- iPad Pro 12.9" 1st gen (2015, max iPadOS 16);
- a smaller 9.7"/10.5" iPad with home button (iPad 6th gen or iPad Pro 10.5", max iPadOS 17); the model number is still to be confirmed by the builder.

The oldest candidate fixes the browser baseline.

## Decision
- **Platform.** Home server: Lenovo ThinkCentre with ZimaOS, running the service as a Docker container. Display: iPad Pro 12.9" 1st gen and/or a smaller iPad (iPadOS 17), shown full screen with Guided Access. Having a home server is now required (the vision said "ggf."). Fallback if none exists: a free-tier cloud container (worse).
- **Server.** One Node.js (LTS) + TypeScript service, a modular monolith with one module per BC. It does 30 s polling, enrichment, selection, weather, Steckbrief text, TTS rendering and the sighting log. It serves the static client and `GET /api/state` (current sky, selection with Steckbrief data, build id) as one JSON document.
- **Client.** Plain HTML/CSS/JS, no framework, bundled with esbuild. It polls `/api/state` every 10-30 s, animates transitions and holds the Vorlese-Sperre locally (a newly received selection is buffered while audio plays and applied after it ends). The iPad never calls external APIs and stores nothing.
- **Browser baseline: iPadOS 16 / Safari 16.** Build target is **ES2020** (esbuild `--target=es2020,safari16`); ES modules, container queries (`cqw`) and `aspect-ratio` may be used. No ES5/ES2015 down-levelling. Features newer than Safari 16 are not used without a fallback.
- **UI components (ADR 0002).** Client UI components are framework-free modules (Storybook `html` renderer). Storybook and the app import the same modules; Storybook is not shipped to the iPad.
- **Test stack (ADR 0003).**
  - Unit and contract tests: Vitest (TypeScript, fast, offline, `npm test`). The Node test runner is an acceptable fallback if Vitest causes friction.
  - E2E: Playwright with the WebKit engine (Chromium optional), `npm run e2e`, driving the real service and the real client.
  - Mock mode: a config switch starts the service with flight, route, weather and TTS adapters replaced by fake adapters fed by scenario files. Scenario format: JSON, one file per scenario, with a time-ordered list of steps, each giving the simulated time offset and the payload per source (planes, route, weather, TTS result, or a failure such as 403/429/timeout). Initial scenarios: empty sky, one plane with known route, two planes, plane switches during narration, source outage then recovery, night + storm.
  - Injectable clock: all time-dependent code (30 s Takt, weather polling, nightly reload) takes a clock interface; tests use a fake clock. Server and client both follow this.

## Deviations from the architect's draft
- Build target raised from "ES2015 or lower, pinned once the device is known" to **ES2020 / Safari 16**, because the baseline is now fixed by the builder.
- Platform (ZimaOS, iPad models) and the test stack are named concretely, and ADR 0002 and 0003 are recorded here.

## Consequences
### Positive
- One poller regardless of device count; no CORS and no keys on the device; durable storage is simple.
- Small, replaceable client; design SVG/CSS-variable assets are reused as-is; one language front and back.
- A single container fits ZimaOS directly.
- Modern CSS/JS keeps the client simple and the bundle small.

### Negative
- Requires an always-on home machine (single point of failure).
- A build step exists for the Safari 16 target.
- Playwright WebKit on Linux is close to but not identical with iPad Safari; a manual check on the real iPad remains.

### Neutral
- The frontend stays framework-free; revisit only if UI complexity demands it.
- The smaller iPad model is still open; it does not change the baseline since the 12.9" gen 1 is the lowest.

## Alternatives considered
- **iPad-only SPA calling APIs directly** — no server, but CORS/key/rate-limit problems, no durable log, old-browser TLS issues.
- **Go/Python backend** — viable; rejected only to keep one language.
- **Frontend framework** — bigger bundles, old-WebView risk, little gain.
- **SSE/WebSocket push** — nicer, but polling is more robust on old WebViews and cheap on a LAN.
- **ES2015 target** — needless down-levelling given a fixed Safari 16 baseline.

## References
- `0001-single-household-self-hosted-free-data-only.md`
- `0002-storybook-first-atomic-design.md`
- `0003-tdd-unit-tests-and-playwright-e2e-with-api-mocks.md`
- `../research/free-flight-weather-tts-apis-2026-10-26.md`
