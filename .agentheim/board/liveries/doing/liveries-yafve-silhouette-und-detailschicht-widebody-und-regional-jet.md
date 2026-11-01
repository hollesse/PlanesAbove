---
id: liveries-yafve
title: Silhouette und Detailschicht für widebody und regional-jet aus der Altgrafik (nach dem Narrowbody-Muster)
status: doing
type: feature
context: liveries
created: 2026-11-01
completed:
depends_on: [liveries-yzshd, liveries-wyypc]
blocks: [livery-editor-fweas]
tags: [silhouette, details, typklassen]
related_adrs: [0031, 0032]
related_research: []
prior_art: [livery-editor-zc7hk, liveries-yzshd, liveries-wyypc]
---

## Why
Der Editor kann nur narrowbody zeichnen; der Heimserver meldet aber widebody und regional-jet als häufige Sichtungen, die im Select deaktiviert bleiben („keine Silhouette“). Die beiden nächsten Typklassen schalten den Editor für den Großteil der Lücken frei.

## What
Für `widebody` und `regional-jet` je `src/client/ui/assets/planes/<typklasse>/silhouette.svg` und `details.svg` nach dem Narrowbody-Muster (ADR 0032 §5, liveries-yzshd, liveries-wyypc): `<g id="body">` als Vereinigung Rumpf + Finne (Zuschnitt), `outline-fuselage` und `outline-fin` getrennt (Trennlinie), Farbfeld-Gruppen `field-engines`, `field-wings`, `field-tailplane`; Detailschicht mit vollständiger Cockpit-Fensterleiste (`paint-window-line`) und Triebwerksdetails (Einlassring, Fan). Quelle: `src/client/ui/assets/svg/widebody.svg` und `regional-jet.svg`; viewBox 1:1 übernehmen. `build-assets` erzeugt die Parts automatisch; je Typklasse eine Beispiel-Lackierung `spike/<typklasse>.json` mit einem Rumpf-Pfad, damit die Story „Liveries/Pfade“ sie zeigt.

## Acceptance criteria
- [ ] Je Typklasse existieren beide Dateien; `PLANE_PARTS` enthält `widebody` und `regional-jet` mit `body`, `fields` (alle drei), `outlines` und `details` (Unit-Test über build-assets-Ausgabe).
- [ ] Detailschicht: Fensterleiste hat genau so viele Teilpfade wie `paint-window-line` der Altgrafik, Koordinaten gleich (Test wie `narrowbody-details.test.ts`, für beide Typklassen).
- [ ] Umriss: Rumpf-Umriss und Finnen-Umriss entsprechen `fuselage-outline` und `tail-outline` der Altgrafik (Test).
- [ ] `renderLiverySvg` rendert beide Typklassen ohne Fehler; die Stories `liveries-pfade--spike-widebody` und `--spike-regional-jet` existieren; WebKit-Story-Lauf und `editor-chromium` grün; im Editor sind beide Typen wählbar (Select nicht mehr deaktiviert).
- [ ] `npm test`, `npm run typecheck` grün.
- [ ] Beide Silhouetten sehen im Editor wie in der Himmelsszene aus; Trennlinie und Cockpitfenster stimmen. [human-eye]

## Notes
Betreiber-Wunsch vom 2026-11-01 („weitere Flugzeugtypen“); die beiden häufigsten gesichteten zuerst. Weitere Typklassen (jumbo-hump, double-decker, turboprop, business-jet, helicopter) folgen als eigener Task nach demselben Muster. Prüfen, ob die Altgrafik je Typ dieselben Klassen verwendet; Abweichungen im Outcome notieren.
