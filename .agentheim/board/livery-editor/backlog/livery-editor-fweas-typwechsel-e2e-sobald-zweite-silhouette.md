---
id: livery-editor-fweas
title: Typwechsel-E2E für die Sichtungsauswahl, sobald eine zweite Silhouette (z. B. widebody) existiert
status: backlog
type: chore
context: livery-editor
created: 2026-11-01
completed:
depends_on: [livery-editor-q9nbe]
blocks: []
tags: [editor, tests, silhouette]
related_adrs: [0032, 0037]
related_research: []
prior_art: [livery-editor-q9nbe]
---

## Why
Das Kriterium „Typwechsel im Select lädt die vorhandene Datei bzw. leert das Brett“ ließ sich am 2026-11-01 nicht per E2E prüfen, weil nur die Narrowbody-Silhouette existiert und ein zweiter gesichteter Typ damit nie zeichenbar ist. Die Logik ist per Unit-Test belegt; der E2E fehlt.

## What
Sobald `src/client/ui/assets/planes/<zweite-typklasse>/silhouette.svg` + `details.svg` existieren (eigener liveries-Task), in `tests/e2e-editor/sightings.spec.ts` einen Test ergänzen: Mock mit einer Airline auf narrowbody (mit Datei) und der zweiten Typklasse (ohne Datei); nach Airline-Klick ist der zweite Typ vorausgewählt (Lücke, zeichenbar), Brett leer; Wechsel auf narrowbody lädt die Ebenen von `spike/narrowbody`; Wechsel zurück leert das Brett wieder.

## Acceptance criteria
- [ ] To be defined during refinement (hängt am liveries-Task für die zweite Silhouette).

## Notes
Verschoben am 2026-11-01 (Betreiber-Entscheidung) aus livery-editor-q9nbe. Vorher braucht es einen liveries-Task „Silhouette und Detailschicht für widebody“ — bei Bedarf per modeling anlegen.
