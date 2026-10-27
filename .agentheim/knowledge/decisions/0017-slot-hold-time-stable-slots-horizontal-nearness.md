---
id: 0017
title: Slot hold time, stable slot positions, nearness stays horizontal
scope: sky-scene
status: accepted
date: 2026-10-27
supersedes: []
superseded_by: []
related_tasks: [sky-scene-g3r8w]
related_adrs: [0001, 0005, 0015]
---
# ADR 0017: Slot hold time, stable slot positions, nearness stays horizontal

## Context
The vision's v1 behaviour is "the two nearest planes", re-evaluated every Takt (30 s). The live test on 2026-10-27 in Oberweyer showed flicker: whenever another plane was marginally nearer the scene swapped, and a Takt later often swapped back. Pure re-selection every Takt makes the scene restless. The existing Vorlese-Sperre only prevents swaps while narrating.

## Decision
- **Minimum hold, no hysteresis.** A plane occupying a slot keeps it for at least N Takte (`scene.slotHoldTakte`, default 3 = 90 s at `pollIntervalSeconds` 30; validated positive integer). After N Takte the ordinary nearest rule applies to that slot again.
- **Hold ends immediately** when the holder leaves the radius or disappears from the flight data; the slot is refilled in that same Takt by the nearest non-holder.
- **Stable slot positions.** No swap between slot 1 and slot 2 while both holders remain; only a freed slot is refilled. The slot number is the scene's stable identity, and the sighting-log `slot` column follows it.
- **Nearness is purely horizontal** (Haversine distance, airspace `selectNearest`, unchanged). Altitude is deliberately ignored. This is a builder decision that matches the intuition of a Flightradar-style map.
- **Composes with the Vorlese-Sperre.** A change blocked by the Sperre is applied at the next Takt after narration ends; hold counters keep counting during narration.
- **Where it lives.** A pure function in sky-scene (e.g. `assignSlots(previous, candidates, now)`, per-slot hold-until) consumes the nearest-first candidates from airspace; airspace is not changed.
- **Vision amendment.** The v1 wording becomes "the two nearest, with a minimum hold of N Takte and stable slot positions".

## Consequences
- The scene is calmer; a plane is shown for at least 90 s by default.
- A plane that becomes clearly nearest may wait up to N-1 Takte before appearing; accepted.
- The shown pair is no longer always the true two nearest; this is intended.
- Real hold time scales with `pollIntervalSeconds` because the unit is Takte.
- Sighting-log `slot` stays stable across a hold; stats on slots become meaningful as identity.
- Slot state is held between Takte in sky-service (in memory); a restart resets it, which is harmless.
- vision.md and the sky-scene README wording should be aligned by the modeling process.
- Sibling capture airspace-h9x4p (proximity weighting) is dismissed.

## Alternatives considered
- **Hysteresis (replace only if the newcomer is nearer by a margin):** rejected; needs a tuned threshold, still flickers near the margin, and is harder to explain and test than a fixed hold.
- **Altitude malus, slant distance or apparent size as nearness:** rejected by builder decision; it diverges from the map intuition users hold, adds tuning and mixes in altitude data of varying quality. Nearness stays horizontal.
- **Do nothing / rely on Vorlese-Sperre:** rejected; it does not cover the silent flicker seen in the live test.
- **Allow slot swaps by distance order:** rejected; swapping positions is itself visible flicker and breaks slot identity in the sighting log.
