# infrastructure — Index (task board)

Catalog of this bounded context's tasks by status.

> Updated by: `modeling` (tasks), the lifecycle verbs (promote / claim / complete / capture / dismiss / bounce / reroute).
> Hand-edits are fine but the verbs will append at the section markers below.

---

## Tasks by status

<!-- task-counts:start -->
- **Backlog:** 0
- **Todo:** 5
- **Doing:** 0
- **Done:** 0
<!-- task-counts:end -->

### Todo
<!-- todo-list:start -->
- **infrastructure-001-walking-skeleton** — Walking skeleton — echte Flugzeuge über dem Haus erscheinen auf dem Tablet, Tippen spricht eine Zeile, eine Sichtung wird gespeichert (spike) — depends_on: [infrastructure-pn3w4, infrastructure-y8epz, airspace-jy8hz, airspace-h76v2, weather-yttgx, sky-scene-xczgm, infrastructure-w7qbc, infrastructure-p6s30] — `todo/infrastructure-001-walking-skeleton.md`
- **infrastructure-p6s30** — Decide observability: health endpoint, dead-man's-switch heartbeat and structured logs (decision) — `todo/infrastructure-p6s30-health-and-alerting.md`
- **infrastructure-w7qbc** — Decide deployment topology and kiosk operation: Docker Compose on home server, self-recovering kiosk client (decision) — `todo/infrastructure-w7qbc-deployment-and-kiosk.md`
- **infrastructure-y8epz** — Decide persistence and configuration: SQLite single file plus validated config file (decision) — `todo/infrastructure-y8epz-persistence-and-configuration.md`
- **infrastructure-pn3w4** — Decide runtime split and stack: home-server service computes state, tablet is a thin vanilla-JS client (decision) — `todo/infrastructure-pn3w4-runtime-split-and-stack.md`
<!-- todo-list:end -->

### Doing
<!-- doing-list:start -->
<!-- doing-list:end -->

### Done (most recent first; older entries kept for prior-art search)
<!-- done-list:start -->
<!-- done-list:end -->

### Backlog
<!-- backlog-list:start -->
<!-- backlog-list:end -->

## Pointers

- Knowledge half (ADRs / research / concepts / BC README) for this BC: `../../knowledge/contexts/infrastructure/INDEX.md`
