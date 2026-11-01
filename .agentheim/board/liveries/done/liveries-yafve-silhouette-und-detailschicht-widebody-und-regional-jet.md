---
id: liveries-yafve
title: Silhouette und Detailschicht für widebody und regional-jet aus der Altgrafik (nach dem Narrowbody-Muster)
status: done
type: feature
context: liveries
created: 2026-11-01
completed:
depends_on: [liveries-yzshd, liveries-wyypc]
blocks: [livery-editor-fweas]
tags: [silhouette, details, typklassen]
related_adrs: [0031, 0032, 0038]
related_research: []
prior_art: [livery-editor-zc7hk, liveries-yzshd, liveries-wyypc]
---

## Why
Der Editor kann nur narrowbody zeichnen; der Heimserver meldet aber widebody und regional-jet als häufige Sichtungen, die im Select deaktiviert bleiben („keine Silhouette“). Die beiden nächsten Typklassen schalten den Editor für den Großteil der Lücken frei.

## What
Für `widebody` und `regional-jet` je `src/client/ui/assets/planes/<typklasse>/silhouette.svg` und `details.svg` nach dem Narrowbody-Muster (ADR 0032 §5, liveries-yzshd, liveries-wyypc): `<g id="body">` als Vereinigung Rumpf + Finne (Zuschnitt), `outline-fuselage` und `outline-fin` getrennt (Trennlinie), Farbfeld-Gruppen `field-engines`, `field-wings`, `field-tailplane`; Detailschicht mit vollständiger Cockpit-Fensterleiste (`paint-window-line`) und Triebwerksdetails (Einlassring, Fan). Quelle: `src/client/ui/assets/svg/widebody.svg` und `regional-jet.svg`; viewBox 1:1 übernehmen. `build-assets` erzeugt die Parts automatisch; je Typklasse eine Beispiel-Lackierung `spike/<typklasse>.json` mit einem Rumpf-Pfad, damit die Story „Liveries/Pfade“ sie zeigt.

## Acceptance criteria
- [ ] Je Typklasse existieren beide Dateien; `PLANE_PARTS` enthält `widebody` (fields engines, wings, tailplane) und `regional-jet` (fields engines, wings — KEIN tailplane, die Altgrafik hat keines; Betreiber-Entscheidung 2026-11-01), jeweils mit `body`, `outlines` und `details` (Unit-Test über build-assets-Ausgabe).
- [ ] Farbfelder, die den Körper überlappen (Hecktriebwerke des regional-jet), werden ÜBER dem weißen Körper gezeichnet und aus dem Zuschnitt der Pfade ausgenommen (ADR 0031 §4a): die Silhouette markiert solche Felder (z. B. `<g id="field-engines" data-layer="front">`), `build-assets` reicht das als `fieldLayer` durch, `renderLiverySvg` zeichnet `front`-Felder nach Körper und Pfaden und erweitert den clipPath um eine Aussparung (Pfade enden am Triebwerk). Narrowbody/Widebody (Felder hinter dem Körper) rendern byte-gleich wie bisher (Snapshot-Test). Die Regel wird als ADR-Nachtrag zu 0032 §6 im `ADRS`-Block geliefert (neue ADR-Nummer 0038, scope liveries).
- [ ] Screenshot-Kontrolle: in der Story `liveries-pfade--spike-regional-jet` ist die Triebwerksgondel sichtbar und der rote Rumpfpfad endet am Triebwerk (Playwright-Pixelprüfung: Gondelfarbe `#c9cccb` an einem Punkt innerhalb des Triebwerks, Rumpfpfad-Farbe nicht).
- [ ] Detailschicht: Fensterleiste hat genau so viele Teilpfade wie `paint-window-line` der Altgrafik, Koordinaten gleich (Test wie `narrowbody-details.test.ts`, für beide Typklassen).
- [ ] Umriss: Rumpf-Umriss und Finnen-Umriss entsprechen `fuselage-outline` und `tail-outline` der Altgrafik (Test).
- [ ] `renderLiverySvg` rendert beide Typklassen ohne Fehler; die Stories `liveries-pfade--spike-widebody` und `--spike-regional-jet` existieren; WebKit-Story-Lauf und `editor-chromium` grün; im Editor sind beide Typen wählbar (Select nicht mehr deaktiviert).
- [ ] `npm test`, `npm run typecheck` grün.
- [ ] Beide Silhouetten sehen im Editor wie in der Himmelsszene aus; Trennlinie und Cockpitfenster stimmen. [human-eye]

## Notes
Betreiber-Entscheidungen 2026-11-01 nach Verifier-Iteration 1: Hecktriebwerke über dem Rumpf und aus dem Zuschnitt ausgenommen; kein Höhenleitwerk für regional-jet.
Betreiber-Wunsch vom 2026-11-01 („weitere Flugzeugtypen“); die beiden häufigsten gesichteten zuerst. Weitere Typklassen (jumbo-hump, double-decker, turboprop, business-jet, helicopter) folgen als eigener Task nach demselben Muster. Prüfen, ob die Altgrafik je Typ dieselben Klassen verwendet; Abweichungen im Outcome notieren.

## Verifier note (iteration 1)

REASONS:
- Check 6b (ADR 0031 §4a): regional-jet engines are rear-mounted and overlap fuselage and fin (field-engines x 176–314, y 177–229; fuselage top y=200). (a) The body (clip area) = fuselage ∪ fin does not cut the engine out, so fuselage paths are clipped to an area that includes the engine — ADR 0031 §4a says the clip area is the silhouette WITHOUT its colour fields. (b) renderLiverySvg draws colour fields under the white body, so the nacelle is almost hidden and inlet ring/fan float on the white fuselage. Confirmed by a screenshot of story liveries-pfade--spike-regional-jet. The legacy graphic draws paint-engines AFTER the fuselage outline, on top. The narrowbody pattern (engines under the wing) does not transfer to a rear-engined type.
- Check 6 (undocumented decision): the regional-jet field-tailplane (narrowbody tailplane scaled 0.8, moved to the fin base) is invented; legacy graphic and sky scene have no tailplane for this type. Criterion 1 (all three fields) conflicts with criterion 6 (editor matches the sky scene). Needs an operator decision.
- Everything else sound: npm test 776, typecheck, builds, webkit + editor-chromium 46/46; both stories exist; both types selectable; window strip and outlines match legacy exactly; body unions correct; widebody looks right.

SUGGESTED_FIX: Operator decides (1) how colour fields overlapping the body are handled for rear-engined types (cut the engine out of body + fuselage outline, or draw engine fields above the body — render-order change needs an ADR amendment to 0032 §6); (2) whether regional-jet gets a tailplane and which geometry. Then amend criteria and re-dispatch.

ITERATION_HINT: task-under-specified

## Salvage note

Salvaged diff: `/Users/joshuatopfer/Documents/Projekte/Privat/PlanesAbove/.agentheim/salvage/liveries-yafve-escalated-iter1.patch`. Worktree kept: `/Users/joshuatopfer/Documents/Projekte/Privat/PlanesAbove/.worktrees/liveries-yafve` (branch `aw/liveries-yafve`, one wip commit). Escalated at iteration 1 (task-under-specified).

## Outcome
Iteration 2 nach Betreiber-Entscheidungen: Farbfelder tragen eine Ebene (`front`/`back`, ADR 0038). `build-assets` liest `data-layer` und erzeugt `fieldLayer`; `renderLiverySvg` zeichnet `front`-Felder nach Körper, Pfaden und Umriss (vor den Details) und schneidet sie per `<mask>` aus dem Pfad-Zuschnitt. Regional-jet-Triebwerke sind `front`; das erfundene Höhenleitwerk des regional-jet ist entfernt (widebody behält seins). Spike-Lackierung regional-jet: Pfad bis ins Triebwerk verbreitert, ohne tailplane. Tests: Snapshot (gegen den unveränderten Renderer erzeugt) belegt Byte-Gleichheit für narrowbody/widebody, Layer-Reihenfolge-/Maskentest, Parts-Test, Playwright-Pixelprüfung (webkit) auf `liveries-pfade--spike-regional-jet` (#c9cccb in der Gondel, Pfadrot am Rumpf). npm test 780 grün, typecheck grün, webkit + editor-chromium 47/47. Abweichung: Die Pixelprüfung belegt sichtbare Gondel (Front-Ebene); der Pfad-Ausschnitt selbst ist durch den Maskentest abgedeckt. [human-eye] offen.
