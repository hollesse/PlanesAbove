---
id: liveries-ygdxc
title: Realistische Rumpfspitze für alle fünf Silhouetten im neuen Format - stumpf gerundete Nase aus mehreren tangentenstetigen Kurven statt einer Spitze aus zwei Kurven
status: done
type: feature
context: liveries
created: 2026-11-02
completed:
depends_on: [design-system-001-styleguide]
blocks: []
tags: [silhouette, rumpf, nase, render]
related_adrs: [0032, 0034]
related_research: []
prior_art: [liveries-wyypc, liveries-yafve, liveries-ecn02, liveries-yzshd]
---

## Why
Papa sieht im Editor: Die Rumpfspitze der neuen Silhouetten ist zu spitz. Eine echte Airliner-Nase ist
nicht ein Punkt, sondern eine Folge von Rundungen: Die Rumpfoberseite fällt in einem langen Bogen zur
Cockpitscheibe ab, die Spitze selbst ist stumpf gerundet und sitzt unter der Rumpfmitte, das Kinn läuft
flacher zurück in den Rumpfboden.

## What
In allen fünf Silhouetten des neuen Formats (`src/client/ui/assets/planes/<typklasse>/silhouette.svg`:
narrowbody, widebody, regional-jet, jumbo-hump, double-decker) wird die Nase neu gezeichnet. Heute endet
der Rumpf vorne in zwei quadratischen Kurven, die sich in einem Knick treffen
(z. B. narrowbody: `L863.8 260 Q919.8 258 950 226.3 Q928.4 189 863.8 185`).

Neu: mehrere Kurvensegmente (z. B. kubische Béziers) mit stetiger Tangente an jedem Übergang:
1. **Oberseite/Scheibe:** langer, sanft konvexer Bogen von der geraden Rumpfoberkante hinunter, im
   Scheibenbereich etwas steiler;
2. **Spitze:** stumpfe Rundung (kein Knick), etwa auf 35–45 % der Rumpfhöhe von unten;
3. **Kinn:** flacherer Bogen zurück in die Rumpfunterkante.

Betroffen je Typklasse, immer konsistent zueinander:
- `outline-fuselage` (Umriss) und der Rumpfanteil von `<g id="body">` (Zuschnittbereich, ADR 0032) — beide
  bekommen dieselbe Nasengeometrie;
- `details.svg`: Cockpitfenster an die neue Kontur anpassen (liegen innerhalb des Rumpfs, folgen der Scheibe).

Rumpflänge und -höhe bleiben: Die vorderste x-Position der Nase und die Rumpfober-/-unterkante ändern sich
höchstens minimal (±5 Einheiten), damit Größenfaktoren (`plane-size.ts`) und gespeicherte Lackierungen
passen. Beim jumbo-hump betrifft das nur die Nase, nicht den Buckel.

**Nicht** im Umfang: die alten CSS-Silhouetten unter `src/client/ui/assets/svg/`.

## Acceptance criteria
- [ ] Für jede der fünf Typklassen hat die Nase von `outline-fuselage` keinen Knick: ein Unit-Test tastet den
      Pfad im vorderen Rumpfbereich ab und prüft, dass der Richtungswechsel zwischen aufeinanderfolgenden
      Abtastschritten unter einer festen Schwelle bleibt (z. B. < 20°); der Test schlägt für die heutige
      Geometrie fehl.
- [ ] Die Nase besteht aus mindestens drei Kurvensegmenten; Umriss (`outline-fuselage`) und Zuschnittbereich
      (`#body`) haben im Nasenbereich dieselbe Geometrie (Test).
- [ ] Vorderste x-Position und Rumpfober-/-unterkante weichen je Typklasse höchstens 5 Einheiten vom heutigen
      Stand ab (Test).
- [ ] Die Cockpitfenster in `details.svg` liegen vollständig innerhalb der neuen Rumpfkontur (Test über die
      Fensterpunkte).
- [ ] `src/client/ui/assets/svg/` ist unverändert; `npm test`, `npm run typecheck` und die Editor-E2E-Suite
      (mit neu gebautem Storybook) sind grün; Snapshots bewusst aktualisiert.
- [ ] Die Nase wirkt in Storybook für alle fünf Typklassen wie eine echte Airliner-Nase. [human-eye]

## Notes
- Anzeigepfad-Baustein (ADR 0034): Storybook-first, Abnahme durch Papa in Storybook; daher
  `depends_on: [design-system-001-styleguide]` (erledigt).
- Vorbild: Seitenansichten A320/A330/B777/B747/A380; die Referenzfoto-Galerie im Editor hilft beim Vergleich.
- Die Editor-E2E vergleicht Brett und Story pixelweise — Storybook vor dem Lauf neu bauen (siehe liveries-bgfwz).
- Prior art: liveries-wyypc (Cockpitfenster narrowbody), liveries-yafve / liveries-ecn02 (Silhouetten der
  übrigen Typen), liveries-yzshd (Trennlinie Rumpf/Finne, Umriss-Masken).

## Outcome

Replaced the two-quadratic nose corner of narrowbody, widebody, regional-jet, jumbo-hump (nose only, hump untouched; crown joins the hump curve tangent-continuously at 930/168) and double-decker with 4-5 cubic Beziers (G1 with belly/top line): chin rises gently to a blunt tip at 40% of nose height, crown descends in a long gentle arc, steeper at the windshield. Tip x, belly (y=260) and top lines unchanged (tip x within +-5). outline-fuselage and the #body fuselage carry identical nose geometry. The first (curved) cockpit-window subpath in each details.svg was replaced by a windshield band offset inward along the new crown (jumbo-hump: windshield band added ahead of the hump windows); side windows untouched.

Tests: new tests/unit/nose-shape.test.ts (35 tests: >=3 curve segments, max turning angle between consecutive samples < 20 deg [verified failing on old geometry], tip x/belly/top within +-5, tip at 33-47% height, outline vs body nose equal, window points inside fuselage polygon, windshield reaches the nose). Legacy-comparison assertions in plane-details.test.ts and narrowbody-details.test.ts were relaxed (legacy fuselage outline and legacy windshield subpath no longer apply; side windows and fin outline still checked); livery-render-layers snapshot updated deliberately (only nose geometry in the body/clip/outline strings changed). Full unit suite and typecheck green; full editor E2E (34 tests, Storybook rebuilt from the worktree, temp config deleted) green. Visually checked via rendered PNG.
