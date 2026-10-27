---
id: 0015
title: Unknown aircraft fall back to light-aircraft "unbekannt"; B emitter categories mapped or excluded
scope: airspace
status: accepted
date: 2026-10-27
supersedes: []
superseded_by: []
related_tasks: [airspace-f7k2m]
related_adrs: [0009, 0010]
---
# ADR 0015: Unknown aircraft fall back to light-aircraft "unbekannt"; B emitter categories mapped or excluded

## Context
ADR 0010 §3(c) ends the Typklasse resolution chain in `narrowbody` when neither a type-code table hit nor a usable emitter category exists. The live test on 2026-10-27 showed the cost: the ultralight Ikarus C42 D-MMDP (type `C42`, emitter category `B4`, received via MLAT) was the nearest aircraft but rendered as a white medium-haul jet. The service only knew A1..A7 as emitter fallback, so every light or exotic aircraft outside the 134-entry table looked like an airliner. Looking like only airliners fly overhead is worse than an honest "unknown".

## Decision
1. **Final fallback.** If there is no type-code hit and no usable emitter category, `resolveTypeClass` yields Typklasse `light-aircraft` with Kategorie `unbekannt` (still `fallback=true`, and the key is still recorded in `unmapped_keys`). This amends ADR 0010 §3(c); the rest of ADR 0010 (tables, precedence, curated Kategorie values, validation at load) stands.
2. **B emitter categories in the fallback.** B1 (glider) -> `glider`; B4 (ultralight / hang-glider / paraglider) -> `light-aircraft`. B0 and B5 (no info / reserved) are treated as "no category". A1..A7 mapping is unchanged.
3. **Excluded from the Auswahl entirely:** B2 (lighter-than-air), B3 (parachutist / skydiver), B6 (UAV), B7 (space / trans-atmospheric), and all C* categories (surface vehicles / obstacles), in addition to on-ground aircraft. They are not "planes above" in the product sense and have no silhouette. The exclusion lives in the airspace module (`selectNearest` or adapter normalisation) and is unit-tested.
4. **Silhouette note.** `light-aircraft` and `glider` are forced to livery `def` (ADR 0009), so the fallback renders neutrally, not with a fabricated airline.

## Consequences
- Unknown types are visibly "small/unknown" instead of falsely an airliner; real unknown airliners (rare, usually table-covered) now also render as light aircraft until curated. `unmapped_keys` remains the curation worklist.
- Kategorie `unbekannt` is a new value outside the curated list of ADR 0010; it appears only through the fallback, never in the table (table validation unchanged).
- Balloons, skydivers, drones and spacecraft vanish from the display even if they are the nearest emitter.

## Alternatives considered
- **Keep `narrowbody` fallback:** reproduces the live-test bug.
- **Dedicated "unknown" silhouette:** needs a new asset and Typklasse (ADR 0009 change); disproportionate for now.
- **Map B2/B6 to light-aircraft:** wrong silhouette, misleading to Mona.
