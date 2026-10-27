---
id: 0019
title: Flight source chain - adsb.fi primary, failover to airplanes.live and adsb.lol, per-source backoff
scope: airspace
status: accepted
date: 2026-10-27
supersedes: []
superseded_by: []
related_tasks: [airspace-k2d7f]
related_adrs: [0001, 0005, 0011]
related_research: [flight-position-source-alternatives-2026-10-27]
---
# ADR 0019: Flight source chain - adsb.fi primary, failover and backoff

## Context
ADR 0005 named adsb.lol as the only primary flight source. On 2026-10-27 adsb.lol started answering 429 from about 16:20 UTC and the display stayed on "Letzter Stand". The response headers measured that day were `x-ratelimit-limit: 500, 4;w=1, 60;w=60, 500;w=86400`: 500 requests per IP and day, while a 30 s Takt needs 2880. The research flight-position-source-alternatives-2026-10-27 found adsb.fi keyless with the same readsb schema (all 13 fields the adapter uses present), 1 request/s and no daily limit stated.

## Decision
- **Chain.** A `FlightSourceChain` implements the `FlightSource` port and wraps ordered adapters. Per Takt it asks the first source that is not blocked; on any failure it asks the next one in the same Takt. Only when all fail (or are blocked) does the Takt fail, and the existing stale rule of ADR 0011 applies unchanged. Mock mode bypasses the chain (single `ScenarioFlightSource`).
- **Order.** Config `sources.flight.order`, enum `adsb-fi | airplanes-live | adsb-lol`, default `[adsb-fi, airplanes-live, adsb-lol]`. Unknown names are rejected by the config; names without a registered adapter are skipped with a warning at start (airplanes-live arrives with airspace-v6m3h). Adding a source = one adapter plus registering it under its config name in `app.ts` and in `flight-source-names.ts`. OpenSky and an own receiver were explicitly not chosen (operator decision 2026-10-27).
- **adsb.fi adapter.** `GET https://opendata.adsb.fi/api/v3/lat/{lat}/lon/{lon}/dist/{nm}` (the v2 path is deprecated), shared readsb normalisation with adsb.lol, polite User-Agent. adsb.fi counts 400/401/403/404/429 towards a temporary IP restriction, so after any 4xx the source is paused at least 60 s.
- **Backoff per source (in memory; a restart starts fresh).** (1) A 429 carrying `Retry-After` (seconds or HTTP date) or `x-ratelimit-reset` (seconds until reset) blocks the source for exactly that long; `SourceError.retryAfterMs` carries the pause. (2) Otherwise a circuit breaker: from 3 consecutive failures a pause of 30 s, doubling per further failure up to 300 s, with 0-20 % jitter (capped at 300 s); one success resets. `FlightSourceChain.blockFor(name, ms)` lets a budget (airspace-b9r4w) feed the same blocked-until state.
- **Observability.** `info` "flight source active" on a change of the active source, `warn` when a source is blocked or enters backoff. `/healthz` `flight.active` and `flight.sources[]` give `ok | backoff | blocked`, `until`, `consecutiveFailures`, `lastErrorClass` per source. The per-source request timeout default drops from 8 s to 5 s so three sources fit in one 30 s Takt.
- **Attribution.** adsb.fi terms require citing adsb.fi with a link to its home page and personal, non-commercial use: the README names "Data: adsb.fi (https://adsb.fi)" and, as failover, adsb.lol (ODbL 1.0). The client has no attribution line today; none was added.

## Consequences
- A single source outage or rate limit no longer blanks the display; adsb.fi is the first to be asked, adsb.lol's 500/day budget is only spent on failover.
- If adsb.fi tightens its terms or limits, only `order` changes.
- The 4xx-pause rule makes a misconfiguration (404) visible as a blocked source rather than a hammered one.

## Amendment 2026-10-27
The chain is reduced to two stages: adsb.fi, then adsb.lol. Config enum `sources.flight.order` is now `adsb-fi | adsb-lol`, default `[adsb-fi, adsb-lol]`. Reason: the airplanes.live `point` endpoint is feeder-only (403 for non-feeders, measured 2026-10-27) and the operator runs no feeder ("Feeder bringt mir nichts"), so the stage stayed permanently ineffective and cost one failed call per hour plus a log warning. The airplanes.live adapter, its 403 fixture and its contract test were removed (airspace-c5t9m). The per-Takt failover rule, backoff and observability are unchanged.