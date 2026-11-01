---
id: livery-editor-q9nbe
title: Sichtungen zweistufig: erst Airline (über alle Typen), dann Typklassen-Select mit Sichtungszahl und Lückenstatus je Typ
status: todo
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
- [ ] Editor-E2E (gemockter Server mit einer Airline auf zwei Typen, eine davon mit Datei `spike/narrowbody`): Airline-Zeile zeigt Gesamtzahl und „1 von 2 Typen fehlen“; Klick setzt `livery-id`; das Select zeigt die Optionstexte mit Zahl und Status, der fehlende Typ ist vorausgewählt; Typwechsel auf den vorhandenen lädt dessen Ebenen.
- [ ] „nur Lücken“ blendet eine Airline aus, deren gesichtete Typen alle eine Datei haben (E2E).
- [ ] Ohne Server: Select ohne Zusätze, Textfeld und Select funktionieren (bestehender E2E bleibt grün, angepasst).
- [ ] `npm test`, `npm run typecheck`, `editor-chromium` grün.
- [ ] Der Ablauf passt zum Zeichnen „eine Airline, alle ihre Typen“: Airline wählen, Typ nach Typ durchgehen. [human-eye]

## Notes
Betreiber-Feedback vom 2026-11-01 nach dem ersten Blick auf die Lückenliste. Direkt nach todo. Reale config.yaml anpassen: nein.
