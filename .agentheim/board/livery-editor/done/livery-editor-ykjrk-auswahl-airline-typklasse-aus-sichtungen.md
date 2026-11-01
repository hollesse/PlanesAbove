---
id: livery-editor-ykjrk
title: Auswahl Airline × Typklasse aus den Sichtungen des Heimservers mit Lückenfilter; Fallback Airline-Code-Textfeld und Typklassen-Select
status: done
type: feature
context: livery-editor
created: 2026-11-01
completed:
depends_on: [livery-editor-zc7hk]
blocks: []
tags: [editor-feedback, luecke, sichtungen]
related_adrs: [0033, 0035]
related_research: []
prior_art: [livery-editor-zc7hk]
---

## Why
Papa soll im Editor sehen, welche Airline × Typklasse über dem Haus wirklich fliegt und wo noch eine Lackierung fehlt (README: „Lücke“), statt eine ID per Hand einzutippen.

## What
1. **Proxy:** `tools/livery-editor/vite.config.ts` bekommt `server.proxy` für `/api` auf `PLANESABOVE_HOME_URL` (Umgebungsvariable oder `tools/livery-editor/.env.local`, ADR 0035 Punkt 6). Ohne gesetzte URL kein Proxy.
2. **Liste:** Das Panel bekommt oben einen Abschnitt „Sichtungen“: `GET /api/stats/sightings-by-class?days=<Schwelle>` (Contract aus ADR 0033 / Task sighting-log-js2t1: `rows[{prefix, airline, typklasse, count, lastSeenMs, samples}]`). Je Zeile: Airline-Name (oder „Airline fehlt im Katalog“ bei `airline: null`), Typklasse, Anzahl, Markierung „Lücke“, wenn keine Datei `liveries/<prefix in Kleinbuchstaben>/<typklasse>.json` existiert (Abgleich gegen `LIVERY_FILES` aus `generated/liveries.ts`). Steuerung: Schalter „nur Lücken“ (Default an), Zahlenfeld „Tage“ (Default 90). Sortierung nach Anzahl.
3. **Auswahl:** Klick auf eine Zeile setzt Lackierungs-ID = Präfix in Kleinbuchstaben und die Typklasse des Zeichenbretts; existiert die Datei bereits, wird sie geladen (Ebenen ins Brett) — sonst leeres Brett.
4. **Fallback:** Ist der Server nicht erreichbar (Fetch-Fehler, kein Proxy, Nicht-2xx) zeigt der Abschnitt eine Zeile „Heimserver nicht erreichbar“ und der Editor funktioniert wie heute: Textfeld für den Airline-Code (= Lackierungs-ID, validiert gegen `LIVERY_ID`) und das Typklassen-Select bleiben immer sichtbar und bedienbar; die Liste ist nur eine Abkürzung, die beide Felder setzt.
5. Reine Logik in `tools/livery-editor/gaps.ts`: `computeGaps(rows, liveryFiles, { onlyGaps })` liefert die Anzeigeliste. Netz-Zugriff in `src/main.ts` über `fetch('/api/…')`.

## Acceptance criteria
- [ ] `computeGaps` markiert genau die Kombinationen ohne vorhandene Datei als Lücke, filtert bei `onlyGaps`, sortiert nach Anzahl und bildet `airline: null` auf „Airline fehlt im Katalog“ ab (Unit-Tests).
- [ ] Editor-E2E mit gemocktem Heimserver (Playwright `page.route('**/api/stats/sightings-by-class*', …)`): Liste zeigt die Zeilen, „nur Lücken“ blendet Kombinationen mit vorhandener Datei (z. B. `spike/narrowbody`) aus, Klick auf eine Zeile setzt `livery-id` und die Typklasse; Tage-Feld ändert den Query-Parameter.
- [ ] Editor-E2E ohne Mock (Fetch schlägt fehl): Hinweis „Heimserver nicht erreichbar“, Textfeld und Select funktionieren, Zeichnen und Speichern wie bisher.
- [ ] Klick auf eine Kombination mit vorhandener Datei lädt deren Ebenen ins Brett (E2E mit Fixture `spike`).
- [ ] `vite.config.ts` setzt den Proxy nur bei gesetzter `PLANESABOVE_HOME_URL` (Unit-Test über eine exportierte `proxyFor(env)`-Funktion).
- [ ] Bestehende Editor-E2E grün; `npm test`, `npm run typecheck`, `editor-chromium` grün.
- [ ] Die Liste liest sich wie eine Lückenliste: was oft fliegt und fehlt, steht oben. [human-eye]

## Notes
Betreiber-Entscheidung 2026-11-01: Fallback = Airline-Code-Textfeld + Typklassen-Select. Der Server-Endpunkt entsteht parallel in sighting-log-js2t1; der Editor testet gegen den Contract aus ADR 0033, nicht gegen den laufenden Server. Reale config.yaml anpassen: nein (die Heimserver-URL lebt in `.env.local`, git-ignoriert).

## Outcome
Sichtungen section at the top of the editor panel: fetches GET /api/stats/sightings-by-class?days=N (default 90), rows via pure computeGaps (tools/livery-editor/gaps.ts: Lücke = no LIVERY_FILES entry for lower-cased prefix/typklasse, onlyGaps filter, sort by count, airline null -> "Airline fehlt im Katalog"). Controls: Tage number field (refetches), "nur Lücken" checkbox (default on). Click on a row sets livery-id and Typklasse; an existing file is loaded into the board (selected/hidden reset), else an empty board. Fetch error, non-2xx or no proxy shows "Heimserver nicht erreichbar"; the livery-id text field (aria-invalid vs LIVERY_ID) and the Typklasse select always work. vite.config.ts exports proxyFor(env) (/api -> PLANESABOVE_HOME_URL, none when unset), reading process.env or git-ignored .env.local via loadEnv. Tests: gaps.test.ts, vite.config.test.ts, tests/e2e-editor/sightings.spec.ts (4 mocked/unmocked E2E); npm test, typecheck and editor-chromium (14) green. Note: the "list reads like a gap list" criterion is left to the operator [human-eye].
