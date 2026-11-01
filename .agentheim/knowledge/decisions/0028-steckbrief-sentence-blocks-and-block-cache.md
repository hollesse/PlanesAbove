---
id: ADR-0028
title: Steckbrief from sentence blocks with a per-block speech cache
scope: sky-scene
status: accepted
date: 2026-10-31
related_tasks: [sky-scene-b7w2n, sky-scene-jpjt2]
related_adrs: [0012, 0027]
---

# ADR-0028: Steckbrief from sentence blocks with a per-block speech cache

## Context

First listening test with ElevenLabs (31.10.2026): a 136-character Steckbrief cost about 70 credits, so the free 10,000 credits cover roughly 140 announcements a month. The whole text was cached under (adapter, voice, text); because altitude and combination vary per flight, there were almost no hits. The earlier decision (sky-scene-t6h2p) not to unify texts for cache hits is reversed, now backed by measured consumption. Without a known airline the callsign was spelled out, which means nothing to Mona.

## Decision

- The Steckbrief is a list of fixed sentence blocks (`composeSpeechParts`): type+airline, route (first and last city only), altitude (rounded to 500 m, below 1000 m to 100 m), optional flight phase (climb/descent beyond 5 m/s, `phaseMinRateMs`). A block with unknown input is omitted. The callsign is never spoken.
- Each block is rendered individually and cached under (adapter, voice, block text). The composed audio is PCM-concatenated (`concatWav`, `speech.partGapMs` default 250 ms of silence, no re-encoding) and served under a composed key (adapter, voice, hash of the block texts); for a single block the composed key equals the block key, so `/audio/<key>.wav`, duration, state URL and client are unchanged.
- No mixing: blocks of the primary adapter and the fallback are never combined. If one block is missing at the primary (not enough budget for the blocks still to render, error, differing sample rates), the whole Steckbrief comes from the fallback and is stored under the fallback's composed key. Budget (ADR 0027) is charged per delivered block and only for blocks that were actually rendered; the pre-check uses the summed length of the uncached blocks.
- Log line `speech synthesized` carries `parts` and `partsRendered`.

## Amendment (sky-scene-jpjt2): readable storage layout

- Blocks are `{ kategorie, schluessel, text }` and stored as `data/audio/<adapter>/<voice>/<kategorie>/<schluessel>-<texthash6>.wav` (all path segments slugified to `[A-Za-z0-9_-]`). Categories: `typ-airline/<Typcode>_<AirlineICAO>` (`Flugzeug` without type), `route/<IATA>-<IATA>` (a route block exists only when both airports have IATA codes; no ICAO fallback), `hoehe/<meters>`, `phase/steigflug|sinkflug`. The 6-hex hash is over the spoken block text, so reworded blocks get a new file and stale audio is never replayed (no version number).
- The composed Steckbrief is no longer stored as a file; `GET /audio/<key>.wav` joins the cached blocks on each request (cheap PCM concatenation). The URL key stays the composed hash over (adapter, voice, block texts); the client still does not know the adapter (ADR 0012).
- Fallback blocks live under the fallback adapter's and voice's folder, never under the primary folder.
- Lazy migration: on first need of a block, if the old flat `data/audio/<hash24>.wav` (hash over adapter, voice, text) exists, it is moved (`renameSync`) to the new path instead of re-rendering; budget is untouched. Leftover flat files are deleted by hand.

## Consequences

After a warm-up phase almost every block is a cache hit; only new altitude steps cost credits. A block of a partly rendered Steckbrief stays cached even when the whole announcement falls back. Each block has its own sentence melody, audible but accepted. The cache can be browsed, listened to and pruned per block. Two airports with the same spoken city (IST/SAW) produce two files with identical audio, accepted for readability.