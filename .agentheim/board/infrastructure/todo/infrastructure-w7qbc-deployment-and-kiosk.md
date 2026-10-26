---
id: infrastructure-w7qbc
title: Decide deployment topology and kiosk operation: Docker Compose on home server, self-recovering kiosk client
status: todo
type: decision
context: infrastructure
created: 2026-10-26
completed:
depends_on: []
blocks: [infrastructure-001-walking-skeleton]
tags: [foundation, deployment, kiosk]
related_adrs: [0001]
related_research: []
prior_art: []
---

## Why
The display runs 24/7 in a child's room and must survive app crashes, server reboots, WLAN loss, browser memory growth and tablet reboots without the builder touching it.

## What
Record the architecture decision as an ADR (scope: `global`), based on the architect's draft below (or the builder's amended version).

## Acceptance criteria
- [ ] ADR committed under `.agentheim/knowledge/decisions/`, status `accepted`, scope `global`.
- [ ] Justification matches the architect's draft (or the user-amended version); deviations are named in the ADR.
- [ ] No code change required.

## Notes
**Load-bearing for walking skeleton:** partly — serve the app, open it manually on the tablet

**Architect note:** Fully Kiosk Browser needs a small one-off licence — not a data-API contract (ADR 0001 not violated), but to be accepted consciously by the builder. Night dimming/rest stays a vision open question.

### Architect's ADR draft

---
id: TBD
title: Docker-Compose service on home server; self-recovering kiosk client
scope: global
status: proposed
date: 2026-10-26
---

## Context
Display runs 24/7 on an old tablet in a child's room; the builder must not have to touch it. Failures to survive: app crash, server reboot, WLAN loss, browser memory growth, tablet reboot.

## Decision
- Server: one container (service + static client + Piper) via Docker Compose, `restart: unless-stopped`, starts on host boot; config and SQLite on bind-mounted volumes. Plain systemd is an accepted equivalent.
- Tablet: kiosk browser at `http://<server>:<port>/` (start-on-boot, screen always on, no system UI). Android: Fully Kiosk Browser preferred. iOS: Guided Access + Auto-Lock off + web-app mode. Device setup documented in README, not automated.
- Client resilience: retry with backoff, keep last good scene (subtle stale indicator after N min); full reload nightly (e.g. 04:00), on `buildId` change and on `online`.
- Updates: `git pull && docker compose up -d --build`; the tablet follows on its own.
- Night dimming/rest deferred; the kiosk app's screen schedule is the first lever.

## Consequences
### Positive
- Crash/network/reboot self-heal; updates need no tablet access.
### Negative
- Manual, OS-specific kiosk setup per device; possible one-off kiosk-app licence.
### Neutral
- Plain HTTP on the LAN; no external exposure.

## Alternatives considered
- **Native Android/iOS app** — store/signing burden, contradicts "no app store".
- **Raspberry Pi display / HDMI stick** — different hardware than the given tablet.
- **Kubernetes/Ansible** — overkill for one host.
