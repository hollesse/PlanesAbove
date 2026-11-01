---
id: 0037
title: Teststrategie und Auslieferungsgrenze des Lackierungs-Editors (Vitest zuerst, eigenes Chromium-E2E-Projekt, Guard gegen Bundle und Image)
scope: global
status: accepted
date: 2026-10-31
supersedes: []
superseded_by: []
related_adrs: [0002, 0003, 0029, 0030, 0031, 0032, 0034, 0035, 0036]
related_tasks: [infrastructure-m6nj3]
related_research: []
---

# ADR 0037: Teststrategie und Auslieferungsgrenze des Lackierungs-Editors

Baut auf ADR 0003 (TDD, Vitest-Unit-Tests, Playwright-WebKit-E2E), ADR 0031 (Editor läuft auf dem Mac, Weg aufs iPad ist Commit, Image, Watchtower), ADR 0032 (Dateiformat und gemeinsame Render-Funktion), ADR 0034 (Betreiber-Werkzeug ist vom Storybook-Gate ausgenommen) und ADR 0035 (Editor als lokaler Vite-Dev-Server unter `tools/livery-editor/`, Port 5174, Schreib-Plugin).

## Context
ADR 0003 verlangt TDD und als E2E-Engine WebKit, weil das iPad-Safari am nächsten liegt. Der Editor ist aber ein Desktop-Werkzeug für Chromium auf dem Mac, kein iPad-Anzeigepfad. Gleichzeitig hat er einen Schreibweg (ADR 0035) und darf deshalb nie ins Client-Bundle oder ins Docker-Image gelangen: ein Editor auf dem wartungsfreien Heimserver wäre die erste schreibende Oberfläche dort (ADR 0031).

Offen war, wie der Editor getestet wird, ohne die WebKit-Vorgabe für den Anzeigepfad aufzuweichen, und wie die Auslieferungsgrenze nicht nur behauptet, sondern abgesichert ist. Der CI-Job `test` fährt `typecheck`, `npm test` und `npm run build`; der Job `e2e` fährt `npm run e2e` (Playwright) gegen das statische Storybook auf Port 6007.

## Decision
1. **Vitest-Unit-Tests zuerst (TDD nach ADR 0003).** Die Logik des Editors entsteht test-first, bevor die Oberfläche steht: via- und Kontrollpunkt-Geometrie samt Treffertest, Shift-Zwang, zod-Roundtrip der Lackierungsdatei (ADR 0032), Renderer (Schichtfolge, eindeutige `clipPath`-IDs), Import-Konverter für die bestehenden CSS-Lackierungen (ADR 0036), Schreibschutz des Schreib-Plugins (Allow-List, Path-Traversal, atomares Schreiben), Lückenberechnung und Klassen-Statistik gegen ein SQLite-Fixture. Die Tests liegen neben dem Code unter `tools/livery-editor/`, Renderer-Tests bei `src/client/ui`.
2. **`tools/` ist in Typprüfung und Vitest-Lauf eingeschlossen.** `npm run typecheck` und `npm test` erfassen `tools/`, damit der bestehende CI-Job `test` den Editor-Code mitprüft.
3. **Editor-E2E als eigenes Playwright-Projekt `editor-chromium`.** Nur Chromium (`devices['Desktop Chrome']`), kein WebKit. Es läuft gegen `npm run editor` mit `LIVERY_EDITOR_OUT=<tmp>` (Schreibziel ist ein temporäres Verzeichnis, nie das Repo) und gegen den Server im Mock-Modus statt `PLANESABOVE_HOME_URL`. Eigene Testdateien in einem eigenen Verzeichnis, damit die WebKit-Projekte sie nicht aufgreifen. Der Lauf hängt im bestehenden CI-Job `e2e`.
4. **Der Anzeigepfad bleibt WebKit.** Der bestehende WebKit-Lauf über alle Stories deckt die neuen Lackierungs-Stories ab (ADR 0034: die gezeigte Lackierung behält ihre Story). Für die Editor-Oberfläche gibt es keine WebKit-Pflicht.
5. **Auslieferungsgrenze ist abgesichert, nicht nur behauptet.**
   - `tools/` steht in `.dockerignore` (ADR 0035); ein Test liest `.dockerignore` und schlägt fehl, wenn der Eintrag fehlt.
   - Ein Guard-Test prüft das gebaute Client-Bundle (`dist/`) auf Editor-Code: kein Verweis auf `tools/`, kein Marker-Bezeichner des Editors (z. B. Plugin-Name, Speicher-Endpunkt). Der Guard läuft in CI nach `npm run build`.
   - Der Client-Build-Entry bleibt `main.ts`; der Guard prüft zusätzlich, dass der Importgraph von dort nie nach `tools/` führt.
6. **Kein zusätzlicher Gate-Schritt für den Heimserver.** Das Server-Image enthält den Editor nicht, also gibt es dort nichts zu testen.

## Consequences
### Positive
- Die Geometrie und der Schreibschutz, die fehleranfälligsten und riskantesten Teile, sind schnell und deterministisch testbar, ohne Browser.
- WebKit-Vorgabe für den Anzeigepfad bleibt unberührt; der Editor wird dort getestet, wo er läuft (Desktop-Chromium).
- Ein versehentlicher Import des Editors in `main.ts` oder ein vergessener `.dockerignore`-Eintrag bricht den Build, statt still auszuliefern.
- Keine neue CI-Stufe: die Läufe hängen in `test` und `e2e`.

### Negative
- Das Playwright-Setup bekommt ein zweites Web-Server-Modell (`npm run editor` neben dem statischen Storybook) und einen Mock-Modus des Servers, der gepflegt werden muss.
- Der Guard-Test über das Bundle hängt an einem Build-Schritt und ist damit langsamer als reine Unit-Tests; Marker-Bezeichner müssen bei Umbenennungen nachgezogen werden.
- Editor-E2E läuft nur auf Chromium; Safari-spezifische Fehler im Editor würden nicht auffallen (bewusst hingenommen, Desktop-Werkzeug).

### Neutral
- `playwright.config.ts` hat bereits ein Chromium-Projekt für Umgebungen ohne WebKit; `editor-chromium` ist ein davon getrenntes, fachlich anderes Projekt.
- Der Schreibpfad im E2E ist ein Temp-Verzeichnis; echte Lackierungsdateien im Repo entstehen nur durch den Betreiber von Hand.

## Alternatives considered
- **Nur lokale Editor-Tests, nicht in CI** — verworfen: ohne CI-Lauf verfällt der Schutz vor Regressionen und vor der Auslieferung des Editors, sobald niemand ihn lokal startet.
- **WebKit auch für den Editor** — verworfen: der Editor läuft nie auf dem iPad; WebKit-Tests würden Aufwand und Flakiness ohne Aussagekraft für den Einsatzort erzeugen.
- **Auslieferungsgrenze nur über `.dockerignore`** — verworfen: schützt das Image, aber nicht das Client-Bundle, und kein Test würde ein späteres Entfernen des Eintrags bemerken.
- **Editor-E2E gegen den echten Heimserver** — verworfen: nicht reproduzierbar in CI, abhängig von Netz und realen Daten; der Mock-Modus genügt (ADR 0033 definiert nur lesende Endpunkte).

## Offene Punkte
- Der Betreiber hat den Entwurf noch nicht ausdrücklich bestätigt; das Akzeptanzkriterium „[human-eye]" der Task bleibt bis zu seiner Antwort offen.
- Genaue Form des Server-Mock-Modus (eigener Schalter, Fixture-Daten, wer ihn startet) ist bei der Umsetzung des Editor-E2E zu klären.
- Genaue Marker für den Bundle-Guard (welche Bezeichner den Editor eindeutig kennzeichnen) legt die Umsetzung fest.

## References
- ADR 0002 und 0034 (Storybook-first, Gate-Grenze), ADR 0003 (TDD, WebKit-E2E), ADR 0029 und 0030 (Geräte-/Konfigurationsschichten), ADR 0031 (Editor auf dem Mac), ADR 0032 (Format, Render-Funktion), ADR 0035 (Vite-Dev-Server, `.dockerignore`), ADR 0036 (CSS-Import)
- `playwright.config.ts`, `vitest.config.ts`, `.dockerignore`, `.github/workflows/deploy.yml`