---
id: sky-scene-w9n4f
title: Szene gilt erst als veraltet, wenn der letzte erfolgreiche Abruf älter als 3 Takte (90 s) ist
status: doing
type: feature
context: sky-scene
created: 2026-10-27
completed:
depends_on: [design-system-r5d7v]
blocks: []
tags: [stale, health, follow-up]
related_adrs: [0008, 0011, 0013]
related_research: []
prior_art: [infrastructure-001, design-system-r5d7v]
---

## Why
Heute markiert der Dienst die Szene schon nach **einem** fehlgeschlagenen Abruf der Flugdatenquelle als veraltet (`src/server/modules/sky-scene/sky-service.ts`, `this.stale = true` im catch). Ein einzelner Aussetzer der kostenlosen Quelle (Timeout, 429) schaltet die Kopfzeile damit für 30 s auf „Letzter Stand“ — unruhig. Der Betreiber hat entschieden: veraltet erst, wenn der letzte erfolgreiche Abruf länger als 3 Takte zurückliegt (90 s bei 30-s-Takt), einstellbar — dieselbe Regel, mit der `/healthz` die Flugquelle als `degraded` meldet (ADR 0011).

## What
- Der serverseitige `stale`-Zustand der Szene wird nicht mehr bei jedem Fehlschlag gesetzt, sondern berechnet: veraltet, wenn `now - lastSuccessAt > flightMaxAge` (bzw. seit Start noch kein Erfolg und `now - bootAt > flightMaxAge`).
- `flightMaxAge` ist **ein gemeinsamer Schwellwert** für Szene und `/healthz`: `health.flightMaxAgeSeconds` aus `config.yaml`, Default `3 × pollIntervalSeconds`. Die Berechnung liegt an einer Stelle (keine zwei getrennten Defaults).
- Einzelne Fehlschläge unterhalb der Schwelle zeigen weiter die letzte gute Szene mit „Live · <Uhrzeit des letzten Erfolgs>“ — die Kopfzeile wechselt erst nach Überschreiten der Schwelle auf „Letzter Stand“.
- Die Client-Regel (kein erfolgreicher Poll seit `client.staleAfterMinutes`, Default 5 min) bleibt unverändert.
- `config.example.yaml` und README dokumentieren beide Regeln.

## Acceptance criteria
- [ ] Unit-Test (FakeClock): ein einzelner Fehlschlag bzw. Fehlschläge innerhalb von 90 s → Szene nicht veraltet; Fehlschläge länger als 90 s seit dem letzten Erfolg → veraltet mit der Uhrzeit des letzten Erfolgs; nächster Erfolg → wieder live.
- [ ] Unit-Test: ein gesetztes `health.flightMaxAgeSeconds` gilt für Szene und `/healthz` gleichermaßen; ohne Angabe gilt 3 × `pollIntervalSeconds`.
- [ ] E2E-Szenario „Ausfall der Quelle“ deckt beides ab: kurzer Ausfall (ein Takt) zeigt weiter „Live“, längerer Ausfall (> 90 s) zeigt „Letzter Stand“, danach Erholung auf „Live“.
- [ ] Alle Tests grün (Vitest, Typecheck, Build, Playwright Chromium).

## Notes
- Betreiber-Entscheidung 2026-10-27 nach Rückfrage: „Ja mach das so. Das passt“ (Vorschlag: Regel 1 auf 3 Takte/90 s, Regel 2 bleibt 5 min).
- Relevante Stellen: `src/server/modules/sky-scene/sky-service.ts` (tick/state), `src/server/health.ts` (`maxAge = flightMaxAgeMs ?? 3 * pollIntervalMs`), `src/server/config.ts` (`health.flightMaxAgeSeconds`), `scenarios/outage-recovery.json`, `tests/e2e/skeleton.spec.ts`.

## Verifier note (iteration 1)
**REASONS:**
- Check 1, criterion 2 ("ein gesetztes `health.flightMaxAgeSeconds` gilt für Szene und `/healthz` gleichermaßen; ohne Angabe gilt 3 × `pollIntervalSeconds`"): the `/healthz` half has no test. config.test.ts only checks the helper `flightMaxAgeMs`; sky-service.test.ts only the scene side. Reverting the app.ts:103 wiring (or dropping the `flightMaxAgeMs` argument) leaves every test green.
- "Die Berechnung liegt an einer Stelle (keine zwei getrennten Defaults)" not met: src/server/health.ts:27 still has `const maxAge = i.flightMaxAgeMs ?? 3 * i.pollIntervalMs;` and `HealthInput.flightMaxAgeMs` is optional (health.ts:10) — a second copy of the default next to `flightMaxAgeMs(config)` (config.ts:57).
- Otherwise correct: scene unit test (short outage live, exactly 90 s live, 120 s stale with last-success clock, recovery); E2E timeline consistent. The "no success since boot" case is coded via `bootAt` but untested.
**SUGGESTED_FIX:** Make `HealthInput.flightMaxAgeMs` required and remove the `?? 3 * i.pollIntervalMs` fallback in health.ts so `flightMaxAgeMs(config)` is the only computation. Add a unit/integration test that runs the service/app with `health.flightMaxAgeSeconds: N` (and one with the default) and asserts that at N+1 s without success the scene is `stale: true` AND `/healthz` is `degraded` at the same moment, and neither at N s. Optionally cover the no-success-since-boot case.
**ITERATION_HINT:** likely-fixable
