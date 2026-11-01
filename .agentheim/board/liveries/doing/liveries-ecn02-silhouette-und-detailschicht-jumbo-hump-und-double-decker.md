---
id: liveries-ecn02
title: Silhouette und Detailschicht für jumbo-hump und double-decker aus der Altgrafik (nach dem Widebody-Muster)
status: doing
type: feature
context: liveries
created: 2026-11-01
completed:
depends_on: [liveries-yafve]
blocks: []
tags: [silhouette, details, typklassen]
related_adrs: [0031, 0032, 0038]
related_research: []
prior_art: [liveries-yafve, liveries-yzshd, liveries-wyypc]
---

## Why
Jumbo (Hump) und Double-Decker fehlen im Editor noch; nach widebody und regional-jet sind das die nächsten Großraumtypen über dem Haus.

## What
Für `jumbo-hump` und `double-decker` je `src/client/ui/assets/planes/<typklasse>/silhouette.svg` und `details.svg` exakt nach dem Muster von liveries-yafve (widebody): `<g id="body">` = Vereinigung Rumpf + Finne (Zuschnitt), `outline-fuselage`/`outline-fin` aus `fuselage-outline`/`tail-outline`, Farbfelder `field-engines` (vier Triebwerke, unter dem Flügel → `back`, kein `data-layer`), `field-wings`, `field-tailplane` (die kleinen `paint-wings`-Flächen am Heck wie beim widebody); Detailschicht mit vollständiger `paint-window-line` (Jumbo: Fenster auch im Oberdeck-Buckel, falls die Altgrafik sie führt) und Triebwerksdetails (Einlassring, Fan je Triebwerk). Quelle: `src/client/ui/assets/svg/jumbo-hump.svg`, `double-decker.svg`; viewBox 1:1. Fixtures `liveries/spike/jumbo-hump.json` und `spike/double-decker.json` (ein Rumpf-Pfad) für die Story „Liveries/Pfade“. Rumpf-Buckel bzw. Doppeldeck gehören zum Rumpf (Pfadfläche), nicht zu einem Farbfeld.

## Acceptance criteria
- [ ] `PLANE_PARTS` enthält `jumbo-hump` und `double-decker` mit `body`, allen drei Farbfeldern (alle `back`), `outlines` und `details` (Erweiterung von `tests/unit/plane-details.test.ts`).
- [ ] Fensterleiste: gleiche Anzahl Teilpfade und Koordinaten wie `paint-window-line` der Altgrafik; Umrisse gleich `fuselage-outline`/`tail-outline` (Tests wie bei widebody).
- [ ] Der Snapshot-Test `livery-render-layers.test.ts` bleibt für narrowbody/widebody byte-gleich; beide neuen Typen rendern ohne Fehler; Stories `liveries-pfade--spike-jumbo-hump` und `--spike-double-decker` existieren; WebKit-Story-Lauf und `editor-chromium` grün; beide Typen im Editor wählbar.
- [ ] `npm test`, `npm run typecheck` grün.
- [ ] Beide Silhouetten sehen im Editor wie in der Himmelsszene aus; Buckel/Oberdeck, Trennlinie, Cockpitfenster und vier Triebwerke stimmen. [human-eye]

## Notes
Betreiber-Wunsch vom 2026-11-01. Beide Altgrafiken tragen dieselben Klassen wie widebody (6 `paint-engines`-Elemente = 4 Gondeln inkl. Pylone/Details, 4 `paint-wings`, Fensterleiste, Umrisse, Maske). Falls eine Altgrafik ein Farbfeld nicht hat oder ein Feld den Rumpf überlappt (ADR 0038 `front`), im Outcome notieren und nicht erfinden. Reale config.yaml anpassen: nein.
