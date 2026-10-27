---
id: 0005
title: Free ADS-B position and route sources behind replaceable ports
scope: airspace
status: accepted
date: 2026-10-26
supersedes: []
superseded_by: []
related_tasks: [airspace-jy8hz]
related_research: [free-flight-weather-tts-apis-2026-10-26]
---
# ADR 0005: Free ADS-B position and route sources behind replaceable ports

## Context
ADR 0001 allows only free, contract-free sources and requires external data to sit behind an anticorruption layer. The task (airspace-jy8hz) was written around adsb.lol / airplanes.live / adsbdb. The verified research (free-flight-weather-tts-apis-2026-10-26) contradicts parts of that premise, so this ADR deviates from the architect's original draft in the following named ways:
- airplanes.live is reported (user reports, not primary) to be feeder-only since about Sept 2026 and returns 403 to non-feeders. It is dropped as a keyless secondary.
- adsbdb works keyless, but its route data may not be copied, published or incorporated into other databases without permission. It cannot be persisted or shipped in an open-source repo.
- OpenSky now accepts only OAuth2 client credentials; anonymous 400 credits/day is far below the 2,880 calls/day a 30 s Takt needs; only a registered free account (4,000/day) is viable, research/non-commercial terms.
- A CC0 route source exists: VRS standing-data (`vradarserver/standing-data`, `routes` folder), also what adsb.lol uses for routes.
Routes are not part of ADS-B; free route data is callsign/schedule-derived, so it is sometimes wrong, not just absent. This decision is at port/adapter level and stack-agnostic (runtime stack is decided separately).

## Decision
1. **`FlightSource` port.** One poller queries point + radius once per 30 s Takt. Adapters normalise to the internal `Flugzeug` model; the domain never sees vendor fields. Adapters must tolerate missing fields (e.g. `category`, `geom_rate` absent for MLAT).
   - Primary: **adsb.lol** `GET https://api.adsb.lol/v2/point/{lat}/{lon}/{radius}`, keyless today. Radius is an integer in nautical miles, max 250 (30 km becomes 17 nm).
   - Optional fallback: **OpenSky** with registered OAuth2 client credentials (bbox query, 1 credit). Only enabled if the user configures credentials; one account only.
   - Not used: airplanes.live.
2. **`RouteSource` port.** Returns a `Route` or the first-class value `Route unbekannt`. Chain, configurable:
   - **VRS standing-data routes (CC0)**, as an offline snapshot refreshed periodically; the preferred source.
   - **adsb.lol `POST /api/0/routeset`** (callsign + position) as an optional online source. Its response schema is unverified, so the adapter is built against a recorded real response (contract test) and its plausibility flag is treated as a weak heuristic only.
   - **adsbdb** `GET https://api.adsbdb.com/v0/callsign/{cs}` only as a live lookup with a short in-memory cache; never persisted, never committed or shipped.
3. **Plausibility rule.** The Steckbrief must never state a route that failed plausibility (own check against position/heading/distance); it shows `Route unbekannt` instead.
4. **Operation.** Fallback order, per-source timeout and a polite User-Agent are configurable. On total outage the last good Auswahl is kept and marked stale. Route cache by callsign, TTL hours, negative results shorter. Auswahl (two nearest within radius) is computed from the normalised model, not vendor distance. Flugphase is derived from vertical rate.
5. **Attribution.** Show/document "Data: adsb.lol (ODbL 1.0)" (and VRS standing-data credit where used). The wording is our safe reading, not prescribed by the source.
6. **Verification.** Contract tests per adapter with recorded fixtures.

## Consequences
### Positive
- Source swap or outage is a config/adapter change; domain and UI untouched.
- One poller keeps us a polite API citizen.
- The primary route source is offline and CC0, so no route-lookup rate limit, no redistribution risk, works through outages.
### Negative
- Routes are missing or occasionally wrong; the Steckbrief degrades to `Route unbekannt`.
- adsb.lol announced a future key requirement (obtained by feeding); the date and actual rate limits are unknown. Keys must be configurable per installation (ADR 0001).
- OpenSky fallback is borderline on credits at 30 s and non-commercial only.
- ODbL share-alike may apply to derived databases; we must not build a persisted derived database of adsb.lol data.
### Neutral
- Open items to resolve at implementation: adsb.lol routeset response format and real rate limits (test one real POST from the target host); VRS routes CSV schema and coverage; adsbdb rate limits.

## Alternatives considered
- **adsb.lol + airplanes.live (original draft)** — airplanes.live is feeder-only; rejected.
- **OpenSky only** — OAuth, credit limits, research-only terms, weaker routes.
- **adsbdb as main route source with persistent cache** — forbidden by its copy restriction.
- **Own ADS-B receiver** — best data, but hardware and off-constraint.
- **Scraping FlightAware/Flightradar24** — ToS violations, brittle.

## References
- ADR 0001
- Research: .agentheim/knowledge/research/free-flight-weather-tts-apis-2026-10-26.md
- Task: airspace-jy8hz

## Note on ADR numbering

Minted provisionally as ADR-0004 in its worker worktree. A sibling task's ADR already claimed that number (or the guess overshot the true count) by the time this task's conductor finalized numbering at squash-merge integration (`lib/adr-allocation.mjs`'s `finalizeAdrNumbering`, ADR-0058) — this ADR was renumbered to **ADR-0005**, the true next-free number on `main` at that moment. No content besides this identity changed.
