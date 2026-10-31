---
id: infrastructure-m6nj3
title: Entscheidung: Teststrategie und Auslieferungsgrenze des Lackierungs-Editors
status: doing
type: decision
context: infrastructure
created: 2026-10-31
completed:
depends_on: [livery-editor-rv382]
blocks: []
tags: [decision, foundation, tests]
related_adrs: [0031]
related_research: []
prior_art: []
---

## Why
ADR 0003 legt TDD mit Unit-Tests und Playwright-WebKit-E2E fest. Der Editor ist Desktop-Chromium, nicht iPad-Safari, und darf nie ins Client-Bundle oder Docker-Image gelangen. Wie er getestet wird und wie die Grenze abgesichert ist, ist zu entscheiden.

## What
ADR schreiben (Vorschlag: 0037, scope global) nach dem Architekten-Entwurf in den Notes.

## Acceptance criteria
- [ ] ADR committed unter `.agentheim/knowledge/decisions/`, Begründung entspricht dem Architekten-Entwurf in den Notes (oder der vom Betreiber geänderten Fassung); in die INDEX eingetragen.
- [ ] Keine Code-Änderung in diesem Task.
- [ ] Der Betreiber hat den Entwurf gelesen und die offenen Punkte in den Notes beantwortet oder bewusst offen gelassen. [human-eye]

## Notes
**Architekten-Entwurf (2026-10-31):**
- Vitest-Unit-Tests zuerst: via/Kontrollpunkt-Geometrie, Shift-Zwang, zod-Roundtrip, Renderer (Schichtfolge, eindeutige clipPath-IDs), Import-Konverter, Schreibschutz, Lückenberechnung, Klassen-Statistik gegen ein SQLite-Fixture.
- Editor-E2E als eigenes Playwright-Projekt `editor-chromium` (kein WebKit) gegen `npm run editor` mit `LIVERY_EDITOR_OUT=<tmp>` und Server im Mock-Modus; läuft im CI-Job `e2e`. Der bestehende WebKit-Lauf über alle Stories deckt die neuen Lackierungs-Stories ab.
- `tools/` in `.dockerignore`; ein Guard-Test prüft, dass das Client-Bundle keinen Editor-Code enthält.
- Verworfen: nur lokale Editor-Tests, WebKit für den Editor.
