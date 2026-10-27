---
id: infrastructure-b4k8n
title: Heartbeat (Dead-Man's-Switch) und Log-Erinnerungen nach ADR 0011 nachziehen
status: backlog
type: feature
context: infrastructure
created: 2026-10-27
depends_on: [infrastructure-001-walking-skeleton]
blocks: []
tags: [observability, follow-up]
related_adrs: [0011, 0007]
related_research: []
prior_art: [infrastructure-001-walking-skeleton]
---

## Why
Der Skeleton hat /healthz und JSON-Logs, aber noch keinen Heartbeat (ADR 0011): ein stiller Ausfall (Quelle tot, iPad aus) faellt erst beim Hinsehen auf.

## What
- Solange der Status `ok` ist, sendet der Dienst alle `health.heartbeatIntervalMinutes` (Default 5) ein HTTP GET an `HEARTBEAT_URL` (nur per Umgebungsvariable); bei `degraded`/`failing` nichts.
- Logs: erster Fehler, hoechstens eine Erinnerung je 10 min, dann Erholungszeile (der Skeleton loggt bisher nur den ersten Fehler und die Erholung der Flugdatenquelle).
- Heartbeat-URL wird nur als Host geloggt, nie mit Pfad/Token.

## Acceptance criteria
- [ ] Unit-Test mit FakeClock: Ping nur bei ok, im Intervall, nicht bei degraded/failing.
- [ ] Fehlende `HEARTBEAT_URL` deaktiviert den Heartbeat ohne Fehler.
- [ ] Secret erscheint in keinem Logfeld (Test).