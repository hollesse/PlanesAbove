---
id: livery-editor-q9nbe
title: Sichtungen zweistufig: erst Airline (über alle Typen), dann Typklassen-Select mit Sichtungszahl und Lückenstatus je Typ
status: doing
type: feature
context: livery-editor
created: 2026-11-01
completed:
depends_on: [livery-editor-ykjrk]
blocks: []
tags: [editor-feedback, luecke, sichtungen]
related_adrs: [0033]
related_research: []
prior_art: [livery-editor-ykjrk]
---

## Why
Papa zeichnet eine Lackierung für alle gesichteten Typen einer Airline hintereinander, nicht Kombination für Kombination quer über Airlines. Die flache Liste Airline × Typklasse passt nicht zu diesem Arbeitsfluss.

## What
Der Abschnitt „Sichtungen“ wird zweistufig:
1. **Airline-Liste:** je Airline eine Zeile (aggregiert über alle Typklassen): Name (oder „Airline fehlt im Katalog“), Präfix, Gesamtzahl Sichtungen, Lückenstatus als „n von m Typen fehlen“. Sortiert nach Gesamtzahl. Schalter „nur Lücken“ zeigt nur Airlines, bei denen mindestens ein gesichteter Typ ohne Datei ist. Tage-Schwelle bleibt. Klick wählt die Airline: setzt den Airline-Code (Lackierungs-ID) und hebt die Zeile hervor.
2. **Typklassen-Select:** Ist eine Airline gewählt, zeigt das bestehende Typklassen-Select je Option die Sichtungszahl und den Status, z. B. „narrowbody · 12 Sichtungen · fehlt“ / „widebody · 3 Sichtungen · vorhanden“; nicht gesichtete Typen stehen darunter ohne Zahl. Gesichtete Typen zuerst, nach Zahl sortiert; vorausgewählt wird der häufigste gesichtete Typ ohne Datei (sonst der häufigste). Wechsel des Typs lädt eine vorhandene Datei der Airline in das Brett oder leert es, wie heute beim Zeilenklick.
3. Ohne gewählte Airline (oder ohne Server) zeigt das Select die Typklassen wie bisher ohne Zusätze; Textfeld und Select bleiben der Fallback.
4. Logik rein in `tools/livery-editor/gaps.ts`: `groupByAirline(rows, liveryFiles)` → `[{prefix, liveryId, airline, total, types: [{typklasse, count, gap}], gaps, seenTypes}]`, sortiert nach `total`; `typeOptions(group, allTypes)` für die Select-Beschriftung und Vorauswahl. `computeGaps` darf entfallen, wenn nichts mehr daran hängt.

## Acceptance criteria
- [ ] `groupByAirline` aggregiert je Präfix über Typen (total, types nach count sortiert, gap je Typ gegen die Datei `<liveryId>/<typklasse>`), sortiert nach total, bildet `airline: null` auf „Airline fehlt im Katalog“ ab; `typeOptions` liefert gesichtete Typen zuerst mit Zahl und Status, übrige danach, und den vorausgewählten Typ (Unit-Tests).
- [ ] Editor-E2E (gemockter Server mit einer Airline auf zwei Typen, narrowbody mit Datei `spike/narrowbody`, der zweite Typ ohne Silhouette): Airline-Zeile zeigt Gesamtzahl und „1 von 2 Typen fehlen“; Klick setzt `livery-id`; das Select zeigt die Optionstexte mit Zahl und Status; der gesichtete Typ ohne Silhouette steht deaktiviert mit „· keine Silhouette“ und ist nicht vorausgewählt; vorausgewählt ist der häufigste zeichenbare Typ, dessen vorhandene Datei beim Airline-Klick geladen wird. Die Regel „Vorauswahl = häufigster zeichenbarer Typ ohne Datei“ ist per Unit-Test belegt. (Umformuliert 2026-11-01 nach Verifier-Iteration 2: mit nur einer Silhouette ist ein echter Typwechsel-E2E nicht möglich; siehe Backlog-Task für die zweite Silhouette.)
- [ ] „nur Lücken“ blendet eine Airline aus, deren gesichtete Typen alle eine Datei haben (E2E).
- [ ] Ohne Server: Select ohne Zusätze, Textfeld und Select funktionieren (bestehender E2E bleibt grün, angepasst).
- [ ] `npm test`, `npm run typecheck`, `editor-chromium` grün.
- [ ] Der Ablauf passt zum Zeichnen „eine Airline, alle ihre Typen“: Airline wählen, Typ nach Typ durchgehen. [human-eye]

## Notes
Betreiber-Feedback vom 2026-11-01 nach dem ersten Blick auf die Lückenliste. Direkt nach todo. Reale config.yaml anpassen: nein.

## Verifier note (iteration 1)

REASONS:
- Criterion 2 ("der fehlende Typ ist vorausgewählt") is covered by an E2E that passes while the action crashes: clicking the Spike Air row logs `[Unhandled error] TypeError: Cannot read properties of undefined (reading 'viewBox')` at drawBoard (main.ts:34) via pick → selectAirline → click handler. Cause: `typeOptions` lists and preselects seen types without a silhouette (here 'regional'); `typklassen = Object.keys(PLANE_PARTS)` holds only narrowbody. `pick()` sets `state.file.typklasse='regional'` and drawBoard throws on `PLANE_PARTS['regional']`; board not redrawn, state and board diverge, a save would write `spike/regional`. The test passes because it only checks `.layer-row` count 0 before switching to narrowbody. The real home server reports widebody/regional, so the automatic preselection will hit this often.
- Same root cause in the select: seen types without silhouette appear as normal options; choosing one manually crashes drawBoard too.
- Weak assertion in sightings.spec.ts "only gaps hides an airline whose seen types all have a file": `toHaveCount(0)` already passes during the loading state; it never shows that "nur Lücken" hides the airline (criterion 3). Wait for the loaded empty-state text ("Keine Lücken in den Sichtungen.") first.
- Passed: npm test (767), typecheck, builds, editor-chromium 14; scope clean; README anchor exists; option values are plain type ids.

SUGGESTED_FIX: Seen types without a PLANE_PARTS silhouette must not crash the editor: exclude them from preselection in `typeOptions` and show them disabled or marked (e.g. "· keine Silhouette"), or have `pick` refuse them with a status message instead of calling drawBoard. Add a unit test; make the E2E fail on unhandled page errors (collect `page.on('pageerror')`, assert none); make the "nur Lücken" E2E wait for the loaded empty-state text before asserting zero rows.

ITERATION_HINT: likely-fixable

## Verifier note (iteration 2)

REASONS:
- Check 1b, metric drift on criterion 2: iteration 1 asserted the missing type ('regional') is preselected and switched to narrowbody to load layers; iteration 2 asserts 'narrowbody' (the type WITH a file) is preselected and has no type switch, while the test title still says "type switch loads existing file".
- Cause is the task, not the worker: PLANE_PARTS has only narrowbody. The mock criterion 2 requires (one airline on two types, one with file spike/narrowbody) makes the missing type non-drawable; with the iteration-1 crash fix, it can never be preselected or switched to. Criterion 2 cannot be satisfied in E2E today.
- Everything else sound: npm test 769, typecheck, builds, editor-chromium 14/14 with no page errors; pageerror collector asserts [] per test; "nur Lücken" waits for the empty state; unit tests cover non-drawable exclusion and missing-type preselection; option values plain; pick() refuses non-drawable; criteria 1, 3, 4, 5 hold; scope clean.

SUGGESTED_FIX: Re-word criterion 2 for the single-silhouette reality (missing type preselected only when drawable — unit test; non-drawable seen types listed disabled with "· keine Silhouette" and never preselected — E2E; existing file loads when its type is selected or preselected), or defer the "Typwechsel" E2E until a second silhouette exists. Rename the E2E title. Implementation can stay.

ITERATION_HINT: task-under-specified

## Salvage note

Salvaged diff: `/Users/joshuatopfer/Documents/Projekte/Privat/PlanesAbove/.agentheim/salvage/livery-editor-q9nbe-escalated-iter2.patch` (git apply against a scratch checkout). Worktree kept: `/Users/joshuatopfer/Documents/Projekte/Privat/PlanesAbove/.worktrees/livery-editor-q9nbe` (branch `aw/livery-editor-q9nbe`, two wip commits). Escalated at iteration 2 (task-under-specified) — criterion 2 needs re-wording by the operator.
