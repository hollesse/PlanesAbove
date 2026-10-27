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
A static table `tables/airports.json` (ICAO -> city, optional IATA), loaded and validated through `loadTables`/`defaultTables` (ADR 0010), is applied in `formatRoute` as `Stadt (IATA)`. `Airport` gains optional `icao`/`iata`, set by all four adapters. Missing ICAO: source city plus one warning per ICAO and process (RouteService). Seed: VRS Location/IATA for all routes of sighted callsigns (`scripts/airports-seed.mjs`, never overwrites hand corrections); no backfill of stored `sightings.route`.

## Consequences
New airports need a commit to the table (warning log shows gaps). Old stored VRS route texts keep their old spelling. Display language follows VRS apart from hand corrections.
