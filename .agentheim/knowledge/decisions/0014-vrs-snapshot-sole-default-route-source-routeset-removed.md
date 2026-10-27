---
id: 0014
title: VRS standing-data snapshot is the sole default route source; adsb.lol routeset removed
scope: airspace
status: accepted
date: 2026-10-27
supersedes: []
superseded_by: []
related_tasks: [airspace-m3w9c]
related_adrs: [0001, 0005, 0007, 0013]
---
# ADR 0014: VRS standing-data snapshot is the sole default route source; adsb.lol routeset removed

## Context
ADR 0005 defined the `RouteSource` chain as VRS standing-data (CC0, offline snapshot), adsb.lol `POST /api/0/routeset` (optional online) and adsbdb (live lookup only). ADR 0013 shipped the walking skeleton with only the routeset adapter, built against a constructed fixture because its response schema was unverified. The live test on 2026-10-27 (176 sightings, 0 with a route) showed that routeset answers HTTP 201 with an empty body for every callsign, including known ones (DLH400, RYR6ZM). The request matches the OpenAPI spec and the adsb.lol source, so the endpoint is dead server-side. The VRS data itself is intact: `routes/schema-01/<letter>/<AirlineCode>-all.csv` (large airlines split into `-1..-9`) and `airports/schema-01/<L>/<LL>.csv` in `vradarserver/standing-data`, updated daily, ~19 MB routes + ~2.5 MB airports. Coverage gaps are real (EWG9UX, LOT1RF, CFG068 absent; RYR6ZM, DLH400 present).

## Decision
- **Routeset is removed.** The adapter `adapters/adsb-lol-routeset.ts`, its fixture and contract tests are deleted. It must not be rebuilt against the current endpoint.
- **VRS snapshot is the sole default route source.** The service downloads the relevant VRS trees (`routes/`, `airports/`) periodically into `dataDir`, swaps them in atomically, and builds an in-memory index at startup. There is no per-lookup HTTP. Without any snapshot the service runs and yields `Route unbekannt` (logged as warn).
- **adsbdb stays an optional, non-persisted online lookup** exactly as ADR 0005 states: live lookup only, short in-memory cache, never persisted, committed or shipped. It is not part of the default order; `sources.route.order` accepts `vrs` and optionally `adsbdb`.
- **Licence reasoning.** VRS standing-data is CC0-1.0, so the snapshot may be stored on disk, and any derived cache may be persisted. adsbdb forbids copying/incorporating its data into other databases, so its results may never be written to disk. This keeps ADR 0001 (free, contract-free) intact.
- **Persisted route cache is decoupled.** The SQLite route cache of ADR 0007 only matters for online sources and is split into follow-up airspace-p2v6d. The VRS index is already local and needs no cache layer. The in-memory TTL cache in `RouteService` stays.
- ADR 0005 is amended, not superseded: its port, plausibility rule, ordering and licence stance stand; only the routeset bullet of the chain is withdrawn.

## Consequences
- Route share depends on VRS coverage; `Route unbekannt` remains a regular state (charter, non-scheduled callsigns).
- Boot works offline once a snapshot exists; first boot without network degrades gracefully.
- The service now carries a periodic downloader and a ~20 MB data directory; the index is rebuilt in memory (tens of thousands of callsigns).
- ADR 0013's list of unverified contracts shrinks by the routeset adapter (removed rather than verified).
- adsb.lol's static VRS mirror (`vrs-standing-data.adsb.lol/routes/<2 chars>/<CALLSIGN>.json`) is the same data and a possible online fallback, not adopted here.

## Alternatives considered
- **Keep routeset as optional source:** returns nothing; dead code and false confidence.
- **Online mirror per lookup as primary:** adds a runtime dependency and latency per callsign; offline snapshot is more robust.
- **Persist adsbdb results:** forbidden by its terms.
