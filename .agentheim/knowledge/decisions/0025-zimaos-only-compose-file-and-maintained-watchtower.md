---
id: ADR-0025
title: A ZimaOS-only compose file for UI import, and the maintained Watchtower fork
scope: infrastructure
status: accepted
date: 2026-10-28
supersedes: []
superseded_by: []
related_tasks: [infrastructure-z7kq4]
related_adrs: [0008, 0022]
related_research: []
---

# ADR-0025: A ZimaOS-only compose file for UI import, and the maintained Watchtower fork

Amends ADR 0008's "One docker-compose.yml" topology bullet (does not supersede ADR 0008) and the Watchtower image choice in ADR 0022.

## Context
The operator decided on 2026-10-28 to install PlanesAbove through the ZimaOS UI ("Eigene App installieren"), not via SSH. The server has no repo checkout. The single `docker-compose.yml` has `build:` entries, a relative bind mount for storybook, and `tts` behind a Compose profile; the importer may fail on these or ignore profiles and start without speech. Separately, `containrrr/watchtower` is unmaintained and is reported to fail against Docker Engine >= 29 (minimum API 1.44, "client version ... is too old"); the ZimaOS Docker version is unknown.

## Decision
- Add `docker-compose.zimaos.yml` for the home server: GHCR images only (`:main`), no `build:`, no `profiles:`, only absolute bind mounts under `/DATA/AppData/planesabove`, no storybook. `tts` always runs, so speech works after a plain import.
- `docker-compose.yml` stays for the dev machine and the SSH route (build, profiles).
- Both files use `nickfedor/watchtower` (maintained fork, same CLI flags, image published 2026-10-22) instead of `containrrr/watchtower`.
- The Watchtower image is pinned to a fixed version (`nickfedor/watchtower:1.23.2`), never `:latest`. Watchtower does not update itself (it carries no watchtower label), so a moving tag would only drift silently between installs. Version bumps are deliberate, e.g. via Renovate (its docker-compose manager matches both compose files). `planesabove` and `tts` stay on the moving `:main` tag on purpose: that is the continuous-deployment path of ADR 0022.
- No `x-casaos` metadata: it cannot be verified without a real ZimaOS import and is a risk for the import; the app is reached at `http://<server>:8080/`.

## Consequences
- Two compose files must be kept in sync; `tests/unit/deploy-workflow.test.ts` guards the ZimaOS file's rules (no build/profiles/relative mounts/storybook, GHCR images and labels, fork watchtower).
- The operator checks `docker version` on ZimaOS; the real import remains a human-eye acceptance step.
- A tile with a web link in the ZimaOS dashboard is not provided until `x-casaos` is verified.
- Watchtower checks every 60 s (`WATCHTOWER_POLL_INTERVAL=60`, was 300 s in ADR 0022), so a green CI run reaches the iPad within about a minute — useful when testing on the real device. Cost: two anonymous GHCR manifest checks per minute, well within GHCR's limits; the Watchtower image itself is never checked (no label).
- Watchtower is configured through environment variables (`WATCHTOWER_LABEL_ENABLE`, `WATCHTOWER_CLEANUP`, `WATCHTOWER_POLL_INTERVAL`), never `command:`. The first real import on ZimaOS (2026-10-28) passed the `command:` string as a single argument and Watchtower died with `unknown flag: --label-enable --cleanup --interval 60`; `docker compose` splits the string, the UI import does not. Environment entries arrive unchanged in every UI. A test forbids `command:` on the watchtower service.

