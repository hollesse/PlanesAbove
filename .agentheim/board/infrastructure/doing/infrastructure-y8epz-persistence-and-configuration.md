---
id: infrastructure-y8epz
title: Decide persistence and configuration: SQLite single file plus validated config file
status: doing
type: decision
context: infrastructure
created: 2026-10-26
completed:
depends_on: []
blocks: [infrastructure-001-walking-skeleton]
tags: [foundation, persistence, config]
related_adrs: [0001]
related_research: []
prior_art: []
---

## Why
The sighting log must survive restarts and be analysable in v2; location/radius/source order are operator-only settings with no UI.

## What
Record the architecture decision as an ADR (scope: `global`), based on the architect's draft below (or the builder's amended version).

## Acceptance criteria
- [ ] ADR committed under `.agentheim/knowledge/decisions/`, status `accepted`, scope `global`.
- [ ] Justification matches the architect's draft (or the user-amended version); deviations are named in the ADR.
- [ ] No code change required.

## Notes
**Load-bearing for walking skeleton:** yes


### Architect's ADR draft

---
id: TBD
title: SQLite single-file storage and file-based configuration
scope: global
status: proposed
date: 2026-10-26
---

## Context
The sighting log must survive restarts and be analysable in v2. Volume is tiny (hundreds of rows/day). Configuration (location, radius, source order, voice) is operator-only; the vision forbids menus beyond tapping. Maintenance must be near zero.

## Decision
- Durable data in one SQLite file (WAL) on a mounted volume; migrations as numbered SQL files applied at startup. Each BC owns its tables; sighting-log owns `sightings` (one row per flight per visit).
- Caches (route by callsign, weather) in the same file with TTLs, disposable.
- One `config.yaml`, validated at startup (fail fast, readable message). Secrets (e.g. optional OpenSky credentials) from env/`.env`, never committed. Defaults: radius 30 km, interval 30 s.

## Consequences
### Positive
- No DB server; backup = copy a file; v2 analysis via SQL.
- Misconfiguration caught at boot.
### Negative
- Changing radius = edit file + restart.
- Single writer (fine for one household).
### Neutral
- Moving to Postgres later needs a migration; not expected.

## Alternatives considered
- **Postgres** — operational overhead for no benefit.
- **Flat JSONL log** — simplest, but dedupe/analysis harder.
- **localStorage/IndexedDB on the tablet** — volatile on kiosk devices, hard to read out.
- **Admin UI for config** — contradicts non-goals.
