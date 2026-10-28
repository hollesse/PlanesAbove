---
id: infrastructure-fbpd5
title: Derive buildId from the commit SHA via a CI build arg
type: chore
context: infrastructure
status: backlog
created: 2026-10-28
completed:
related_adrs: [0008, 0022]
depends_on: [infrastructure-agdax]
---

# Derive buildId from the commit SHA via a CI build arg

## Why
`buildId` currently hashes only `app.js` and `app.css`. A server-only commit deployed through the CD path (ADR 0022) leaves `buildId` unchanged, so README step 9 ("Stand sichtbar unter /healthz -> buildId") is misleading and the deployed state cannot be confirmed for such commits.

## What
Pass the commit SHA into the service image as a Docker build arg in `.github/workflows/deploy.yml` (`GIT_SHA=${{ github.sha }}`), expose it in the Dockerfile as an env var, and derive `buildId` from it (fall back to the asset hash for local builds). Keep the iPad reload behaviour (ADR 0008) working.

## Acceptance criteria
- A server-only commit changes `/healthz` `buildId` after deploy.
- Local builds without the arg still produce a stable `buildId`.
- Unit tests cover the derivation and the fallback; README step 9 stays accurate.