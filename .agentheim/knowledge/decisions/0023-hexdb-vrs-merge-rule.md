---
id: ADR-0023
title: hexdb and VRS are always asked together; a VRS multi-leg route whose tail is the hexdb route wins
scope: airspace
status: accepted
date: 2026-10-28
related_tasks: [airspace-w1q3x]
related_adrs: [0016, 0021]
---

# ADR-0023: hexdb/VRS merge rule

## Context
hexdb often knows only the current segment of a multi-stop flight (UPS1: Sharjah -> Cologne), while the VRS snapshot has the whole chain. "First plausible wins" stopped at hexdb and never asked VRS, so the real origin was lost. The first implementation also skipped VRS when hexdb was unknown/unavailable/rejected, because adsbdb (default order [hexdb, adsbdb, vrs]) answered first.

## Decision
Every lookup asks hexdb and VRS (VRS is a local snapshot, no request). Partner-first: whenever hexdb or VRS yields no plausible hit (unknown, unavailable, rejected), its partner is asked next, ahead of any non-pair source, whatever the configured order; adsbdb is asked only when both have nothing (or with compareAll). After a pair hit the partner is still asked, adsbdb not. The lastResort (FlightAware) guard is unchanged. If both are plausible and the hexdb route is a proper tail of the VRS route (compared by ICAO leg codes: same destination, hexdb origin is an intermediate stop, order kept), the VRS route is chosen, no conflict. Otherwise a differing pair is a real conflict: first source in `order` stays chosen, conflict flagged. Amends ADR 0016's chain stop rule for the hexdb/VRS pair.

## Consequences
VRS text (CC0) is persistable for those sightings; hexdb text still never persisted. Without compareAll, conflicts between hexdb and VRS are now recorded. Airports lacking ICAO codes are never treated as tail. The configured order still decides all other sources and the conflict winner.

## Note on ADR numbering

Minted provisionally as ADR-0022 in its worker worktree. A sibling task's ADR already claimed that number (or the guess overshot the true count) by the time this task's conductor finalized numbering at squash-merge integration (`lib/adr-allocation.mjs`'s `finalizeAdrNumbering`, ADR-0058) — this ADR was renumbered to **ADR-0023**, the true next-free number on `main` at that moment. No content besides this identity changed.
