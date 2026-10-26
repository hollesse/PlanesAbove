---
id: 0003
title: Test-driven development with unit tests; Playwright E2E tests against mocked external APIs
scope: global
status: accepted
date: 2026-10-26
supersedes: []
superseded_by: []
related_tasks: [infrastructure-001-walking-skeleton, design-system-001-styleguide, infrastructure-pn3w4]
related_research: [free-flight-weather-tts-apis-2026-10-26]
---

# ADR 0003: TDD with unit tests; Playwright E2E tests against mocked external APIs

## Context
The builder wants **test-driven development with unit tests**, plus **end-to-end tests**
(Cypress or Playwright) that exercise the whole system against **API mocks**.

PlanesAbove depends on free external services that are flaky, rate-limited and changing:
- flight positions and routes (adsb.lol, OpenSky, VRS / adsbdb);
- weather (Open-Meteo);
- speech synthesis (Piper container, optionally ElevenLabs).

Real traffic over the house is not reproducible. Tests therefore can't depend on live data,
or on being on time to catch a passing A380. The display runs Safari (WebKit) on old iPads
with iPadOS 16+. Near-zero maintenance is a success criterion, and a regression found by Mona
on the wall is too late.

## Decision
- **TDD is the default way of working.** Domain logic and adapters are written test-first
  (red, green, refactor). Unit tests run fast, offline and with one command.
  - Domain logic means: selection of the two nearest aircraft, Vorlese-Sperre, Steckbrief text,
    type-class / airline mapping, weather-to-sky mapping and sighting dedupe.
  - Unit tests cover the server modules and the framework-free UI components.
- **External APIs are only reached through ports** (ADR drafts in airspace, weather and
  sky-scene). Every adapter gets **contract tests** against **recorded fixtures**: real responses
  captured once and checked into the repo, including edge cases. Edge cases include MLAT entries
  without `category`, route unknown, empty sky, HTTP 403/429 and timeouts.
- **E2E tests use Playwright**, run with the **WebKit** engine (plus Chromium for convenience).
  They drive the real service and the real client end to end.
- **API mocks for E2E sit at the server's outbound boundary.** The service can start in a mock
  mode (via config) in which flight, route, weather and TTS adapters are replaced by a local mock
  server or fake adapters fed by scenario files. Example scenarios:
  - "empty sky";
  - "one plane, route known";
  - "two planes";
  - "plane switches during narration";
  - "source outage then recovery";
  - "night + storm".

  The tablet client is never mocked: it talks to the real `/api/state`. Where a test needs to
  pin browser behaviour (e.g. audio `ended`), Playwright route interception or a fake audio
  file is allowed.
- **Time is controllable in tests** (injected clock), so 30 s Takt, nightly reload and weather
  polling run in milliseconds.
- **Storybook stories double as test fixtures.** Components get unit tests, and Playwright
  (WebKit) checks key stories render without errors (ADR 0002).
- **One command runs everything** (e.g. `npm test` for unit + contract, `npm run e2e` for
  Playwright). Each BC README records its test command once its first test lands.

## Consequences
### Positive
- Behaviour such as "no swap while speaking" or "show last good scene on outage" is proven
  deterministically, without waiting for real planes or real failures.
- WebKit E2E catches Safari-specific breakage before it reaches the iPad.
- Switching a data source or TTS engine is safe: the adapter's contract tests define the seam.
- Supports near-zero maintenance: regressions surface in tests, not on the wall.

### Negative
- Fixtures go stale when external APIs change. Contract tests must be refreshed when an adapter
  is touched.
- A mock mode and scenario files are extra code to maintain.
- Playwright WebKit on Linux is close to, but not identical with, iPad Safari. A short manual
  check on the real iPad stays part of human-eye acceptance.

### Neutral
- Unit test runner follows the stack chosen in `infrastructure-pn3w4` (e.g. Vitest or the Node
  test runner for TypeScript).

## Alternatives considered
- **Cypress**: mature DX and good network stubbing, but WebKit/Safari support is only
  experimental. The target device is Safari, so Playwright fits better.
- **Testing against live APIs**: non-deterministic (traffic, weather), rate-limited, and against
  the spirit of free-tier fairness.
- **Mocking in the browser only**: would skip the server's selection and enrichment logic, the
  part most worth testing end to end.

## References
- `0002-storybook-first-atomic-design.md`
- `../research/free-flight-weather-tts-apis-2026-10-26.md`
