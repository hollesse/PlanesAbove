---
id: airspace-jy8hz
title: Decide free ADS-B position and route sources behind a replaceable port (adsb.lol / airplanes.live / adsbdb)
status: todo
type: decision
context: airspace
created: 2026-10-26
completed:
depends_on: []
blocks: [infrastructure-001-walking-skeleton]
tags: [foundation, data-source, ads-b, route]
related_adrs: [0001]
related_research: []
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
