---
id: 0001
title: Single-household, self-hosted tool using only free data sources
scope: global
status: accepted
date: 2026-10-26
supersedes: []
superseded_by: []
related_tasks: []
related_research: []
---

# ADR 0001: Single-household, self-hosted tool using only free data sources

## Context
PlanesAbove is built for one child's room: one household, one location, one display, run by the
builder on an old tablet and possibly a home server. The builder might later share it with others,
but only as something technically skilled people host themselves. The builder explicitly does not
want contracts with or payments to API providers. Success also depends on the system running for
weeks without the builder having to step in.

## Decision
PlanesAbove is a single-household, self-hosted tool. It has no user accounts, no multi-tenancy and
no app-store distribution. Flight, route and weather data come only from free sources that need no
contract. Each installation configures its own location and radius, and its own keys if a free
source requires them.

## Consequences
### Positive
- No auth, tenancy or billing complexity; the architecture can stay small.
- No recurring cost or contractual dependency.
- Sharing stays possible as "clone and self-host".

### Negative
- Free sources may be incomplete (routes especially), rate-limited, or change terms. The design
  must treat "route unknown" and source outages as normal states, not errors.
- The polling cadence (30 s) and request volume are bounded by free-tier fairness.

### Neutral
- Any future source swap must be cheap, so external data sits behind an anticorruption layer.

## Alternatives considered
- **Commercial flight API (e.g. paid tiers)** — better data quality, but violates the no-contract/no-cost constraint.
- **Multi-user product** — out of scope; adds accounts, support and hosting burden for no v1 benefit.

## References
- `../vision.md` (Non-goals, Constraints)
