---
id: 0008
title: Docker Compose app on ZimaOS; self-recovering iPad kiosk client
scope: global
status: accepted
date: 2026-10-26
supersedes: []
superseded_by: []
related_tasks: [infrastructure-w7qbc, infrastructure-001-walking-skeleton]
related_research: [free-flight-weather-tts-apis-2026-10-26]
---

# ADR 0008: Docker Compose app on ZimaOS; self-recovering iPad kiosk client

## Context
The display runs 24/7 in a child's room. It must survive an app crash, a server reboot, WLAN loss, browser memory growth and an iPad reboot without the builder touching it (ADR 0001). ADR 0004 fixed the runtime: one Node/TypeScript service in a Docker container on the ZimaOS ThinkCentre, and an iPad (iPadOS 16 baseline) showing a thin client full screen with Guided Access. This ADR decides the deployment topology, volumes, restart policy, update path and kiosk behaviour. It does not decide what is stored or the config shape (`infrastructure-y8epz`), and it does not choose the TTS engine (`sky-scene-xczgm`).

## Decision

### Server topology
- **One `docker-compose.yml`, installed on ZimaOS as a custom app.** ZimaOS imports compose files natively. The same file runs on any Docker host (`docker compose up -d`), so the app stays self-hostable as ADR 0001 requires.
- **Service `planesabove`** (required): the Node service, which also serves the static client and `GET /api/state`. It publishes one HTTP port on the LAN (plain HTTP, no external exposure, no reverse proxy, no TLS).
- **Service `tts` (optional sidecar).** If the TTS engine chosen later is a separate process (the research report says Piper is now GPL-3.0 and should run as its own container), it is added as a second service on the compose network. `planesabove` reaches it by service name. No engine is chosen here. This replaces the architect draft's "service + client + Piper in one container".
- **Service `storybook` (optional).** A static Storybook build served by a small web container, started only with the Compose profile `storybook`. It is for review and is never opened by the iPad (ADR 0002, ADR 0004).
- **Restart policy.** `restart: unless-stopped` on every service. Docker starts on ZimaOS boot, so the app returns after a host reboot or power cut.
- **Healthcheck.** The `planesabove` service declares a Docker `healthcheck` against a cheap in-process endpoint (a `/healthz` that does not call external APIs), so `unless-stopped` plus the healthcheck shows a hung service. The service must exit non-zero on unrecoverable startup errors rather than idle.
- **Volumes.** Host bind mounts under `/DATA/AppData/planesabove`, the ZimaOS-managed app-data location: `data/` for persistent state (database, sighting log, cached assets) and `config/` for the config file. What goes into them and the config shape are decided in `infrastructure-y8epz`. Nothing the builder cares about lives inside a container layer, so rebuilds and `down` cannot lose data. Backing up means copying that one directory.
- **Time zone.** The container sets `TZ` to the household's zone so the nightly reload and day/night logic use local time.
- **Reachability.** The ZimaOS host gets a fixed address (DHCP reservation), or a stable hostname such as `zimaos.local`. The iPad shortcut points at that address.

### iPad kiosk (manual, documented in the README, not automated)
- **Home-screen web app.** Open `http://<server>:<port>/` in Safari, then Share > Add to Home Screen. The page sets `apple-mobile-web-app-capable` so it runs full screen without Safari chrome.
- **Guided Access** (Settings > Accessibility) pins the iPad to this app and blocks the home button. **Auto-Lock is set to Never.**
- **Power.** The iPad stays on charge 24/7. A permanently charging old battery wears and can swell. The builder is told to check the battery occasionally. Optionally a smart plug may cap charging, but this is not required.
- **Quiet device.** Automatic iPadOS updates and most notifications are turned off (Do Not Disturb or Focus), so nothing interrupts the display or reboots it unattended.
- **Audio needs a tap.** iPadOS only starts audio from a user gesture, which fits tap-to-speak. After every page reload audio is locked again until the next tap, so the client must never depend on unattended audio. A reload therefore never breaks narration; the next tap re-arms it.
- **Safari may suspend or discard the page** when memory is low or the screen sleeps. This is why the client self-heals (below) instead of assuming it runs continuously.

### Client self-recovery
- **Retry with backoff.** A failed `/api/state` poll retries with capped exponential backoff (cap in the order of 30-60 s). The normal 10-30 s poll cadence resumes after one success.
- **Keep the last good scene.** The client keeps rendering the last good scene while the server or WLAN is down. After N minutes without a successful poll (default 5, configurable) it shows a subtle stale indicator. It does not blank the screen or show an error page.
- **Full reload triggers.** The client reloads the whole page: nightly (default 04:00 local, via the injectable clock of ADR 0004, so it is testable), when `/api/state` reports a different `buildId`, on the browser `online` event, and when the page becomes visible again after being hidden (`visibilitychange`) for longer than the stale threshold. The nightly reload bounds browser memory growth.
- **Reload safety.** A reload does not interrupt narration in progress: while audio plays (Vorlese-Sperre of ADR 0004) the reload is deferred until it ends.
- **No client state.** The iPad stores nothing, so a reload or a discarded tab loses nothing.

### Update path
- On the server: `git pull && docker compose up -d --build` (or re-import the compose file in the ZimaOS UI). Only the changed service restarts. Data lives in the bind mounts and survives.
- The iPad follows by itself: the new build has a new `buildId`, so the next poll triggers a reload. No tablet access is needed for updates.

### Failure matrix
| Failure | Outcome |
| --- | --- |
| App crash or hang | Docker restarts the container; client shows the last good scene, then catches up. |
| Server or ZimaOS reboot | Docker autostart; client retries with backoff, then reloads on success. |
| WLAN loss | Last good scene stays, stale indicator after N minutes; `online` event triggers recovery. |
| Browser memory growth / discarded page | Nightly reload; visibility reload; no state to lose. |
| iPad reboot | **Not self-healing.** Guided Access ends on restart. The builder must unlock, reopen the web app and re-enter Guided Access. Accepted, documented, rare. Mitigated by turning off automatic iPadOS updates and keeping the iPad on charge. |

### Deferred
- **Night dimming or rest** stays an open vision question. Auto-Lock Never and Guided Access give no screen schedule on iPad; a later decision may add an in-app dim overlay driven by the clock.

## Deviations from the architect's draft
- **Android / Fully Kiosk branch removed.** The display is an iPad, so Fully Kiosk Browser and its one-off licence are out of scope. Only the iOS path remains and it is made concrete (home-screen web app, Guided Access, Auto-Lock Never).
- **Server:** the draft's single container with Piper becomes a Compose app with the service and optional `tts` / `storybook` sidecars, because Piper is GPL-3.0 and belongs in its own container. Plain systemd is dropped as an equivalent, because the host is ZimaOS and runs Docker apps.
- **Volumes** are named: `/DATA/AppData/planesabove` (ZimaOS app data), and a healthcheck and `TZ` are added.
- **Added:** the iPad-specific constraints (audio unlock after reload, Safari page discard, 24/7 charging), a `visibilitychange` reload trigger, reload deferral during narration, and the explicit admission that an iPad reboot needs manual Guided Access re-entry.

## Consequences
### Positive
- Crash, reboot and network loss self-heal on both sides; updates need no tablet access.
- State lives in one host directory that is easy to back up; containers are disposable.
- The compose file is portable to any Docker host, keeping the self-hosting promise.
- No kiosk licence; no extra accounts.

### Negative
- An iPad reboot needs a human to re-enter Guided Access.
- Manual one-off iPad setup, documented rather than automated.
- Permanent charging ages the iPad battery.
- Plain HTTP: anyone on the LAN can open the page. Accepted for one household.

### Neutral
- A sidecar TTS container is possible but not yet decided.
- Safari 16 / Playwright WebKit differences (ADR 0004) mean a manual check on the real iPad remains, including a reload after sleep.

## Alternatives considered
- **Plain systemd service, no Docker** — works, but ZimaOS is a container platform and ADR 0004 already chose a container.
- **Everything in one container (including Piper)** — rejected: GPL-3.0 engine should stay a separate process.
- **Native iOS app / Fully Kiosk / MDM single-app mode** — store, signing or licence and device-management burden; contradicts ADR 0001 "no app store".
- **Raspberry Pi with HDMI display** — different hardware from the given iPad.
- **Kubernetes / Ansible** — overkill for one host.
- **Server-pushed reload (SSE/WebSocket)** — rejected with push in ADR 0004; polling the `buildId` is enough.

## References
- `0001-single-household-self-hosted-free-data-only.md`
- `0002-storybook-first-atomic-design.md`
- `0004-home-server-service-thin-vanilla-js-client.md`
- `../research/free-flight-weather-tts-apis-2026-10-26.md`

## Note on ADR numbering

Minted provisionally as ADR-0007 in its worker worktree. A sibling task's ADR already claimed that number (or the guess overshot the true count) by the time this task's conductor finalized numbering at squash-merge integration (`lib/adr-allocation.mjs`'s `finalizeAdrNumbering`, ADR-0058) — this ADR was renumbered to **ADR-0008**, the true next-free number on `main` at that moment. No content besides this identity changed.
