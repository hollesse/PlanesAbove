---
id: 0020
title: Übergang-Sperre - running plane transitions are never interrupted; end by fixed timer; diff by icao24 on a compacted planes array
scope: sky-scene
status: accepted
date: 2026-10-27
supersedes: []
superseded_by: []
related_tasks: [sky-scene-n0sfy, design-system-kcpnw]
related_adrs: [0004, 0012, 0017]
---
# ADR 0020: Übergang-Sperre - running plane transitions are never interrupted

## Context
The kiosk client replaced the whole screen on every poll (hard cut). The design-system holds 11 approved 5 s plane transitions (comes / goes / switches) built on sample data. Polls arrive every 10 s, a Takt is 30 s, and a tap can start a narration while a transition is running (Mona may tap the arriving plane from the first frame). The wire `planes[]` array is compacted (empty slots removed, `sky-service.ts`), so ADR 0017's stable slot *positions* do not translate into stable array *indices*.

## Decision
- **Never interrupt.** A running transition plays to its end. States arriving meanwhile are buffered and only the latest is applied afterwards - the same discipline as the Vorlese-Sperre (ADR 0004/0012). Intermediate states are dropped.
- **Second lock instance, chained.** The Übergang-Sperre is a second instance of the `VorleseSperre` class, nested inside the Vorlese-Sperre (poll → Vorlese-Sperre → Übergang-Sperre → show). One shared boolean lock cannot work: tap-during-transition overlaps both, and either release would break the other (scene swap mid-narration or an early-cut animation). `data-speaking` reflects the Vorlese-Sperre only.
- **End by fixed timer**, `TRANSITION_MS + margin`, using the lock's watchdog - not `animationend`. jsdom never fires it, zero animated layers would never end, Safari 16 can skip it; all keyframes use `fill: both`, so a slightly late end is invisible.
- **Diff by icao24 and array position** (`pickTransition(prev, next)` → spec id | `cut` | `same`). Combinations without a catalog spec (e.g. survivor at index 1 after 1→2, a positional move, 2→1 with a newcomer) fall back to a hard cut - never the "nearest" spec, which would animate a plane in the wrong slot.
- **Sky, stale and clock changes stay cuts.** When they coincide with a plane change, the plane spec plays with the new sky switched in at frame 0. Sky/daytime crossfades are out of scope until a follow-up task.
- **Data-driven player.** The design-system player takes `TransitionData` (from/to planes, sky, recent text) instead of sample keys; Storybook keeps the samples as default data. The app imports only through the barrel (ADR 0002).

## Consequences
- Up to ~5 s added latency before a newer state shows; the scene is visibly calmer.
- Taps resolve against the new state immediately; the click handler must target `[data-side="to"]` layers during a transition.
- A reload waits for both locks (`whenFree` on each).
- Adding sky crossfades later means a second decision: crossfade and plane spec in one stage, or sequential.

## Alternatives considered
- **Share one lock instance:** rejected - interleaving bug between narration end and transition end.
- **Interrupt or queue every state:** rejected - restless scene, or a backlog of 5 s animations.
- **`animationend` as end signal:** rejected - untestable in jsdom, undefined with no animated layer, flaky on old Safari.
- **Nearest-spec fallback:** rejected - wrong-slot animation is a worse picture than a cut.
