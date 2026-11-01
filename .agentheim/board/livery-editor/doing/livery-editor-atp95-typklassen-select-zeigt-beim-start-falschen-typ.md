---
id: livery-editor-atp95
title: Typklassen-Select zeigt beim Start „double-decker“, obwohl narrowbody geladen ist
status: doing
type: bug
context: livery-editor
created: 2026-11-01
completed:
depends_on: [liveries-ecn02]
blocks: []
tags: [editor-feedback, bug]
related_adrs: [0037]
related_research: []
prior_art: [liveries-ecn02]
---

## Why
Nach liveries-ecn02 startet der Editor mit narrowbody (Brett zeigt narrowbody), das Select steht aber auf der ersten Option „double-decker“. Select und Zustand laufen auseinander.

## What
Das Select wird in `tools/livery-editor/src/main.ts` aus `typklassen` gebaut, ohne `select.value` auf `state.file.typklasse` zu setzen; der Browser zeigt die erste Option. Fix: direkt nach dem Bau des Selects `select.value = state.file.typklasse` setzen (und überall, wo `state.file` ersetzt wird, bleibt das bestehende Verhalten). Dazu ein Editor-E2E, der direkt nach dem Laden prüft, dass `typklasse` den Wert `narrowbody` hat und das Brett `data-typklasse="narrowbody"` rendert.

## Acceptance criteria
- [ ] Direkt nach dem Laden hat das Select `typklasse` den Wert `narrowbody` und das gerenderte `svg[data-livery-render]` trägt `data-typklasse="narrowbody"` (Editor-E2E).
- [ ] Typwechsel im Select funktioniert weiterhin; bestehende Editor-E2E grün; `npm test`, `npm run typecheck`, `editor-chromium` grün.

## Notes
Betreiber-Bug 2026-11-01. Direkt nach todo.
