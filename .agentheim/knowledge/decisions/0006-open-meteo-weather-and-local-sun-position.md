---
id: 0006
title: Open-Meteo for Wetterlage, locally computed sun position for Tageszeit
scope: weather
status: accepted
date: 2026-10-26
supersedes: []
superseded_by: []
related_tasks: [weather-yttgx]
related_research: [free-flight-weather-tts-apis-2026-10-26]
---
# ADR 0006: Open-Meteo for Wetterlage, locally computed sun position for Tageszeit

## Context
One of 28 skies (4 Tageszeiten x 7 Wetterlagen) must be chosen from free data. ADR 0001 requires free, no-contract sources behind an anticorruption layer, and treats source outages as normal states. Sun position is pure astronomy and needs no feed; weather needs one. The research (free-flight-weather-tts-apis-2026-10-26, reviewer PASS) verified live that Open-Meteo is keyless, free for non-commercial use (explicitly including personal home automation) under CC BY 4.0, serves `weather_code` (WMO), `cloud_cover`, `visibility` (m) and `is_day`, updates current values every 15 min, and has limits of 600/min, 5,000/h, 10,000/day, 300,000/month. This decision is stack-agnostic: it fixes ports, mapping and behavior, not the language or libraries (the runtime stack is decided separately).

## Decision
- **Tageszeit is computed locally**, no network: solar elevation at the configured lat/lon via a standard solar-position algorithm (NOAA/SPA-style, as in suncalc-like libraries). Defaults, all config values: Nacht below -6 deg; Morgendaemmerung / Abenddaemmerung between -6 deg and +4 deg, split by direction (sun rising before solar noon = Morgen, falling after = Abend); Tag above +4 deg. Open-Meteo `is_day` is NOT used (binary, cannot yield the 4 states) and no second sun source is needed.
- **Wetterlage comes from Open-Meteo current conditions** behind a `WeatherSource` port (anticorruption layer, ADR 0001). The adapter requests `weather_code`, `cloud_cover`, `visibility`; a tested pure function maps them to exactly one of Klar / Leicht bewoelkt / Bedeckt / Nebel / Regen / Schnee / Gewitter. Precedence: Gewitter > Schnee > Regen > Nebel > cloud-based.
  - WMO 95, 96, 99 -> Gewitter.
  - WMO 71-77, 85, 86 -> Schnee (also 56, 57, 66, 67 freezing precipitation -> Regen, not Schnee).
  - WMO 51-55, 56, 57, 61-65, 66, 67, 80-82 -> Regen.
  - WMO 45, 48 -> Nebel; additionally, visibility below a config threshold (default 1000 m) with no precipitation -> Nebel.
  - WMO 0, 1 -> Klar; WMO 2 -> Leicht bewoelkt; WMO 3 -> Bedeckt. When the code is a plain sky code, `cloud_cover` refines: below ~20 % Klar, 20-70 % Leicht bewoelkt, above ~70 % Bedeckt (thresholds are config values).
  - Unknown/unmapped code -> fall back to the cloud_cover rule; never an error.
  The mapping is a judgement call, tuned visually; it is covered by table-driven unit tests per WMO code.
- **Polling and failure:** poll every 10-15 min (default 15; the source updates every 15 min, well within limits). Cache the last good value; on failure keep it, and before any success default to Klar. Outage freezes only the weather mood; Tageszeit keeps working offline.
- **Attribution:** the Open-Meteo credit line (link to Open-Meteo, credit, CC BY 4.0 licence link) is shown in a small credit line or an info/about view of the display, not on the sky art itself.
- **Alternative adapter:** Bright Sky (DWD) is the documented fallback `WeatherSource`; it returns `condition`/`icon` strings, needs its own mapping and DWD source credit (wording unverified).

## Consequences
Positive: day/night works fully offline; a weather outage only freezes the mood; very low API load (about 100/day vs 10,000/day limit); source swap is one adapter plus one mapping.
Negative: Open-Meteo free tier is non-commercial, so commercial use or distribution as a service needs a change (consistent with ADR 0001); attribution must be implemented and kept; the WMO to 7-state mapping and elevation thresholds are subjective and need visual tuning.
Neutral: thresholds (elevation, visibility, cloud cover, poll interval) are config values. Terms were verified via the reviewed research, which cites the primary Open-Meteo terms/licence pages; they should be re-checked if terms change.

## Alternatives considered
- **OpenWeatherMap** - requires an API key/account, against ADR 0001's spirit.
- **DWD open data directly** - richer but heavy parsing; Bright Sky wraps it, kept as fallback.
- **Open-Meteo `is_day` for Tageszeit** - binary only, cannot express twilight.
- **Fetching sunrise/sunset from a weather API** - adds a network dependency for something computable offline.

## References
- ADR 0001
- .agentheim/knowledge/research/free-flight-weather-tts-apis-2026-10-26.md
- https://open-meteo.com/en/terms, https://open-meteo.com/en/licence, https://open-meteo.com/en/docs

## Note on ADR numbering

Minted provisionally as ADR-0004 in its worker worktree. A sibling task's ADR already claimed that number (or the guess overshot the true count) by the time this task's conductor finalized numbering at squash-merge integration (`lib/adr-allocation.mjs`'s `finalizeAdrNumbering`, ADR-0058) — this ADR was renumbered to **ADR-0006**, the true next-free number on `main` at that moment. No content besides this identity changed.
