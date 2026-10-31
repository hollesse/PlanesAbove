---
id: liveries-ptm0c
title: Entscheidung: Einmaliger Import der CSS-Lackierungen, Pixelvergleich als Gate, Umstellung in einem Commit
status: done
type: decision
context: liveries
created: 2026-10-31
completed:
depends_on: [liveries-w35k0]
blocks: []
tags: [decision, foundation, import]
related_adrs: [0031, 0036]
related_research: []
prior_art: []
---

## Why
ADR 0031 sieht vor, dass die 42 CSS-Lackierungen einmalig in das neue Format übersetzt werden und die Himmelsszene danach wechselt. Wie der Import arbeitet, wie beide Formate bis dahin nebeneinander leben und wie der Schalter umgelegt wird, ist zu entscheiden.

## What
ADR schreiben (Vorschlag: 0035, scope liveries) nach dem Architekten-Entwurf in den Notes.

## Acceptance criteria
- [ ] ADR committed unter `.agentheim/knowledge/decisions/`, Begründung entspricht dem Architekten-Entwurf in den Notes (oder der vom Betreiber geänderten Fassung); in die INDEX eingetragen.
- [ ] Keine Code-Änderung in diesem Task.
- [ ] Der Betreiber hat den Entwurf gelesen und die offenen Punkte in den Notes beantwortet oder bewusst offen gelassen. [human-eye]

## Notes
**Architekten-Entwurf (2026-10-31):**
- `scripts/import-css-liveries.mjs` macht aus jedem `paint-*`-Pfad eine Ebene: M/L werden Punkte, Q wird ein `via` bei t=0,5, Bögen und kubische Kurven werden abgeflacht (verlustbehaftet). Logo-Ankerpunkte werden zu LogoLayer-Transformationen.
- Deterministisch; überschreibt handgezeichnete Dateien nicht ohne `--force`. `--import-only-seen` begrenzt auf gesehene Kombinationen.
- Bis zur Umstellung zeigen die neuen Dateien sich nur in Storybook; sky-scene rendert weiter CSS.
- Gate: Playwright-Pixelvergleich alt gegen neu (Toleranz etwa 1 %). Abweichungen kommen auf eine Liste für den Betreiber und blockieren die Umstellung nicht.
- Umstellung in einem Commit: sky-scene wechselt auf `renderLiverySvg`; CSS-Format, `--skin-*`, zugehöriger Test und Importskript werden entfernt; ADR 0009 wird für Lackierungen als superseded markiert. Rückweg: git revert plus Watchtower. Kein Laufzeit-Flag.
- Verworfen: Laufzeit-Flag, Mischbetrieb je Lackierung, kein Import.

**Offener Punkt:** Import für alle acht Typklassen je Airline oder nur die gesehenen (`--import-only-seen`)?

## Outcome

ADR 0036 (provisorisch) formuliert: einmaliger, deterministischer Import der 42 CSS-Lackierungen per `scripts/import-css-liveries.mjs`, Pixelvergleich als nicht blockierendes Gate, Umstellung in einem Commit ohne Laufzeit-Flag, Rückweg per git revert. Offener Punkt für den Betreiber: Import für alle Typklassen oder nur die gesehenen. Kein Code geändert.
