---
id: 0013
title: Walking skeleton - mock-mode control surface, real-service E2E and explicitly unverified adapter contracts
scope: infrastructure
status: accepted
date: 2026-10-27
related_tasks: [infrastructure-001, infrastructure-d3v7k, infrastructure-q2w8h]
related_adrs: [0003, 0004, 0005, 0012]
---

# ADR-0013: Walking skeleton - mock-mode control surface, real-service E2E and explicitly unverified adapter contracts

## Context
The skeleton was built in a cloud environment without a home server, iPad, Docker daemon, Piper container or WebKit. ADR 0003/0004 require E2E against the real service in mock mode with a controllable clock, but leave the control mechanism open. Some external contracts (adsb.lol routeset response, Piper HTTP request shape) could not be verified.

## Decision
- **E2E runs the real built service.** Playwright specs spawn `dist/server/server.mjs` (the production bundle, real config validation and composition root) per test on a free port with a temp config and data dir, so tests are isolated and parallel-safe. There is no in-process shortcut.
- **Mock-mode control surface.** Only when `mode: mock`, the service registers `POST /mock/advance {seconds}` (advances the injectable `FakeClock`, running every due Takt synchronously before the response) and `GET /mock/sightings`. In live mode these paths do not exist (404 via static fallback). The scenario drives fake FlightSource/RouteSource/SpeechSynthesizer adapters through the same ports as the live adapters.
- **Client observability hooks.** The client sets `data-state`, `data-planes`, `data-stale`, `data-speaking` on its root element; E2E asserts on these plus the approved component DOM.
- **Stale indicator is a design-system atom.** ADR 0002 forbids ad-hoc UI; the stale marker was added as atom `renderStaleNotice` with two stories (Atoms/Stale-Hinweis) and an optional `stale` prop on the Screen template. It awaits operator approval like any new component.
- **Unverified contracts are labelled, not guessed silently.** The routeset adapter is built against a constructed fixture (a live probe returned 201 with an empty body, handled as Route unbekannt); the Piper adapter against a constructed WAV fixture and an assumed `POST {text, voice}` request. Both are flagged in code comments, README and infrastructure-d3v7k for device-side confirmation. Plausibility of routes is checked by an own corridor test (airport coordinates) with the vendor flag as weak fallback.
- **Skeleton scope cuts (follow-ups filed):** heartbeat (ADR 0011), VRS standing-data route snapshot (ADR 0005 preferred source), ElevenLabs adapter (config schema accepts only `piper|fake`), real weather sky (fixed config sky), a persisted route cache (ADR 0007 asks for a table in the SQLite file; the skeleton keeps the route cache in memory and the persisted cache comes with the VRS snapshot follow-up airspace-m3w9c), the Docker image run (no daemon). Done after verifier feedback instead of cutting: the `sightings` table has the ADR 0007 Auswahl slot column (`slot`, 1/2 or NULL; migration 0001 amended in place because no deployment exists yet) and `docker-compose.yml` has the optional `storybook` profile (nginx serving `storybook-static`, ADR 0008).

## Consequences
- Tests are fast (30 s Takt in milliseconds) and hermetic; a failing boot path (config, bundle, migrations) fails E2E.
- The mock endpoints are an attack-surface-free test seam only because they are absent outside mock mode; a config switch must never be set to mock on the home server.
- Speech and routeset behaviour on real infrastructure is not proven until the device acceptance.

## Amendment 2026-10-27 (infrastructure-q2w8h)
In live mode `GET /mock/sightings` answers 404 (static fallback, body `not found`) and `POST /mock/advance` answers 405 (not 404 as stated above); neither has any mock effect (no clock advance, no scene change). Both are pinned by `tests/unit/server/mock-endpoints-live.test.ts`.
