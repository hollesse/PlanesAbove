---
id: ADR-0021
title: Own airport table for a source-independent route display
scope: airspace
status: accepted
date: 2026-10-27
related_tasks: [airspace-b7kx2]
related_adrs: [0010, 0014, 0016]
---

# ADR-0021: Own airport table for a source-independent route display

## Context
adsbdb (municipality), hexdb (airport name minus suffix), VRS (Location) and FlightAware (city) name the same airport differently, so one route looked different per source.

## Decision
A static table `tables/airports.json` (ICAO -> city, optional IATA), loaded and validated through `loadTables`/`defaultTables` (ADR 0010), is applied in `formatRoute` as `Stadt (IATA)`. `Airport` gains optional `icao`/`iata`, set by all four adapters. Missing ICAO: source city plus one warning per ICAO and process (RouteService). Seed: VRS Location (up to the first comma) / IATA for every airport of the VRS snapshot, 34k entries (`scripts/airports-seed.mjs`, never overwrites hand corrections; until 2026-10-30 only the airports on routes of sighted callsigns, 209 entries, which left later flights such as Narita without a code); no backfill of stored `sightings.route`.

## Consequences
Airports missing from the VRS snapshot need a hand entry in the table (warning log shows gaps); a newer VRS snapshot is applied by re-running the seed. Old stored VRS route texts keep their old spelling. Display language follows VRS apart from hand corrections.
