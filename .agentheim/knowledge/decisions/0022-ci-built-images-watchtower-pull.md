---
id: ADR-0022
title: CI-built images in GHCR and Watchtower pull replace the build on the home server
scope: infrastructure
status: accepted
date: 2026-10-28
related_tasks: [infrastructure-agdax]
related_adrs: [0008, 0011]
---

# ADR-0022: CI-built images in GHCR and Watchtower pull replace the build on the home server

## Context
ADR 0008 defines a manual update path (`git pull && docker compose up -d --build` on the server). The operator wants every commit on `main` to reach the display without touching the server. The repo is public on GitHub; the ZimaOS server is LAN-only and must stay unreachable from outside. Having the server poll git and build itself was rejected: it would deploy untested commits and the ThinkCentre would have to build every image.

## Decision
- A GitHub Actions workflow (`.github/workflows/deploy.yml`) runs on push to `main`. Job `test` runs `npm ci`, typecheck, `npm test`, build. Job `publish` `needs: test`, so a failing step publishes nothing. It pushes `ghcr.io/hollesse/planesabove` and `ghcr.io/hollesse/planesabove-tts` with tags `main` and `sha-<commit>`, using `GITHUB_TOKEN` with `packages: write`. The Piper image is rebuilt only when `docker/piper/**` changed anywhere in the pushed range (`github.event.before..github.sha`, full checkout depth; a missing or all-zero `before` forces a build), when it is missing in GHCR, or on manual dispatch (`force_tts`). Playwright E2E is a separate non-blocking job.
- `docker-compose.yml` references the GHCR images (`build:` stays for local Podman builds) and adds a `watchtower` service (5 min interval, `--label-enable`, `--cleanup`) that only touches containers labelled `com.centurylinklabs.watchtower.enable=true`.
- The new container reports a new `buildId`; the iPad reloads itself (ADR 0008, unchanged).
- Rollback: pin a `sha-<commit>` tag in the compose file.
- This amends the "Update path" of ADR 0008.

## Consequences
- Only tested commits are deployed; the server never builds.
- Trade-off: Watchtower needs the Docker socket on the home server. Accepted for the LAN-only setup. Alternative without a socket: a cron job running `docker compose pull && up -d`.
- GHCR packages are private after the first push; the operator must set both to public once.
- amd64 only; multi-arch via buildx is optional later.
- No failure notification yet (belongs to the heartbeat, infrastructure-b4k8n).
- `buildId` hashes only the client assets, so a server-only commit does not change it (follow-up backlog item).