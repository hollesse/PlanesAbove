---
id: 0011
title: Health endpoint, dead-man's-switch heartbeat and structured logs
scope: global
status: accepted
date: 2026-10-26
supersedes: []
superseded_by: []
related_tasks: [infrastructure-p6s30, infrastructure-001-walking-skeleton]
related_research: []
---

# ADR 0011: Health endpoint, dead-man's-switch heartbeat and structured logs

## Context
Success means weeks of unattended running (ADR 0001). The main risk is a silent failure: stale data, a dead source, a dead or unplugged iPad, or a dead server, noticed only by looking at the wall. ADR 0008 already fixed that `planesabove` has a Docker `healthcheck` against a cheap in-process `/healthz` that calls no external API, that `restart: unless-stopped` applies, and that the client shows a stale indicator and keeps the last good scene. ADR 0007 fixed that secrets come only from environment variables and config is read once at start. ADR 0004 gave the injectable clock and `buildId` in `/api/state`. This ADR decides what remains: the meaning and content of `/healthz`, the heartbeat alert path, and the log format.

## Decision

### Logs
- **JSON lines to stdout**, one object per line: `ts` (ISO-8601 UTC, from the injectable clock), `level`, `msg`, and where relevant `source` (e.g. `opensky`, `adsb-lol`, `adsbdb`, `open-meteo`, `tts`, `db`), `durationMs`, `errorClass` (e.g. `timeout`, `http-5xx`, `http-429`, `parse`, `network`).
- **Log transitions, not every repeat.** A source failing every 30 s logs the first failure, then at most one reminder per interval (default 10 min), then a recovery line. This keeps the Docker log readable over weeks.
- **Never log secret values** (ADR 0007) or full URLs containing credentials/tokens; the heartbeat URL is logged by host only.
- **Rotation:** the compose file sets the `json-file` logging driver with `max-size` and `max-file` (about 10 MB x 3) so logs cannot fill the host disk. No log shipping.
- The log level comes from config (`logLevel`, default `info`).

### `GET /healthz`
- Served in-process, cheap, no external calls (as ADR 0008 requires). It reports only state the service already holds in memory plus one trivial DB write check.
- **Body (JSON):** `status` (`ok` | `degraded` | `failing`), `buildId`, `uptimeSeconds`, per source `lastSuccessAt`, `ageSeconds`, `consecutiveFailures` and `lastErrorClass`, `lastClientPollAt` and its age, `db.writable`, and a `reasons` array naming each failed check.
- **Freshness is judged per source, not as one number:**
  - Flight source (the active one in the order of ADR 0005): a successful poll counts even when it returns zero aircraft. Degraded when age > `3 x pollIntervalSeconds` (configurable `health.flightMaxAgeSeconds`).
  - Weather: degraded when age > `3 x weather.pollIntervalMinutes` (configurable).
  - Route/enrichment lookups happen only when a new flight appears, so age is meaningless in a quiet sky. They are judged by `consecutiveFailures` (degraded at 5, configurable) rather than by age.
  - TTS (if a sidecar exists): reported, never degrades the status, because narration is tap-triggered and optional.
- **Client silence:** `degraded` when no `/api/state` request arrived for `health.clientSilenceMinutes` (default 10). After boot a grace period of the same length applies.
- **Status mapping:** `degraded` is HTTP 200; `failing` (database not writable, or the poll scheduler has not ticked for several intervals, i.e. the event loop or scheduler is stuck) is HTTP 503. The Docker healthcheck therefore reacts only to `failing`: restarting a container does not fix an upstream outage or a dead iPad, and restart loops on a source outage would be harmful. A source outage is for the builder to learn about through the heartbeat, not for Docker to "fix".
- No auth (plain HTTP on the LAN, ADR 0008); the body contains no secrets and no location.

### Heartbeat (dead-man's-switch)
- **Mechanism:** while status is `ok`, the service sends an HTTP GET to the URL in env var `HEARTBEAT_URL` every `health.heartbeatIntervalMinutes` (default 5). While `degraded` or `failing` it sends nothing. Missing pings make the external service notify the builder's phone after a grace period (a few intervals, set at that service).
- **The URL is an env-only value** (ADR 0007): healthchecks.io check URLs carry an unguessable key and count as a secret. It is never in `config.yaml`, never logged in full. If unset, the heartbeat is disabled and boot logs one info line; `/healthz` must then be checked by hand.
- **Recommended target: an off-box, free healthchecks.io check.** A dead-man's-switch only detects host death, power cut, or internet loss if the receiver lives outside the ThinkCentre. A self-hosted ntfy or Healthchecks on the same ZimaOS box is allowed by configuration but would be silent in exactly those cases; the README must say so. The sender is service-agnostic (a plain GET), so either works. Phone push comes from the receiver's own free notification channel; the app implements no SMTP, no push, no alert logic.
- **Failed pings** (the internet is down) log a warning and are retried at the next interval; they never affect status or the scene.
- **Not a contract:** healthchecks.io is a free tier with no agreement (ADR 0001). The display works fully without it; only the alerting is lost.
- **Tablet silence counts** through the client-silence rule above, so a dead iPad stops the heartbeat and reaches the phone.
- **The nightly reload (04:00, ADR 0008)** and routine restarts need no special handling: a short ping gap is inside the receiver's grace period.

### Stale-but-serving
- Source failures degrade the scene (stale marker, "Zuletzt ...", cached route/weather within TTL) and never blank it, as in ADR 0008 for the client and ADR 0007 for caches. Health status and heartbeat are the only escalation path; the scene itself is never an error page.

## Deviations from the architect's draft
- **Added a three-level status** (`ok` / `degraded` / `failing`) with the HTTP code only 503 for `failing`, so the existing Docker healthcheck (ADR 0008) does not restart the container on upstream outages.
- **Per-source freshness rules** instead of one threshold: "poll succeeded with zero aircraft" counts as success; route lookups are judged by consecutive failures, not age.
- **Heartbeat sent only while `ok`**, URL treated as an env-only secret, and an explicit recommendation for an off-box receiver (draft allowed self-hosted ntfy without noting the blind spot).
- **Added** transition-based logging, log rotation, no-secrets rule and TTS non-degrading.

## Consequences
### Positive
- One small mechanism tells the builder when the display, a source, or the whole host breaks, without checking the wall.
- A source outage never causes a restart loop or a blank scene.
- Fits ADR 0007 (env-only secrets) and ADR 0004 (injectable clock makes thresholds testable with a fake clock).
### Negative
- The alert path depends on an optional free third-party service with no contract; without it, `/healthz` is checked manually.
- Heartbeat gaps also fire during home internet outages (accepted: the display's data is stale then too).
- Thresholds need tuning once real behaviour is seen.
### Neutral
- No Prometheus/metrics stack (YAGNI); `/healthz` JSON is sufficient and can be scraped later.
- Config keys added: `logLevel`, `health.*`; env var `HEARTBEAT_URL`. The walking skeleton implements at least `/healthz` and JSON logs; the heartbeat can follow.

## Alternatives considered
- **Prometheus/Grafana** — heavy for one household.
- **SMTP email alerts** — needs mail config and credentials; a push-capable external receiver is simpler.
- **Healthcheck fails on any degraded state** — rejected: restarts do not cure upstream or iPad problems and could loop.
- **Self-hosted-only alerting** — blind to host and power failure.
- **No monitoring** — conflicts with the near-zero-maintenance goal.

## References
- `0001-single-household-self-hosted-free-data-only.md`
- `0004-home-server-service-thin-vanilla-js-client.md`
- `0007-sqlite-single-file-and-validated-yaml-config.md`
- `0008-compose-on-zimaos-and-self-recovering-ipad-kiosk.md`

## Note on ADR numbering

Minted provisionally as ADR-0010 in its worker worktree. A sibling task's ADR already claimed that number (or the guess overshot the true count) by the time this task's conductor finalized numbering at squash-merge integration (`lib/adr-allocation.mjs`'s `finalizeAdrNumbering`, ADR-0058) — this ADR was renumbered to **ADR-0011**, the true next-free number on `main` at that moment. No content besides this identity changed.
