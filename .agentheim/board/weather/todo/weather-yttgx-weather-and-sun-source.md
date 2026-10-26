---
id: weather-yttgx
title: Decide weather and sun position: Open-Meteo for Wetterlage, locally computed sun for Tageszeit
status: todo
type: decision
context: weather
created: 2026-10-26
completed:
depends_on: []
blocks: [infrastructure-001-walking-skeleton]
tags: [foundation, data-source, weather]
related_adrs: [0001]
related_research: []
prior_art: []
---

## Why
One of 28 skies (4 Tageszeiten × 7 Wetterlagen) must be chosen from free data; sun position is pure astronomy, weather needs a feed.

## What
Record the architecture decision as an ADR (scope: `weather`), based on the architect's draft below (or the builder's amended version).

## Acceptance criteria
- [ ] ADR committed under `.agentheim/knowledge/decisions/`, status `accepted`, scope `weather`.
- [ ] Justification matches the architect's draft (or the user-amended version); deviations are named in the ADR.
- [ ] Open-Meteo terms (non-commercial use) and the WMO-code mapping are verified against primary sources before acceptance.
- [ ] No code change required.

## Notes
**Load-bearing for walking skeleton:** stretch — a fixed sky is enough for the first slice


### Architect's ADR draft

---
id: TBD
title: Open-Meteo for weather, locally computed sun position
scope: weather
status: proposed
date: 2026-10-26
---

## Context
Need one of 28 skies from free data; ADR 0001 requires free, no-contract sources behind an anticorruption layer. (Terms and codes recalled, not verified.)

## Decision
- Tageszeit from solar elevation at the configured lat/lon, using a small in-process library (e.g. suncalc) with fixed elevation thresholds. No network.
- Wetterlage from Open-Meteo current conditions (WMO code + cloud cover + visibility), mapped by a tested pure function to Klar / Leicht bewölkt / Bedeckt / Nebel / Regen / Schnee / Gewitter.
- Poll every 10–15 min, cache in SQLite; on failure keep the last value, else default to Klar.
- Behind a `WeatherSource` port; Bright Sky (DWD) is the documented alternative.

## Consequences
### Positive
- Day/night works fully offline; weather outage only freezes the mood. Very low API load.
### Negative
- Open-Meteo free tier is non-commercial; a future commercial use needs a change.
- WMO-code → 7-state mapping is a judgement call, tuned visually.
### Neutral
- Thresholds are config values.

## Alternatives considered
- **OpenWeatherMap** — requires API key/account.
- **DWD open data directly** — richer, heavier parsing; Bright Sky wraps it.
