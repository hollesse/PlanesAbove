---
id: livery-editor-q0xd2
title: Logo hochladen (SVG/PNG) über das Schreib-Plugin nach svg/logos/, danach sofort in der Logo-Liste und im LOGO-Index
status: doing
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
