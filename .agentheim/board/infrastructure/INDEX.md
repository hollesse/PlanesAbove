# infrastructure — Index (task board)

Catalog of this bounded context's tasks by status.

> Updated by: `modeling` (tasks), the lifecycle verbs (promote / claim / complete / capture / dismiss / bounce / reroute).
> Hand-edits are fine but the verbs will append at the section markers below.

---

## Tasks by status

<!-- task-counts:start -->
- **Backlog:** 2
- **Todo:** 0
- **Doing:** 1
- **Done:** 5
<!-- task-counts:end -->

### Todo
<!-- todo-list:start -->
- **infrastructure-001-walking-skeleton** — Walking skeleton — echte Flugzeuge über dem Haus erscheinen auf dem iPad, Tippen spricht eine Zeile, eine Sichtung wird gespeichert (spike) — depends_on: [design-system-001-styleguide, infrastructure-pn3w4, infrastructure-y8epz, airspace-jy8hz, airspace-h76v2, weather-yttgx, sky-scene-xczgm, infrastructure-w7qbc, infrastructure-p6s30] — `todo/infrastructure-001-walking-skeleton.md`
<!-- todo-list:end -->

### Doing
<!-- doing-list:start -->
- **infrastructure-q2w8h** — Test sichert ab, dass die Mock-Endpunkte im Live-Modus nicht erreichbar sind (chore) — `doing/infrastructure-q2w8h-test-sichert-ab-dass-die-mock-endpunkte-im-live-modus-nicht.md`
<!-- doing-list:end -->

### Done (most recent first; older entries kept for prior-art search)
<!-- done-list:start -->
- **infrastructure-001** — Walking skeleton — echte Flugzeuge über dem Haus erscheinen auf dem iPad, Tippen spricht eine Zeile, eine Sichtung wird gespeichert (spike) — `done/infrastructure-001-walking-skeleton.md`
- **infrastructure-p6s30** — Decide observability: health endpoint, dead-man's-switch heartbeat and structured logs (decision) — `done/infrastructure-p6s30-health-and-alerting.md`
- **infrastructure-w7qbc** — Decide deployment topology and kiosk operation: Docker Compose app on ZimaOS, self-recovering iPad client via Guided Access (decision) — `done/infrastructure-w7qbc-deployment-and-kiosk.md`
- **infrastructure-y8epz** — Decide persistence and configuration: SQLite single file plus validated config file (decision) — `done/infrastructure-y8epz-persistence-and-configuration.md`
- **infrastructure-pn3w4** — Decide runtime split and stack: home-server service computes state, tablet is a thin vanilla-JS client (decision) — `done/infrastructure-pn3w4-runtime-split-and-stack.md`
<!-- done-list:end -->

### Backlog
<!-- backlog-list:start -->
- **infrastructure-b4k8n** — Heartbeat (Dead-Man's-Switch) und Log-Erinnerungen nach ADR 0011 nachziehen (feature) — `backlog/infrastructure-b4k8n-heartbeat-dead-man-s-switch-und-log-erinnerungen-nach-adr-00.md`
- **infrastructure-d3v7k** — Geräteabnahme des Walking Skeletons auf ZimaOS-Heimserver und echtem iPad (chore) — `backlog/infrastructure-d3v7k-ger-teabnahme-des-walking-skeletons-auf-zimaos-heimserver-un.md`
<!-- backlog-list:end -->

## Pointers

- Knowledge half (ADRs / research / concepts / BC README) for this BC: `../../knowledge/contexts/infrastructure/INDEX.md`
