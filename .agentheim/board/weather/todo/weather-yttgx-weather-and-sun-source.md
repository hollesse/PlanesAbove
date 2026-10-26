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
related_research: [free-flight-weather-tts-apis-2026-10-26]
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
**Verified research (2026-10-26, reviewer PASS):** `../../../knowledge/research/free-flight-weather-tts-apis-2026-10-26.md`
- **Open-Meteo is verified:** keyless, free for non-commercial use (explicitly including "personal home automation"), CC BY 4.0.
  - Limits: 600 per minute, 5,000 per hour, 10,000 per day, 300,000 per month.
  - Fields `weather_code` (WMO), `cloud_cover`, `visibility` (m) and `is_day` are confirmed live.
  - Current values update every 15 min, so poll every 10–15 min.
- **Attribution is required:** a link to Open-Meteo plus credit and a licence link. Decide where this appears, e.g. a small credit line or an about/info view.
- **Bright Sky (DWD)** is keyless and free for any purpose, but it returns `condition`/`icon` strings instead of WMO codes and would need a separate mapping. DWD attribution wording is unverified.

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
