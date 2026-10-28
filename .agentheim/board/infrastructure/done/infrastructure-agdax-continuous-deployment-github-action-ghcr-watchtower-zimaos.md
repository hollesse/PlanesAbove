---
id: infrastructure-agdax
title: Continuous Deployment: GitHub Action testet und baut Images nach GHCR bei jedem Push auf main; Watchtower auf ZimaOS zieht sie, das iPad lädt sich über die buildId selbst neu
status: done
type: feature
context: infrastructure
created: 2026-10-28
completed:
depends_on: []
blocks: [infrastructure-d3v7k]
tags: [deployment, ci, ghcr, watchtower, compose, zimaos]
related_adrs: [0008, 0011, 0022]
related_research: []
prior_art: [infrastructure-001-walking-skeleton]
---

## Why
Der Update-Pfad aus ADR 0008 ist manuell: auf dem Heimserver `git pull && docker compose up -d --build`. Der Betreiber will, dass jeder Commit auf `main` von selbst auf dem Display landet, ohne den Server anzufassen. Das Repo ist öffentlich auf GitHub, der ZimaOS-Heimserver ist von außen nicht erreichbar und darf es bleiben. Deshalb baut GitHub die Images und der Server zieht sie nur (Betreiber-Entscheidung 2026-10-28, Alternative „Server pollt und baut selbst" verworfen, weil dann ungetestete Commits deployt würden und der ThinkCentre jedes Image selbst bauen müsste).

## What
**GitHub Action** (`.github/workflows/deploy.yml`), ausgelöst bei Push auf `main`:
1. `npm ci`, `npm run typecheck`, `npm test`, `npm run build`. Schlägt einer fehl, wird nichts veröffentlicht.
2. Dienst-Image aus dem Root-Dockerfile und Piper-Image aus `docker/piper` bauen und nach GHCR pushen: `ghcr.io/hollesse/planesabove:main` und `ghcr.io/hollesse/planesabove-tts:main`, zusätzlich je ein Tag mit dem Commit-SHA. Piper nur bauen, wenn sich `docker/piper/**` geändert hat (Pfadfilter oder Cache), damit der Voice-Download nicht jeden Lauf kostet. `GITHUB_TOKEN` mit `packages: write` reicht, kein eigenes Secret.
3. Playwright-E2E bleibt außerhalb des Deploy-Pfads (eigener Job oder lokal), damit ein WebKit-Problem in CI das Deployment nicht blockiert; Unit/Contract-Tests und Build sind das Gate.

**Compose-Datei** (`docker-compose.yml`): `planesabove` und `tts` verweisen auf die GHCR-Images (`image: ghcr.io/…:main`), `build:` bleibt als lokale Alternative erhalten (Compose nutzt `image` beim `pull`, `build` bei `--build`). Neuer Dienst `watchtower` (`containrrr/watchtower`), Docker-Socket gemountet, Intervall ca. 5 min, nur Container mit Label `com.centurylinklabs.watchtower.enable=true` (planesabove, tts), `--cleanup` für alte Images. Watchtower ersetzt den Container mit derselben Compose-Konfiguration (Volumes, Env, Ports bleiben).

**Client:** Der neue Container hat eine neue `buildId`, das iPad lädt sich beim nächsten Poll selbst neu (ADR 0008, bereits gebaut). Keine Änderung nötig, aber im Kriterium geprüft.

**Doku:** Root-README-Betriebsabschnitt: Erststart mit `docker compose --profile tts pull && up -d` statt `--build`; „Update" wird zu „passiert von selbst, Stand sichtbar unter `/healthz` → `buildId`"; lokaler Build auf dem Entwicklungsrechner weiter per Podman. ADR-0008-Amendment (Abschnitt Update-Pfad) oder kleiner neuer ADR: CI-gebaute Images + Watchtower-Pull statt Build auf dem Server; Begründung wie oben.

Nicht Teil des Tasks: Benachrichtigung bei fehlgeschlagenem Deployment (gehört zum Heartbeat, infrastructure-b4k8n); Staging; Rollback-Automatik (Rollback = altes SHA-Tag in Compose eintragen, im README als Handgriff beschrieben).

## Acceptance criteria
- [ ] Workflow-Datei `.github/workflows/deploy.yml` existiert; ein Push auf `main` erzeugt in GHCR die Tags `main` und `sha-<commit>` für `planesabove` (und bei Änderung unter `docker/piper/` für `planesabove-tts`); Workflow-Lauf sichtbar grün im Repo.
- [ ] Ein Workflow-Lauf mit absichtlich fehlschlagendem Test (lokal per `act` oder als Branch-Lauf nachgewiesen) veröffentlicht kein Image.
- [ ] `docker compose config` ist fehlerfrei; `planesabove` und `tts` tragen `image: ghcr.io/hollesse/…:main` und das Watchtower-Label; ein Dienst `watchtower` mit Socket-Mount und Label-Filter ist enthalten.
- [ ] Die Images in GHCR sind ohne Anmeldung ziehbar (Paket-Sichtbarkeit public), geprüft per `podman pull ghcr.io/hollesse/planesabove:main` auf dem Entwicklungsrechner.
- [ ] Root-README beschreibt Erststart per `pull`, automatisches Update, Rollback per SHA-Tag und den lokalen Podman-Build; ADR-0008-Amendment oder neuer ADR liegt in `.agentheim/knowledge/decisions/`.
- [ ] Auf dem ZimaOS-Heimserver: nach einem Push auf `main` zeigt `/healthz` innerhalb von 10 Minuten die neue `buildId`, und das iPad hat sich ohne Zutun neu geladen. [human-eye]

## Notes
- Betreiber-Entscheidung 2026-10-28: kein manueller Erstlauf. Dieser Task kommt VOR der Geräteabnahme infrastructure-d3v7k und ist deren Deploy-Pfad: Der Heimserver wird einmal mit der Compose-Datei (GHCR-Images + Watchtower) eingerichtet, danach kommt jeder Stand automatisch. d3v7k nimmt dann über genau diesen Weg ab. Die Piper-Anfrageform klärt d3v7k's Worker-Hälfte lokal mit Podman; wenn sich daraus eine Dockerfile-Änderung ergibt, baut CI das Piper-Image einfach neu.
- GHCR für ein öffentliches Repo: Pakete sind nach dem ersten Push standardmäßig privat und müssen einmalig auf „public" gestellt werden (GitHub-Paketeinstellungen), sonst braucht ZimaOS ein Login. Im README festhalten.
- Watchtower hat Zugriff auf den Docker-Socket des Heimservers; das ist im LAN-only-Setup akzeptiert, aber im ADR als Trade-off nennen. Alternative ohne Socket: ein Cron auf ZimaOS mit `docker compose pull && up -d`; Watchtower ist gewählt, weil ZimaOS Container bequemer verwaltet als Cron-Jobs.
- Multi-Arch ist nicht nötig: ThinkCentre ist amd64. Falls der Entwicklungsrechner (Apple Silicon) die GHCR-Images laufen lassen soll, `platforms: linux/amd64,linux/arm64` per buildx ergänzen; das kostet CI-Zeit und ist optional.
- Piper-Image-Build dauert wegen Voice-Download lange; Docker-Layer-Cache in der Action (`cache-from: type=gha`) nutzen.

## Verifier note (iteration 1)
**REASONS:**
- Criterion 1 ("bei Änderung unter `docker/piper/`"): the Piper rebuild decision in `.github/workflows/deploy.yml` runs `git diff --quiet HEAD^ HEAD -- docker/piper` after a checkout with `fetch-depth: 2`. That only looks at the last commit of the push. A push carrying several commits where only an earlier one touches `docker/piper/**` skips the TTS build and deploys a stale `planesabove-tts:main`.
- No test covers the Piper conditional in `tests/unit/deploy-workflow.test.ts`.
- Everything else passed (npm test 480 passed, typecheck, compose config, needs: test, packages: write, tags, e2e isolated, Watchtower wiring, README, ADR 0022 block, scope clean).
- Noted, not a FAIL reason: `buildId` hashes only `app.js`/`app.css`; a server-only commit does not change it, so README step 9 and the human-eye criterion only hold for client-changing pushes. Consider a backlog item: derive `buildId` from the commit SHA (build arg in CI).

**SUGGESTED_FIX:** Base the Piper-change check on the whole push: diff `${{ github.event.before }}..${{ github.sha }}` with `fetch-depth: 0`, falling back to building when `before` is all zeros or missing (or use a paths-filter action). Add a unit test pinning the TTS build as conditional on that push-range check plus the `force_tts` dispatch input.

**ITERATION_HINT:** likely-fixable


## Outcome

CD path built. `.github/workflows/deploy.yml` triggers on push to `main` (plus manual dispatch with `force_tts`). Job `test` runs npm ci, typecheck, npm test, build; job `publish` has `needs: test`, so a failing test publishes no image. It pushes `ghcr.io/hollesse/planesabove:{main,sha-<commit>}` and `planesabove-tts` with the same tags; layer cache via `type=gha`. The Piper build runs only when `docker/piper/**` changed anywhere in the pushed range (`github.event.before..github.sha`, `fetch-depth: 0`; missing or all-zero `before` forces a build), when the image is missing in GHCR, or on manual dispatch. E2E is a separate `continue-on-error` job outside the publish path.

`docker-compose.yml`: `planesabove` and `tts` use the GHCR images with the Watchtower label and keep `build:`; new `watchtower` service (socket mount, `--label-enable --cleanup --interval 300`). `docker compose --profile tts config` is clean. README operations section updated. ADR 0022 (reported) amends the ADR 0008 update path and names the Docker-socket trade-off.

Iteration 2 fixed the verifier finding: the Piper decision no longer diffs only `HEAD^..HEAD`, so a multi-commit push that touched `docker/piper/**` in an earlier commit still builds the TTS image.

Proof: `tests/unit/deploy-workflow.test.ts` parses the workflow and compose YAML and asserts the trigger, the `publish needs test` edge, the gate steps, e2e isolation, the Piper build being conditional on the push-range check (`fetch-depth: 0`, `github.event.before`..`github.sha`, no `HEAD^`, `force_tts`, manifest inspect), GHCR images, labels and the Watchtower service. Tests (481 passed) and typecheck pass. Not provable here: a real Actions run, a GHCR pull.

Operator must do once: (1) after the first workflow run, set both GHCR packages to public, then verify with `podman pull ghcr.io/hollesse/planesabove:main`; (2) on ZimaOS place `docker-compose.yml`, run `docker compose --profile tts pull && docker compose --profile tts up -d`; (3) push to `main` and check that `/healthz` shows a new `buildId` within 10 minutes and the iPad reloads. Note: `buildId` changes only when client assets change (see backlog item).
