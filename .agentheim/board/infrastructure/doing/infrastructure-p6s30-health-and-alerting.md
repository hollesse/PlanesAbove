---
id: infrastructure-p6s30
title: Decide observability: health endpoint, dead-man's-switch heartbeat and structured logs
status: doing
type: decision
context: infrastructure
created: 2026-10-26
completed:
depends_on: []
blocks: [infrastructure-001-walking-skeleton]
tags: [foundation, observability]
related_adrs: [0001]
related_research: []
prior_art: []
---

## Why
Success means weeks of unattended running; the main risk is a silent failure (stale data, dead tablet, dead source) that the builder only notices by looking at the wall.

## What
Record the architecture decision as an ADR (scope: `global`), based on the architect's draft below (or the builder's amended version).

## Acceptance criteria
- [ ] ADR committed under `.agentheim/knowledge/decisions/`, status `accepted`, scope `global`.
- [ ] Justification matches the architect's draft (or the user-amended version); deviations are named in the ADR.
- [ ] No code change required.

## Notes
**Load-bearing for walking skeleton:** no — follows right after


### Architect's ADR draft

---
id: TBD
title: Health endpoint, dead-man's-switch heartbeat and structured logs
scope: global
status: proposed
date: 2026-10-26
---

## Context
Weeks of unattended running are the goal; a silent failure is the main risk. The builder must learn about it without checking the wall.

## Decision
- JSON-line logs to stdout (level, source, duration, error class).
- `GET /healthz`: last successful poll per source, age of last route/weather update, last client poll, DB writable, build id; "degraded" when any age exceeds a configurable threshold.
- Heartbeat: while healthy, ping a configurable URL every few minutes (healthchecks.io free tier or self-hosted ntfy); missing pings → phone notification. Tablet silence (no `/api/state` for N min) counts as unhealthy.
- Stale-but-serving: failures degrade the scene (stale marker, "Zuletzt …"), never blank it.

## Consequences
### Positive
- One tiny mechanism tells the builder when and why the display or a source breaks.
### Negative
- Optional free third-party service in the alert path; if skipped, `/healthz` must be checked manually.
### Neutral
- No Prometheus/metrics stack (YAGNI).

## Alternatives considered
- **Prometheus/Grafana** — heavy for one household.
- **SMTP email alerts** — needs mail config; push is simpler.
- **No monitoring** — conflicts with the near-zero-maintenance goal.
