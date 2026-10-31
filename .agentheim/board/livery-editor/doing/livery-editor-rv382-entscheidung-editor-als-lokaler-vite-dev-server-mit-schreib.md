---
id: livery-editor-rv382
title: Entscheidung: Editor als lokaler Vite-Dev-Server mit Schreib-Plugin unter tools/, nie im Client-Bundle oder Docker-Image
status: doing
type: decision
context: livery-editor
created: 2026-10-31
completed:
depends_on: [liveries-w35k0]
blocks: []
tags: [decision, foundation, editor-runtime]
related_adrs: [0031]
related_research: []
prior_art: []
---

## Why
Der Editor läuft auf dem Mac aus dem Repo heraus und schreibt Dateien ins Repo (ADR 0031). Wie er gestartet und bedient wird, wie er auf die Platte schreibt und wie sichergestellt ist, dass nichts davon aufs iPad oder in das Server-Image gelangt, ist zu entscheiden.

## What
ADR schreiben (Vorschlag: 0033, scope livery-editor) nach dem Architekten-Entwurf in den Notes.

## Acceptance criteria
- [ ] ADR committed unter `.agentheim/knowledge/decisions/`, Begründung entspricht dem Architekten-Entwurf in den Notes (oder der vom Betreiber geänderten Fassung); in die INDEX eingetragen.
- [ ] Keine Code-Änderung in diesem Task.
- [ ] Der Betreiber hat den Entwurf gelesen und die offenen Punkte in den Notes beantwortet oder bewusst offen gelassen. [human-eye]

## Notes
**Architekten-Entwurf (2026-10-31):**
- Code unter `tools/livery-editor/`, Start mit `npm run editor`, gebunden an 127.0.0.1:5174. Vite ist über Storybook schon vorhanden.
- Der Editor importiert Format, Renderer und Assets aus `src/client/ui`, keine Kopien.
- Ein Vite-Plugin ist der einzige Schreibweg: validiert mit zod, erlaubt nur Zielverzeichnisse der Allow-List, schützt gegen Path-Traversal, schreibt atomar, stößt danach `build-assets` an.
- Pfadgeometrie (Punkte, Shift-Zwang, Rundung über Mittelpunkt, Treffertest) wird selbst geschrieben; kein paper.js, kein fabric.
- Nichts wird ausgeliefert: Client-Build-Entry bleibt `main.ts`; `tools/` kommt in `.dockerignore`.
- Verworfen: Node-Skript plus esbuild-Watch, Editor innerhalb von Storybook, File System Access API, paper.js.
- Reale config.yaml anpassen: nein. Server-URL per Mac-Umgebungsvariable `PLANESABOVE_HOME_URL` oder git-ignorierte `tools/livery-editor/.env.local`.
