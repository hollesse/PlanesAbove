---
id: 0016
title: adsbdb live lookup first, VRS snapshot as fallback, adsbdb results never persisted
scope: airspace
status: accepted
date: 2026-10-27
supersedes: []
superseded_by: []
related_tasks: [airspace-r5n3k, airspace-w3k8d]
related_adrs: [0001, 0005, 0007, 0014]
---
# ADR 0016: adsbdb live lookup first, VRS snapshot as fallback, adsbdb results never persisted

## Context
ADR 0014 made the offline VRS standing-data snapshot the sole default route source and left adsbdb as an optional live lookup outside the default order. The live test on 2026-10-27 in Oberweyer (50 callsigns) showed the limits of that choice: only 16 routes were displayed. 15 callsigns are not in VRS. 9 are in VRS but wrong because the callsign was reassigned (e.g. QTR56H: VRS says Doha-Dubai, real route Doha-London); the plausibility corridor check (ADR 0005 #3) rejected them correctly. 10 plausible routes were lost to the start-up negative cache, which cached "unknown" while the VRS snapshot was not yet loaded. adsbdb resolved all 9 wrong ones correctly and some of the missing ones.

adsbdb (`GET https://api.adsbdb.com/v0/callsign/{callsign}`, keyless; unknown callsign = HTTP 404 with `{"response":"unknown callsign"}`) rate-limits per IP at 512 requests/min (1 min block) and at 1024 (5 min block); our load is at most 2 lookups per 30 s cycle plus cache. Its terms say route data may not be copied, published or incorporated into other databases.

## Decision
- **Order is `[adsbdb, vrs]` by default.** adsbdb is asked first. VRS is consulted when adsbdb returns unknown, is unavailable (network, 5xx, timeout, parse error), answers 429, or its route fails the corridor check. This amends ADR 0014's "sole default"; the rest of ADR 0014 (routeset removed, snapshot mechanics) stands.
- **Plausibility on every source.** `isPlausibleRoute` applies to every route from every source. A rejected adsbdb route falls through to VRS; a rejected VRS route yields `Route unbekannt`.
- **adsbdb is never persisted.** Results live only in the in-memory `RouteService` cache (positive TTL of hours). The `Route` value carries its source. In `sightings`, `route` holds VRS-derived text only; a new column `route_source` (`vrs` | `adsbdb` | NULL, new numbered migration) lets stats count "route known". An adsbdb hit is stored as `route = NULL`, `route_source = 'adsbdb'`. sky-scene display is unchanged.
- **429 backoff.** On HTTP 429 adsbdb is skipped for `sources.route.adsbdb.backoffMinutes` (default 5) and VRS answers meanwhile. Timeout is `sources.route.adsbdb.timeoutMs` (default 5000); a polite User-Agent is sent.
- **No negative caching on unavailability.** The `RouteSource` port distinguishes `unknown` from `unavailable`. Only a genuine "no route in any source" is cached for `negativeTtlMinutes`; no snapshot, network error and 429 are not cached.
- **Observability.** One `info` log per callsign naming the answering source (`adsbdb`/`vrs`/`none`), `warn` on 429/backoff. `/healthz` unchanged.

## Consequences
- Route coverage and correctness rise markedly, especially for reassigned callsigns.
- The default path now depends on a one-person hobby service. The offline VRS snapshot keeps the scene stable when adsbdb is slow, down or rate-limiting; availability is a soft dependency, not a hard one.
- The licence boundary is explicit and testable: adsbdb text never reaches SQLite. Historic stats can say "route known" for adsbdb sightings but cannot show the route afterwards; this is accepted.
- ADR 0007's persisted route cache (airspace-p2v6d) must never store adsbdb results.
- Schema change: migration adds `sightings.route_source`; existing rows with `route` are set to `vrs`.
- README must attribute adsbdb as live route source (no persistence) alongside VRS.
- The first-boot "unknown for ~10 minutes" problem is removed for the unavailable case.

## Alternatives considered
- **VRS first, adsbdb as fallback:** rejected; VRS is stale on reassigned callsigns and would answer wrongly (or be rejected) before adsbdb is even asked.
- **adsbdb only:** rejected; no offline fallback, a single hobby service would become a hard dependency and the rate limit a single point of failure.
- **Paid route APIs:** rejected by ADR 0001 (free data only, no contracts).
- **Persisting adsbdb results for stats or caching:** rejected; forbidden by its terms.

## Amendment 2026-10-27 (airspace-w3k8d): hexdb.io joins the chain in front of adsbdb
- **Default order is now `[hexdb, adsbdb, vrs]`.** hexdb.io (`GET https://hexdb.io/api/v2/routes/{callsign}`, keyless; 404 `route_not_found` = unknown) is asked first. Reason: at the winter-schedule change on 2026-10-25 hexdb carried the current assignments (JAF76C, LHX1HL, EXS75F, DLH7PP) while adsbdb and VRS still had the summer ones. A measurement over 78 shown flights found 12 cases where only hexdb had a plausible route and 10 where only adsbdb had one. The order remains pure configuration (`sources.route.order`, enum now `vrs | adsbdb | hexdb | flightaware`); FlightAware stays last resort.
- **Conflict rule unchanged: the first plausible route in the chain wins.** Plausibility (airspace-p8w2k) is the arbiter; later sources are only asked on unknown, rejected or unavailable. `compareAll` stays a statistics option.
- **Licence: hexdb is treated like adsbdb.** It states no licence (data partly from the same pool), so its results live only in the in-memory cache and are never persisted. Sightings store `route = NULL`, `route_source = 'hexdb'`; a later vrs/flightaware answer of the same visit may replace that finding, exactly as for adsbdb. `route_lookups` keeps findings only.
- **429 and timeout** follow adsbdb: `sources.route.hexdb.{timeoutMs, backoffMinutes}`, defaults 5000 and 5.
- Everything else in this ADR (plausibility on every source, no negative caching on unavailability, observability) stands and applies to hexdb.