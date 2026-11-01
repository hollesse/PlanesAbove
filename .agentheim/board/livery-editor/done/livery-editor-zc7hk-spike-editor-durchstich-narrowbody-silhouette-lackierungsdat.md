---
id: livery-editor-zc7hk
title: Spike: Editor-Durchstich — Narrowbody-Silhouette, Lackierungsdatei, Render-Funktion, Pfad zeichnen, speichern, in Storybook sehen
status: done
type: spike
context: livery-editor
created: 2026-10-31
completed:
depends_on: [liveries-w35k0, livery-editor-rv382, infrastructure-cc9gq, liveries-ptm0c, infrastructure-nwwcq, infrastructure-m6nj3]
blocks: []
tags: [spike, foundation, walking-skeleton]
related_adrs: [0031]
related_research: []
prior_art: []
---

## Why
Der erste Beweis, dass die Kette steht: leere Silhouette im Editor, ein Pfad gezeichnet, als Datei gespeichert, in Storybook identisch gerendert, nichts davon im Client-Bundle. Feature-dünn, Architektur-dick. Erst danach lohnt der Ausbau zu Ebenen, Rundung, Logos, Lückenliste und Referenzfoto.

## What
Nur Narrowbody, keine Serverdaten, keine Logos, keine Rundung, eine Farbe:
1. `silhouette.svg` und `details.svg` für narrowbody mit `<g id="body">` (Triebwerkskörper in der Silhouette, Einlass/Fan in den Details).
2. Schema `livery-file.ts`, Funktion `renderLiverySvg`, eine erzeugte Story „Liveries/Pfade“.
3. `npm run editor`: Typklassen-Auswahl, Zeichenbrett mit Deckkraft-Regler für Silhouette/Details, Pfadwerkzeug (Klicks setzen Punkte, Pfad schließen), eine Farbe, Speichern mit Lackierungs-ID.
4. Vite-Schreib-Plugin mit Validierung und Pfadschutz.

## Acceptance criteria
- [ ] `npm run editor` öffnet http://127.0.0.1:5174 mit sichtbarer Narrowbody-Silhouette und Detailschicht.
- [ ] Vier Klicks plus Schließen ergeben ein gefärbtes Viereck; wo es über die Silhouette hinausgeht, ist es sichtbar zugeschnitten; bei Silhouetten-Deckkraft 0 % ist es ungeschnitten zu sehen.
- [ ] Speichern als `spike` erzeugt genau `src/client/ui/assets/liveries/spike/narrowbody.json` mit 4 Punkten und der gewählten Farbe; eine ID mit `../` liefert 400 und schreibt nichts.
- [ ] Ohne Neustart zeigt Storybook die Story „Liveries/Pfade/spike – narrowbody“ mit demselben Bild wie das Zeichenbrett (Playwright-Chromium-Pixelvergleich innerhalb der Toleranz).
- [ ] `npm run build` gefolgt von `grep -r livery-editor dist/` findet nichts; der Docker-Kontext enthält kein `tools/`.
- [ ] Unit-Tests für Schema-Roundtrip, clipPath-ID-Eindeutigkeit und Schreibschutz sind grün, ebenso der WebKit-Story-Lauf.
- [ ] Der Betreiber hat den Durchstich am Mac ausprobiert und bestätigt, dass sich das Zeichnen richtig anfühlt. [human-eye]

## Notes
- **Stop-loss (ADR 0065):** Wenn sich mitten im Spike zeigt, dass die Minderung bereits bekannt und billig ist, aufschreiben und stoppen (record it and stop). Gleiches gilt, wenn sich der Zuschnitt (Flügel hinter dem Rumpf, Umriss-Stroke) als untauglich erweist: Befund notieren, nicht weiterbauen.
- Flügel, Höhenleitwerk und Triebwerke sind Farbfelder (ADR 0031 4a): im Spike bekommen sie je einen Farbwähler; der gezeichnete Pfad endet sichtbar an ihrem Rand.
- Reale config.yaml anpassen: nein.

## Verifier note (iteration 1)

REASONS:
- Criterion 4 ("Ohne Neustart zeigt Storybook die Story …"): the "ohne Neustart" part has no test. tests/e2e-editor/draw-and-compare.spec.ts:57-66 compares the board against the prebuilt static `storybook-static`, built from the committed fixture before the test ran. The save goes to `LIVERY_EDITOR_OUT` (temp dir), and tools/livery-editor/write-plugin.ts:15 skips the build-assets rebuild whenever that variable is set. The link save → build-assets → Storybook shows the new story is never exercised; deleting the `spawn('node', ['scripts/build-assets.mjs'] …)` line leaves every test green. ADR 0035 point 3 requires this trigger.
- Everything else green from the worktree: vitest 729 passed / 1 skipped, tsc clean, build-storybook + build ok, `grep -rl livery-editor dist/` empty, .dockerignore has `tools`, playwright editor-chromium 2 passed, full playwright 59/60 (one WebKit font-load flake in an unrelated story, green on rerun).
- Criteria 1, 2, 3, 5, 6 covered by passing tests. Criterion 7 is [human-eye], pending builder.

SUGGESTED_FIX: Add a test that fails if a successful save into the repo target (no `LIVERY_EDITOR_OUT`) does not start build-assets. E.g. inject the rebuild runner into `liveryWritePlugin` and assert it is called on 200 and not on 400; better still, save into a temp liveries root plus build-assets and assert the regenerated liveries.stories.ts contains the new `<id> – <typklasse>` story.

ITERATION_HINT: likely-fixable

## Outcome

Spike-Durchstich steht, Stop-loss nicht ausgelöst: der Zuschnitt per clipPath aus `#body` trägt (Rumpf-Pfad endet sichtbar an Körperkante, Flügel, Leitwerk und Triebwerk bleiben Farbfelder darunter bzw. daneben).

**Gebaut**
- Assets `src/client/ui/assets/planes/narrowbody/silhouette.svg` (Gruppen `body`, `field-engines`, `field-wings`, `field-tailplane`, reine Geometrie) und `details.svg` (Cockpitscheiben, Einlassring, Fan). `scripts/build-assets.mjs` erzeugt daraus `generated/plane-parts.ts`, `generated/liveries.ts` (Dateiindex) und `generated/liveries.stories.ts` (eine Story je Lackierungsdatei, Titel „Liveries/Pfade“, Story „spike – narrowbody“).
- `domain/livery-file.ts` (zod-Schema: PathLayer mit optionalem `via`, LogoLayer, Farbfelder) und `domain/livery-render.ts` (`renderLiverySvg`, `pathData`; Schichtfolge Farbfelder, weißer Körper, Pfade zugeschnitten, Umriss, Details; clipPath-ID je Render-Instanz `lvN-clip`).
- Committete Beispieldatei `src/client/ui/assets/liveries/spike/narrowbody.json` (Viereck 300/150 bis 700/300, `#d6001c`) als Story-Quelle.
- Editor `tools/livery-editor/`: `vite.config.ts` (127.0.0.1:5174, strictPort, `fs.allow` Repo-Stamm), `write-plugin.ts` (POST `/__livery-editor/save`) mit `save.ts` (ID-Regex, zod, Zielpfad aus ID + Typklasse, Traversal-Prüfung, atomares Schreiben; `LIVERY_EDITOR_OUT` überschreibt das Ziel und unterdrückt den build-assets-Anstoß), `board.ts` (Punkte, Snap auf ganze Zahlen, Schließen), `src/main.ts` (Typklassen-Auswahl, Zeichenbrett, Deckkraft-Regler, Pfadwerkzeug, Farbwähler für Pfad und Farbfelder, Speichern). `npm run editor`; `tools/` in tsconfig, Vitest, `.dockerignore`; `tools/livery-editor/.env.local` in `.gitignore`.
- Playwright-Projekt `editor-chromium` (`tests/e2e-editor/`), zweiter webServer `npm run editor` (reuseExistingServer false, Schreibziel Temp-Verzeichnis). Test: vier Klicks, Schließen, Zuschnitt, Geisterkopie bei Deckkraft 0, Speichern (Datei gleich der committeten), Canvas-Pixelvergleich mit der Story (Toleranz 0,5 %, beobachtet 0,2 % durch Subpixel-Antialiasing), `../` liefert 400.
- Guard-Tests `tests/unit/livery-editor-guard.test.ts`: `.dockerignore` enthält `tools`, esbuild-Importgraph von `main.ts` führt nie nach `tools/`, `dist/` ohne Marker `livery-editor` (läuft nur, wenn `dist/` existiert). Manuell geprüft: `npm run build` und `grep -r livery-editor dist/` ohne Treffer.
- `tests/e2e/stories.spec.ts` (Ebenenliste enthält jetzt „Liveries“) und `storySort` angepasst.

**Iteration 2:** `liveryWritePlugin(repoRoot, rebuild)` nimmt den Rebuild-Runner als injizierbaren Parameter (Standard: `node scripts/build-assets.mjs`). `tools/livery-editor/write-plugin.test.ts` (3 Tests) ruft die echte Middleware auf: Rebuild läuft nach erfolgreichem Speichern ins Repo-Ziel, nicht bei 400, nicht bei `LIVERY_EDITOR_OUT`. Entfernt man den Aufruf, wird der Test rot (Kriterium 4 „ohne Neustart“).

**Verifiziert:** `npm run typecheck` grün, `npm test` 732 grün (1 übersprungen), `npm run e2e` 60 grün (WebKit und Chromium über alle Stories inklusive neuer Story, `editor-chromium`).

**Befunde**
- Farbfelder müssen so geschnitten sein, dass sie an der Körperkante enden (Flügel, Leitwerk); sonst malen Rumpf-Pfade bei der Schichtung (Felder unter dem Körper) nicht, aber die Schlitzkanten wirken ungenau. Die Narrowbody-Felder wurden dafür gegenüber der Altgrafik leicht getrimmt; Fin und Rumpf sind in `#body` als eine vereinigte Kontur vorberechnet (kein Mask-Trick nötig für den Umriss).
- Umriss-Stroke obenauf bleibt in voller Stärke sichtbar, der Zuschnitt ist am Rand sauber (Ansicht geprüft per Screenshot).
- Vite 8 braucht für die Editor-Konfiguration `--configLoader runner`, weil die importierten TS-Module keine Dateiendungen schreiben (sonst nur eine Warnung).
- Die Playwright-Config startet jetzt in allen Projekten beide Webserver; der Editor-Server wird nie wiederverwendet, damit ein von Hand gestarteter Editor nicht ins Repo schreibt.
- Offen für den Betreiber: Kriterium „[human-eye]“ (Zeichnen fühlt sich richtig an) bleibt unangekreuzt.
