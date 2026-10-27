---
id: infrastructure-q2w8h
title: Test sichert ab, dass die Mock-Endpunkte im Live-Modus nicht erreichbar sind
status: backlog
type: chore
context: infrastructure
created: 2026-10-27
completed:
depends_on: [infrastructure-001]
blocks: []
tags: [security, tests, follow-up]
related_adrs: [0013]
related_research: []
prior_art: [infrastructure-001]
---

## Why
ADR 0013 begründet, dass `POST /mock/advance` und `GET /mock/sightings` keine Angriffsfläche sind, weil sie nur im Mock-Modus registriert werden. Der Code prüft das (`src/server/app.ts`, `if (mock && ...)`), aber kein Test sichert es ab (Hinweis des Verifiers bei infrastructure-001).

## What
Ein Test startet den Dienst im Modus `live` (mit gefakter Flugquelle bzw. ohne Netz) und prüft, dass `/mock/advance` und `/mock/sightings` 404 liefern und die Uhr nicht verändert wird.

## Acceptance criteria
- [ ] Unit- oder E2E-Test: im `live`-Modus liefern beide Mock-Pfade 404.
- [ ] Der Test schlägt fehl, wenn die Mock-Routen unabhängig vom Modus registriert würden.
