# infrastructure — Index (task board)

Catalog of this bounded context's tasks by status.

> Updated by: `modeling` (tasks), the lifecycle verbs (promote / claim / complete / capture / dismiss / bounce / reroute).
> Hand-edits are fine but the verbs will append at the section markers below.

---

## Tasks by status

<!-- task-counts:start -->
- **Backlog:** 1
- **Todo:** 0
- **Doing:** 1
- **Done:** 9
<!-- task-counts:end -->

### Todo
<!-- todo-list:start -->
- **infrastructure-001-walking-skeleton** — Walking skeleton — echte Flugzeuge über dem Haus erscheinen auf dem iPad, Tippen spricht eine Zeile, eine Sichtung wird gespeichert (spike) — depends_on: [design-system-001-styleguide, infrastructure-pn3w4, infrastructure-y8epz, airspace-jy8hz, airspace-h76v2, weather-yttgx, sky-scene-xczgm, infrastructure-w7qbc, infrastructure-p6s30] — `todo/infrastructure-001-walking-skeleton.md`
<!-- todo-list:end -->

### Doing
<!-- doing-list:start -->
- **infrastructure-fbpd5** — Commit-SHA als eigenes Feld `commit` in /healthz und im Startlog, per CI-Build-Arg ins Image; buildId bleibt der Client-Asset-Hash und steuert weiter den iPad-Reload (chore) — `doing/infrastructure-fbpd5-derive-buildid-from-the-commit-sha-via-a-ci-build-arg.md`
<!-- doing-list:end -->

### Done (most recent first; older entries kept for prior-art search)
<!-- done-list:start -->
- **infrastructure-z7kq4** — Eigene Compose-Datei für den Import über die ZimaOS-Oberfläche (ohne build, Piper fest dabei, gepflegter Watchtower) (feature) — `done/infrastructure-z7kq4-zimaos-compose-datei-fuer-den-import-ueber-die-oberflaeche.md`
- **infrastructure-d3v7k** — Geräteabnahme des Walking Skeletons auf ZimaOS-Heimserver und echtem iPad (chore) — `done/infrastructure-d3v7k-ger-teabnahme-des-walking-skeletons-auf-zimaos-heimserver-un.md`
- **infrastructure-agdax** — Continuous Deployment: GitHub Action testet und baut Images nach GHCR bei jedem Push auf main; Watchtower auf ZimaOS zieht sie, das iPad lädt sich über die buildId selbst neu (feature) — `done/infrastructure-agdax-continuous-deployment-github-action-ghcr-watchtower-zimaos.md`
- **infrastructure-q2w8h** — Test sichert ab, dass die Mock-Endpunkte im Live-Modus nicht erreichbar sind (chore) — `done/infrastructure-q2w8h-test-sichert-ab-dass-die-mock-endpunkte-im-live-modus-nicht.md`
- **infrastructure-001** — Walking skeleton — echte Flugzeuge über dem Haus erscheinen auf dem iPad, Tippen spricht eine Zeile, eine Sichtung wird gespeichert (spike) — `done/infrastructure-001-walking-skeleton.md`
- **infrastructure-p6s30** — Decide observability: health endpoint, dead-man's-switch heartbeat and structured logs (decision) — `done/infrastructure-p6s30-health-and-alerting.md`
- **infrastructure-w7qbc** — Decide deployment topology and kiosk operation: Docker Compose app on ZimaOS, self-recovering iPad client via Guided Access (decision) — `done/infrastructure-w7qbc-deployment-and-kiosk.md`
- **infrastructure-y8epz** — Decide persistence and configuration: SQLite single file plus validated config file (decision) — `done/infrastructure-y8epz-persistence-and-configuration.md`
- **infrastructure-pn3w4** — Decide runtime split and stack: home-server service computes state, tablet is a thin vanilla-JS client (decision) — `done/infrastructure-pn3w4-runtime-split-and-stack.md`
<!-- done-list:end -->

### Backlog
<!-- backlog-list:start -->
- **infrastructure-b4k8n** — Heartbeat (Dead-Man's-Switch) und Log-Erinnerungen nach ADR 0011 nachziehen (feature) — `backlog/infrastructure-b4k8n-heartbeat-dead-man-s-switch-und-log-erinnerungen-nach-adr-00.md`
<!-- backlog-list:end -->

## Pointers

- Knowledge half (ADRs / research / concepts / BC README) for this BC: `../../knowledge/contexts/infrastructure/INDEX.md`
