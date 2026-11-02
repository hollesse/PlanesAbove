---
id: liveries-bgfwz
title: Rumpf und Finne standardmäßig wirklich weiß (#FFFFFF statt hellgrau #F4F4F2) in der Render-Funktion der Lackierungsdateien
status: todo
type: bug
context: liveries
created: 2026-11-02
completed:
depends_on: [design-system-001-styleguide]
blocks: []
tags: [render, farbe, silhouette]
related_adrs: [0032, 0034]
related_research: []
prior_art: [liveries-w35k0]
---

## Why
Papa hat im Editor bemerkt: Die unlackierte Pfadfläche (Rumpf und Finne) ist ein helles Grau (`#F4F4F2`),
kein Weiß. Viele Airlines haben einen weißen Rumpf; wer nichts drüberzeichnet, soll echtes Weiß sehen.

## What
In der Render-Funktion der Lackierungsdateien (`src/client/ui/domain/livery-render.ts`) wird die
Grundfarbe der Pfadfläche `BODY_FILL` (die `<g class="lv-body">` aus Rumpf plus Finne) von `#F4F4F2` auf
`#FFFFFF` gesetzt. Das wirkt überall, wo Lackierungen im neuen Format gerendert werden: Editor-Zeichenbrett,
Storybook, Himmelsszene.

**Nicht** im Umfang (Entscheidung des Betreibers):
- die alten CSS-Lackierungen (`src/client/ui/domain/liveries.ts`, `--skin-*`) und die Fallback-Fills in den
  Silhouetten-SVGs (`var(--skin-fuselage, #F4F4F2)` usw.) — Flugzeuge ohne Lackierung im neuen Format,
  Hubschrauber, Segelflieger bleiben wie sie sind;
- die Farbfeld-Standards (`FIELD_DEFAULTS`: Flügel und Höhenleitwerk `#E1E3E1`, Triebwerke `#C9CCCB`) bleiben grau.

## Acceptance criteria
- [ ] `BODY_FILL` ist `#FFFFFF`; ein Unit-Test prüft, dass eine Lackierungsdatei ohne Pfade die Pfadfläche
      (`lv-body`) weiß rendert. Snapshots (`tests/unit/__snapshots__/livery-render-layers.test.ts.snap`)
      sind bewusst aktualisiert, nur diese Farbe ändert sich.
- [ ] `FIELD_DEFAULTS`, `liveries.ts` und die Silhouetten-SVGs unter `src/client/ui/assets/svg/` sind unverändert.
- [ ] `npm test`, `npm run typecheck` und die Editor-E2E-Suite bleiben grün; visuelle Storybook-Baselines, die
      die Pfadfläche zeigen, sind bewusst aktualisiert (falls vorhanden).
- [ ] Im Editor und in Storybook wirkt der unlackierte Rumpf weiß, die Farbfelder heben sich weiter ab. [human-eye]

## Notes
- Anzeigepfad-Baustein (ADR 0034) → Storybook-first; daher `depends_on: [design-system-001-styleguide]` (erledigt).
- `tools/livery-editor/index.html` nutzt `#F4F4F2` als Hintergrund des Fotopanels — Editor-Chrome, nicht betroffen.
- Weiß mit dunklem Umriss (`OUTLINE #1F2A33`) bleibt auf dem Himmel gut sichtbar; auf dem weißen
  Editor-Hintergrund trennt der Umriss.
