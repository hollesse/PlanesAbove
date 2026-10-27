---
id: airspace-jy8hz
title: Decide free ADS-B position and route sources behind a replaceable port (adsb.lol / airplanes.live / adsbdb)
status: done
type: decision
context: airspace
created: 2026-10-26
completed:
depends_on: []
blocks: [infrastructure-001-walking-skeleton]
tags: [foundation, data-source, ads-b, route]
related_adrs: [0001, 0005]
related_research: [free-flight-weather-tts-apis-2026-10-26]
prior_art: []
---

## Why
Flight positions and especially routes are the core data risk: only free, contract-free sources are allowed (ADR 0001), and free route data is incomplete and sometimes wrong.

## What
Record the architecture decision as an ADR (scope: `airspace`), based on the architect's draft below (or the builder's amended version).

## Acceptance criteria
- [ ] ADR committed under `.agentheim/knowledge/decisions/`, status `accepted`, scope `airspace`.
- [ ] Justification matches the architect's draft (or the user-amended version); deviations are named in the ADR.
- [ ] Endpoints, rate limits and terms/attribution of the chosen sources are verified against primary sources (e.g. via `research`) before the ADR is accepted.
- [ ] No code change required.

## Notes
**Verified research (2026-10-26, reviewer PASS):** `../../../knowledge/research/free-flight-weather-tts-apis-2026-10-26.md`
- **adsb.lol holds as the primary source.** `GET /v2/point/{lat}/{lon}/{radius}` is keyless. Radius is an integer in **nm** (30 km → 17), capped at 250.
  - Data is ODbL 1.0, so attribution is required. A key will be required "in the future" (via feeding).
  - Adapters must tolerate missing fields (e.g. `category` and `geom_rate` are absent for MLAT).
- **airplanes.live is out as a keyless fallback.** Users report it has been feeder-only since about Sept 2026, and its official page returns 403. Do not plan on it.
- **OpenSky** works only with OAuth2 client credentials (no basic auth).
  - Credits per day: anonymous 400, registered 4,000, feeders 8,000. A small bbox costs 1 credit.
  - A 30 s cadence means 2,880 calls a day, so only a registered (free) account is viable, and then only as a fallback.
- **Routes:**
  - adsb.lol `POST /api/0/routeset` exists, but its response schema is unverified, and its plausibility flag is a weak heuristic.
  - adsbdb `GET /v0/callsign/{cs}` is keyless, but its **route data may not be copied, published or put into other databases** without permission. Use only a short in-memory cache, never persist it or ship it in an open-source repo.
  - **New CC0 option:** VRS standing-data (`vradarserver/standing-data`) has a `routes` folder under CC0. Evaluate it as an offline route source.
- **Consequence for the decision:** the fallback chain becomes adsb.lol → OpenSky (registered, OAuth2), and airplanes.live is dropped. Route chain: VRS standing-data (offline, CC0) and/or adsb.lol routeset, with adsbdb only as a non-persisted live lookup.
- **Open:** the routeset response format, adsb.lol's real rate limits, and when its key requirement starts.

**Load-bearing for walking skeleton:** yes for positions; route lookup is a stretch

**Architect caveat:** endpoint details were recalled from memory, not verified. Free route data is callsign/schedule-derived — it will sometimes be *wrong*, not just absent; the Steckbrief must never state a route that failed plausibility.

### Architect's ADR draft

---
id: TBD
title: Free ADS-B position and route sources behind a replaceable port
scope: airspace
status: proposed
date: 2026-10-26
---

## Context
ADR 0001 allows only free, contract-free sources. Community ADS-B aggregators (adsb.lol, airplanes.live) expose keyless point queries in readsb-like JSON (distance, type `t`, registration `r`, callsign, altitude, ground speed, climb rate); OpenSky is key/credit-limited. Routes are not part of ADS-B; free route data is schedule/callsign-derived and incomplete. (Details recalled, not verified — confirm before acceptance.)

## Decision
- `FlightSource` port with adapters: adsb.lol (primary), airplanes.live (secondary), OpenSky (optional tertiary). Query point + radius once per 30 s Takt from a single poller. Adapters normalise to an internal `Flugzeug` model; the domain never sees vendor fields.
- `RouteSource` port with adapters: adsb.lol routeset (callsign + position, plausibility check), adsbdb callsign lookup. Cached by callsign (TTL hours; negative results shorter). "Route unbekannt" is a first-class value.
- Fallback order, per-source timeout and a polite User-Agent are configurable. On total outage the last good state is kept and marked stale.
- Selection (2 nearest within radius) is computed from the normalised model, not vendor distance.
- Flugphase derived from vertical rate.

## Consequences
### Positive
- Source swap/outage is a config/adapter change; domain and UI untouched.
- One poller keeps us a polite API citizen.
### Negative
- Routes missing or occasionally wrong; Steckbrief must degrade gracefully.
- Free-service terms can change; attribution (e.g. ODbL) must be shown/documented.
### Neutral
- Contract tests with recorded fixtures per adapter needed.

## Alternatives considered
- **OpenSky only** — credit limits, OAuth, weaker routes.
- **Own ADS-B receiver** — best data, but hardware and off-constraint.
- **Scraping FlightAware/Flightradar24** — ToS violations, brittle.

## Outcome
Decision recorded as provisional ADR 0005-free-flight-and-route-sources-behind-ports.md (scope airspace, accepted). Follows the task body and verified research rather than the task title: airplanes.live dropped (feeder-only), adsbdb restricted to non-persisted live lookup, OpenSky only as registered OAuth2 fallback, VRS standing-data (CC0) as preferred offline route source. Endpoints, limits and terms were taken from the verified research report (primary sources cited there); remaining unknowns (routeset schema, adsb.lol real limits and key date, adsbdb limits) are listed in the ADR as implementation-time checks. No code changed.
