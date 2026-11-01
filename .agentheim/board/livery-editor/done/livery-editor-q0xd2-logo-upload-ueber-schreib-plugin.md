---
id: livery-editor-q0xd2
title: Logo hochladen (SVG/PNG) über das Schreib-Plugin nach svg/logos/, danach sofort in der Logo-Liste und im LOGO-Index
status: done
type: feature
context: livery-editor
created: 2026-11-01
completed:
depends_on: [livery-editor-gn6gp]
blocks: []
tags: [editor-feedback, logo, schreib-plugin]
related_adrs: [0035]
related_research: []
prior_art: [livery-editor-zc7hk]
---

## Why
Neue Airlines brauchen neue Logos; Papa will sie direkt aus dem Editor ins Repo legen statt Dateien von Hand zu kopieren (Betreiber-Entscheidung: gleicher Ordner und gleiche Konvention wie die 29 vorhandenen Logos).

## What
1. **Panel:** Im Abschnitt „Logo“ ein Datei-Button (`accept=".svg,.png"`) und ein Namensfeld (Kleinbuchstaben, `^[a-z0-9][a-z0-9-]{0,31}$`, vorbelegt aus dem Dateinamen). Hochladen sendet `POST /__livery-editor/logo` mit `{name, kind: "svg"|"png", data: base64}`.
2. **Schreib-Plugin (ADR 0035 §3):** zweiter Endpunkt neben `/save`; Allow-List-Verzeichnis `src/client/ui/assets/svg/logos/`; Zielname `<name>.svg` bzw. `<name>.png`; Traversal-Schutz wie bei `saveLivery`; Größenlimit 512 KB; SVG wird mit einem einfachen Sanitizer geprüft (kein `<script>`, keine `on*`-Attribute, keine externen `href`s), PNG per Magic-Bytes. Für ein PNG wird zusätzlich eine Hülle `<name>.svg` mit `<image href="<name>.png">` und der Bildgröße erzeugt, damit die bestehende SVG+PNG-Konvention gilt. Atomar schreiben, danach `build-assets` anstoßen (wie beim Speichern), damit `LOGO_SVG` das neue Logo kennt; Vite-HMR lädt die Liste neu.
3. Nach dem Upload erscheint das Logo in der Liste und wird direkt als Ebene aufs Brett gelegt.

## Acceptance criteria
- [ ] `saveLogo(body, logosDir)` (rein, `tools/livery-editor/logo-save.ts`): akzeptiert gültige SVG/PNG, erzeugt die PNG-Hülle, weist `../`, ungültige Namen, zu große Dateien, SVG mit Script/on*-Attribut/externem href und falsche PNG-Magic-Bytes mit 400 ab (Unit-Tests).
- [ ] Plugin-Test wie `write-plugin.test.ts`: 200 schreibt nach `logos/` und stößt den Rebuild an; 400 schreibt nichts.
- [ ] Editor-E2E: Upload einer kleinen SVG-Datei (mit `LIVERY_EDITOR_OUT`-Umleitung für Logos, z. B. `LIVERY_EDITOR_LOGOS_OUT`) → Datei liegt im Zielordner, Logo erscheint in der Liste und auf dem Brett.
- [ ] `npm test`, `npm run typecheck`, `editor-chromium` grün.

## Notes
Refined 2026-11-01 als zweiter Teil des Logo-Themas (erster Teil: livery-editor-gn6gp). Die Allow-List für Logo-Assets, die ADR 0032/0035 offen ließen, wird hier festgelegt: `src/client/ui/assets/svg/logos/`. Reale config.yaml anpassen: nein.

## Verifier note (iteration 1)

REASONS:
- Criterion 1 not met: `svgProblem` accepts (a) `<image/onerror="alert(1)" href="#x"/>` — the on* regex needs whitespace before `on`, but `/` also separates attributes; (b) unquoted `href=javascript:alert(1)`; (c) unquoted external `href=http://evil/x.png` — the href loop only matches quoted values. Exploitable: main.ts injects `LOGO_SVG[src]` via innerHTML and build-assets copies the SVG unchanged. `<script` (any case), `onload =` with spaces and quoted `javascript:` are rejected. Tests only use the quoted, whitespace-separated form.
- README delta only replaces "Allow-List"; the "Logo" bullet still ends with "Upload ist ein eigener Task" and the "Schreib-Plugin" bullet does not mention the second endpoint/logo checks.
- Confirmed fine: in-memory LOGO_SVG matches build-assets output; path cannot leave logosDir; invalid prefilled name rejected server-side (400); 29 logos untouched; no `.agentheim/` paths. Suites not run (stopped at check 1).

SUGGESTED_FIX: `svgProblem`: reject on* attributes after whitespace, `/` or a quote (`/[\s/"']on[a-z]+\s*=/i`); check quoted AND unquoted href/xlink:href values (`/\b(?:xlink:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi`); add unit tests for the three bypasses. Add README replace ops for "Logo" (drop "Upload ist ein eigener Task", mention upload) and "Schreib-Plugin" (second endpoint, logo checks, 409).

ITERATION_HINT: likely-fixable

## Outcome
Logo-Upload implementiert (Endpunkt `/__livery-editor/logo`, `tools/livery-editor/logo-save.ts`, Panel in `src/main.ts`): Name-, Größen- (413), SVG-/PNG-Prüfung, PNG-Wrapper-SVG, atomar, nie überschreiben (409), Ziel `svg/logos/`. Iteration 2 härtet `svgProblem`: on*-Attribute nach Whitespace, `/`, Anführungszeichen; href/xlink:href quoted und unquoted, Whitespace/Groß-Kleinschreibung normalisiert, nur `#`/`data:` erlaubt; konservativ abgelehnt: foreignObject, iframe, embed, object, applet, meta, link, style-Block/-Attribut mit url()/expression()/@import. Unit-Tests für alle Bypässe ergänzt. 849 Unit-Tests grün, typecheck grün, Editor-E2E 23 grün (ein einmaliger Flake im ersten Lauf wegen fehlendem Tmp-Verzeichnis, Wiederholung grün).
