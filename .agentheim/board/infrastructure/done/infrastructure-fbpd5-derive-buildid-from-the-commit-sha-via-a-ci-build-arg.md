---
id: infrastructure-fbpd5
title: Commit-SHA als eigenes Feld `commit` in /healthz und im Startlog, per CI-Build-Arg ins Image; buildId bleibt der Client-Asset-Hash und steuert weiter den iPad-Reload
status: done
type: chore
context: infrastructure
created: 2026-10-28
completed:
depends_on: [infrastructure-agdax]
blocks: []
tags: [deployment, ci, healthz, watchtower, buildid]
related_adrs: [0008, 0011, 0022]
related_research: []
prior_art: [infrastructure-agdax, infrastructure-z7kq4]
---

## Why
Auf dem Heimserver lässt sich bisher nicht sehen, welcher Commit läuft. `buildId` ist der Hash von `app.js`/`app.css` (`scripts/build.mjs`) und ändert sich nur, wenn sich der Client ändert. Am 2026-10-28 war beim Test von Watchtower nicht erkennbar, ob ein Deploy angekommen ist. Außerdem ist das fertige Image bei Commits ohne Änderung am App-Code byte-identisch (nur der Index-Digest mit den Herkunftsangaben ändert sich), sodass Watchtower nichts ersetzt.

## What
Entscheidung im Modeling 2026-10-28: **ein eigenes Feld, `buildId` bleibt unverändert.**
- `.github/workflows/deploy.yml` übergibt dem Dienst-Image `build-args: GIT_SHA=${{ github.sha }}`.
- `Dockerfile`: `ARG GIT_SHA` in der Laufzeit-Stufe, `ENV GIT_SHA=$GIT_SHA` (Default leer). Die SHA steckt damit in jedem Image, und jeder Push erzeugt ein anderes Image, das Watchtower dann auch tatsächlich ersetzt.
- Der Dienst liest `process.env.GIT_SHA`. `GET /healthz` bekommt das Feld `commit` (die volle SHA, oder `"dev"`, wenn sie fehlt oder leer ist), neben dem unveränderten `buildId`. Die Logzeile `service started` bekommt `commit` ebenfalls.
- `buildId` bleibt der Client-Asset-Hash und steuert weiter den Reload des iPads (ADR 0008). Ein Push, der nur den Server oder die Doku ändert, lädt das iPad also nicht neu und sperrt den Ton nicht.
- README Schritt 9: Der Stand ist unter `/healthz` → `commit` sichtbar. Es wird erklärt, dass `buildId` nur bei Client-Änderungen wechselt.

## Acceptance criteria
- [x] `GET /healthz` enthält `commit` = Wert von `GIT_SHA` und `"dev"`, wenn `GIT_SHA` fehlt oder leer ist (Unit-/Integrationstest gegen den HTTP-Server, beide Fälle).
- [x] Die Logzeile `service started` enthält `commit` (Test).
- [x] `buildId` in `/healthz` und `/api/state` bleibt der Client-Asset-Hash, unabhängig von `GIT_SHA` (Test: zwei verschiedene `GIT_SHA`-Werte ergeben dieselbe `buildId`).
- [x] `deploy.yml` übergibt `GIT_SHA=${{ github.sha }}` als Build-Arg an das Dienst-Image (Assertion in `tests/unit/deploy-workflow.test.ts`). Das Piper-Image bleibt ohne dieses Arg.
- [x] `Dockerfile` hat `ARG GIT_SHA` und `ENV GIT_SHA` in der Laufzeit-Stufe (Test liest das Dockerfile). `podman build --build-arg GIT_SHA=abc123 .` und ein `podman run` liefern `"commit":"abc123"` unter `/healthz`. Das prüft der Worker per Hand und hält es im Outcome fest.
- [x] README Schritt 9 nennt `/healthz` → `commit` als Deploy-Nachweis und den Unterschied zu `buildId`.
- [ ] Nach dem Push zeigt `http://zimaos.local:8080/healthz` innerhalb von ~1 Minute nach dem grünen CI-Lauf die neue SHA, und `uptimeSeconds` springt zurück. [human-eye]

## Notes
- Refine 2026-10-28 (Modeling mit dem Betreiber): Statt `buildId` aus der SHA abzuleiten (ursprünglicher Plan), gibt es ein eigenes Feld. Grund: Mit SHA-`buildId` würde jeder Deploy, auch einer nur für Doku, das iPad neu laden, und danach braucht der Ton wieder einen Tipp.
- Die Lösung behebt nebenbei den Befund vom 2026-10-28: Bei Commits ohne App-Code-Änderung war das Image identisch, und Watchtower hat zu Recht nichts ersetzt. Die SHA im Image macht jeden Push zu einem echten Update.
- Bisherige Stellen: `scripts/build.mjs:27` (buildId), `src/server/app.ts:52-53` (Lesen der `build-id.txt`), `:143` (/healthz), `:173` (Startlog).

## Outcome

Added `commit` (from env GIT_SHA read via the existing `o.env ?? process.env` seam; "dev" if missing/empty) to /healthz and the 'service started' log in src/server/app.ts. buildId unchanged. Dockerfile runtime stage has `ARG GIT_SHA=` + `ENV GIT_SHA=$GIT_SHA`; deploy.yml passes `GIT_SHA=${{ github.sha }}` to the service image only (Piper untouched). README step 9 explains `commit` vs `buildId`; infrastructure README gains the term "Commit (commit)". Tests: tests/unit/server/commit-field.test.ts (healthz + log, dev fallback, buildId independent of GIT_SHA) and deploy-workflow.test.ts (build-arg, Dockerfile). npm test 535 passed, typecheck clean.
Manual check: `podman build --build-arg GIT_SHA=abc123` + podman run (mock mode, port 8091) returned "commit":"abc123" in /healthz and in the startup log. The [human-eye] criterion (live deploy on zimaos) remains for the operator.
Verifier note (non-blocking): ARG/ENV GIT_SHA sits before the runtime `npm ci`, so every push re-runs that layer instead of using the gha cache; moving the two lines just before CMD would keep the cache.

