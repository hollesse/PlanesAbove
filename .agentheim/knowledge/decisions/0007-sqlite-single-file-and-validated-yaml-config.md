---
id: 0007
title: SQLite single-file storage (better-sqlite3) and validated YAML configuration
scope: global
status: accepted
date: 2026-10-26
supersedes: []
superseded_by: []
related_tasks: [infrastructure-y8epz, infrastructure-001-walking-skeleton]
related_research: []
---

# ADR 0007: SQLite single-file storage (better-sqlite3) and validated YAML configuration

## Context
The sighting log must survive restarts and be analysable in v2. Volume is tiny (hundreds of rows per day). Configuration (location, radius, source order, thresholds) is operator-only; the vision forbids menus beyond tapping. Maintenance must be near zero (ADR 0001). The stack is fixed by ADR 0004: one Node.js LTS + TypeScript service in one Docker container on ZimaOS. ADR 0005 and 0006 define cached data (route cache, VRS snapshot, last-good weather) and config keys (source order, timeouts, User-Agent, optional OpenSky credentials, weather and sun thresholds, poll interval). adsbdb route data must never be persisted (ADR 0005).

## Decision
**Persistence**
- Durable data lives in **one SQLite file** (WAL mode, `foreign_keys=ON`, `busy_timeout` set) in a data directory that the container mounts as a volume. The concrete path comes from config (`dataDir`); volume layout and Compose belong to the deployment decision, not this ADR.
- **Driver: `better-sqlite3`** (synchronous API, prebuilt binaries for linux x64/arm64, no server). Node's built-in `node:sqlite` is the named alternative and may replace it later behind the same thin repository layer once it is stable in the LTS in use.
- **Migrations:** numbered, forward-only SQL files (`0001-*.sql`, ...) applied at startup in one transaction each, tracked via `PRAGMA user_version`. The service refuses to start if the DB is newer than the code.
- **Ownership:** each BC owns its tables and accesses them only through its own repository module (modular monolith, ADR 0004). `sighting-log` owns `sightings` (one row per flight per visit, with callsign, ICAO24, first/last seen, route if known, closest distance, Auswahl slot). Timestamps are stored as UTC ISO-8601 text or epoch ms; the injectable clock supplies "now".
- **Caches** are disposable and may be deleted at any time: route cache by callsign (TTL hours, negative results shorter) and last-good weather value, in tables of the same file, with a `fetched_at`/`expires_at`. Only sources whose licence allows persistence may be written there (VRS CC0 data, Open-Meteo values). **adsbdb results are kept in memory only, never in the DB** (ADR 0005). The VRS standing-data snapshot is a separate replaceable file in `dataDir`, refreshed periodically, not part of the DB, so it can be swapped atomically and never bloats backups.
- **Backup** = copy the DB file (use SQLite online backup or stop-copy; WAL checkpoint on shutdown). Single writer is fine for one household.
- **Mock mode** uses an in-memory or temp-dir database; scenario files stay JSON (ADR 0004).

**Configuration**
- One **`config.yaml`** in a mounted config location (path via `CONFIG_PATH`, default `./config.yaml`), parsed with the `yaml` package and **validated at startup with a `zod` schema**. Invalid or missing required values abort boot with a readable, all-errors-at-once message naming the key path. Defaults come from the schema; a `config.example.yaml` documents every key and is committed, the real file is not.
- Required keys: `location.lat`, `location.lon`. Defaults: `radiusKm: 30`, `pollIntervalSeconds: 30`, `weather.pollIntervalMinutes: 15`, `dataDir`, `mode: live | mock` (mock mode also names the scenario file).
- Keys accommodated from other ADRs: `sources.flight.order` (adsb.lol first, OpenSky optional), `sources.route.order`, per-source timeouts, polite `userAgent`, route-cache TTLs, weather thresholds (visibility 1000 m, cloud-cover limits, sun elevation limits -6 deg / +4 deg), VRS refresh interval.
- **Secrets** (OpenSky OAuth2 client id/secret, any future adsb.lol key, TTS credentials if any) come **only from environment variables** (or an uncommitted `.env` loaded by the container runtime), never from `config.yaml` and never committed. The schema marks them optional; a source whose credentials are absent is disabled, and if configured in the order but unusable, boot logs a warning instead of failing.
- Config is read once at start; **changing it means editing the file and restarting** the container. No admin UI, no hot reload. The validated, typed config object is passed in explicitly (no global lookups), which keeps tests and mock mode simple. Secret values are never logged.

## Deviations from the architect's draft
- Names the concrete driver (`better-sqlite3`) and validator (`zod` + `yaml`), as ADR 0004 requires a fit to the Node/TypeScript stack.
- Adds the adsbdb exclusion from the DB (ADR 0005) and puts the VRS snapshot in a separate file instead of the DB.
- Adds `PRAGMA user_version` migration tracking and the refuse-newer-DB rule; `.env`/env-only rule for secrets is made explicit.

## Amendment 2026-10-27 (airspace-p2v6d dismissed)
The persisted **route cache** named above is dropped. Every online route source in use (adsbdb, hexdb) may not be persisted by licence; the VRS snapshot is offline and needs no cache; FlightAware (ADR 0018) is not enabled. The route cache stays in memory only (`RouteService`, positive TTL hours, negative minutes). Only the last-good weather value remains a persisted cache. Revisit if FlightAware is switched on.

## Consequences
### Positive
- No DB server; backup = copy a file; v2 analysis via plain SQL.
- Misconfiguration caught at boot with a readable message.
- Licence constraint on adsbdb enforced structurally.
### Negative
- Changing radius or any setting = edit file + restart.
- Native module `better-sqlite3` needs a matching prebuilt binary or build toolchain in the Docker image.
- Single writer (fine for one household).
### Neutral
- Moving to Postgres later needs a migration; not expected.
- Swapping to `node:sqlite` is contained in the repository layer.

## Alternatives considered
- **Postgres** — operational overhead for no benefit.
- **Flat JSONL log** — simplest, but dedupe and analysis are harder.
- **localStorage/IndexedDB on the iPad** — volatile on kiosk devices, hard to read out; the client stores nothing (ADR 0004).
- **Admin UI for config** — contradicts non-goals.
- **`node:sqlite` now** — no native dependency, but stability in the LTS is not yet assured; kept as a later swap.
- **JSON/TOML or env-only config** — YAML gives comments and nested structure for source orders; env-only becomes unreadable for the nested keys.

## References
- `0001-single-household-self-hosted-free-data-only.md`
- `0004-home-server-service-thin-vanilla-js-client.md`
- `0005-free-flight-and-route-sources-behind-ports.md`
- `0006-open-meteo-weather-and-local-sun-position.md`
