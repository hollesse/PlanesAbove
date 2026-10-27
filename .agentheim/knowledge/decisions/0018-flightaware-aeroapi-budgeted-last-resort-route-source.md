---
id: 0018
title: FlightAware AeroAPI as a budgeted, opt-in, last-resort route source (exception to ADR 0001)
scope: airspace
status: accepted
date: 2026-10-27
supersedes: []
superseded_by: []
related_tasks: [airspace-f4q9z]
related_adrs: [0001, 0005, 0007, 0016]
related_research: [route-coverage-sources-2026-10-27]
---
# ADR 0018: FlightAware AeroAPI as a budgeted, opt-in, last-resort route source

## Context
The free callsign databases (adsbdb, hexdb, VRS) fail on reassigned flight numbers and on charters. The live test on 2026-10-27 (research route-coverage-sources-2026-10-27) showed it with three callsigns: LHX1HL, TKJ9GC and LAV8091 were unknown or wrong in the free sources, and FlightAware resolved all three (LHX1HL is LHX1979 Cologne-Munich, TKJ9GC is TKJ26 Duesseldorf-Istanbul SAW, LAV8091 is Duesseldorf-Belgrade). Only a tracking service with flight plans knows the concrete flight. ADR 0001 forbids contracts with and payments to API providers. FlightAware AeroAPI Personal needs an account and a payment card but includes a monthly credit (about 5 USD, 0.005 USD per result set), and its licence allows "storage and distribution of derivative works for personal or academic purposes only".

## Decision
A single, optional, budgeted paid source is allowed as an explicit exception to ADR 0001: FlightAware AeroAPI Personal.
- **Opt-in.** Active only when `flightaware` is listed in `sources.route.order`; the default order does not contain it.
- **Last resort, filtered.** Asked only after all free sources returned unknown, unavailable or rejected, and only for aircraft class narrowbody or larger with a known airline. Light aircraft, gliders, helicopters, business jets, turboprops, regional jets and unknown airline prefixes are never queried.
- **Hard monthly budget**, default 4.50 USD and 900 result sets (`monthlyBudgetUsd`, `monthlyRequestCap`), below the included credit. Enforced by an own event log (table `flightaware_calls`, one row per call incl. failures) plus a usage sync against `/account/usage` (0 USD): at start (paid calls blocked until it succeeds) and at least every 30 minutes. Because FlightAware updates usage with up to 10 minutes delay, the estimate is max(own period sum, last synced `total_cost` + own calls within `usageLagMinutes`, default 15). This also covers calls made by others with the same key. At budget or cap no call is made until the period ends (`billingPeriodStartDay`, default 1); one warning per period.
- **Key only via environment** `FLIGHTAWARE_API_KEY` (ADR 0007); never in `config.yaml`, logs, `/api/state` or `/healthz`. Key absent means adapter disabled with a warning. 401/403 disable the adapter until restart.
- **Persistence allowed** under the Personal licence: route text in `sightings.route` with `route_source = 'flightaware'`, findings in `route_lookups`. This differs from adsbdb (ADR 0016), whose terms forbid copying.
- **Operator rule.** A Claude session never uses the key without the operator's agreement; the number of requests is named and approved before each live call. Workers do not receive the key; fixtures come only from approved calls.
- Plausibility (ADR 0005) applies as for every source.

## Consequences
- Coverage rises where free sources are structurally blind (reassigned numbers, charters); the live test resolved 3 of 3.
- Dependency on an account and a payment card, only for operators who opt in; without the key the system behaves as before.
- Cost has a ceiling (about 4.50 USD per period by default) that holds even with stale usage data or foreign calls on the key.
- Still unresolved: flights without a flight plan (`position_only`, e.g. the LAV8091 return leg) stay "route unknown"; private and general-aviation traffic is deliberately not covered.
- Open until an account exists: the real billing period (calendar month or sign-up day), whether the portal offers a spending limit.
- A new table and migration (`0004`) and a new `route_source` value.

## Alternatives considered
- **Flightradar24 API:** no free tier, terms unclear; rejected.
- **Stay free-only (ADR 0001 unchanged):** keeps the principle but accepts about 30 % unknown routes; rejected for the cases the live test showed.
- **hexdb only:** free, about +8 points of coverage, but same data pool as adsbdb and fails alike on reassigned callsigns; worth doing in addition, not instead.
- **Counter-only budget without usage sync:** rejected; blind to foreign calls and to restarts of counters.

## References
- `../research/route-coverage-sources-2026-10-27.md`
- `tests/fixtures/flightaware/README.txt`
- https://static.flightaware.com/rsrc/aeroapi/aeroapi-openapi.yml
