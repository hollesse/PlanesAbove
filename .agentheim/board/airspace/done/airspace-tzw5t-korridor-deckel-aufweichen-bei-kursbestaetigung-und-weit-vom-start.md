---
id: airspace-tzw5t
title: Korridor-Deckel (corridorMaxKm) aufweichen, wenn der Kurs zum Ziel passt und das Flugzeug weit vom Start ist (Querabstand klein gegen Strecke seit Start); TOM16Y Manchester–Heraklion wird plausibel, EWG16Y bleibt abgelehnt
status: done
type: feature
context: airspace
created: 2026-10-31
completed:
depends_on: []
blocks: []
tags: [route, plausibilitaet, korridor, hexdb]
related_adrs: [0005, 0016]
related_research: []
prior_art: [airspace-p8w2k, airspace-prwpv, airspace-v4kqz, airspace-hw8f9]
---

## Why
TOM16Y (TUI, G-TUOD, B38M) am 2026-10-31 07:15 UTC: hexdb lieferte Manchester → Heraklion, die Route ist mit hoher Wahrscheinlichkeit richtig (Kursabweichung zum Ziel 11°, Reiseflug 12 500 m, Höhenprofil ok), wurde aber abgelehnt: Querabstand 171 km auf einem 2 929 km langen Leg. Die Korridorformel `min(corridorBaseKm + corridorPercent % × Leglänge, corridorMaxKm)` ergäbe ungedeckelt 284 km, der Deckel `corridorMaxKm` 150 km schneidet ab. Ergebnis für Mona: „Route unbekannt“, obwohl eine gute Route vorlag (VRS-Fallback Ibiza → London war veraltet und wurde zu Recht am Kurs abgelehnt).

Der Deckel kam mit airspace-prwpv/p8w2k, damit EWG16Y (Quelle: Stuttgart → Larnaca, real Köln → Wien) draußen bleibt: Querabstand 212 km bei ungedeckelt 282 km. **Kursbestätigung allein trennt die Fälle nicht:** EWG16Y hat zum angeblichen Ziel nur 7° Abweichung, TOM16Y 11°. Was sie trennt, ist die Geometrie: EWG16Y war nur 210 km vom angeblichen Start entfernt und 212 km neben der Linie (steht also querab vom Startflughafen), TOM16Y ist 795 km unterwegs und 171 km daneben.

## What
Entscheidung des Betreibers (modeling 2026-10-31): Deckel nicht pauschal anheben, sondern **nur aufweichen, wenn zwei Bedingungen zugleich gelten**:

1. **Kursbestätigung:** Kursabweichung zwischen `trackDeg` und Peilung zum Ziel des Legs ≤ `capReliefHeadingDeg` (Default 20°; deutlich enger als `maxHeadingDeviationDeg` 65). Fehlt `trackDeg` (MLAT) oder greifen die Kurs-Schutzzonen (`originZoneKm`, `destinationZoneKm`, `minHeadingCheckAltitudeM`), gibt es keine Aufweichung.
2. **Weit vom Start:** Querabstand / Entfernung vom Startflughafen ≤ `capReliefCrossTrackRatio` (Default 0,4). TOM16Y 171/795 ≈ 0,22, EWG16Y 212/210 ≈ 1,0.

Gelten beide, gilt statt `corridorMaxKm` die **ungedeckelte** Formel `corridorBaseKm + corridorPercent % × Leglänge` (für TOM16Y 284 km). Sonst bleibt alles wie heute. Umleitungs-Legs (geschlossener Luftraum, v4kqz) sind von der Korridorprüfung ohnehin ausgenommen; keine Änderung dort.

- Implementierung in `legPlausible` (`src/server/modules/airspace/route-service.ts`), neue Felder in `PlausibilityConfig`/`DEFAULT_PLAUSIBILITY`, zod-Schema in `src/server/config.ts`, Doku in `config.example.yaml`, README und BC-README (Bullet **Plausibilitaetspruefung (Route)**).
- `scripts/route-why.mjs`: die Korridor-Aufschlüsselung zeigt zusätzlich, ob die Aufweichung griff (`capRelief: true/false` mit Kursabweichung und Verhältnis), damit der nächste Grenzfall direkt lesbar ist.
- Keine Änderung an Kurs-, Phasen- und Höhenprofilprüfung. Keine Routendaten persistieren (ADR 0005/0016).

## Acceptance criteria
- [ ] Test (`tests/unit/server/route-plausibility.test.ts`): TOM16Y, Route Manchester (53.3537/-2.275) → Heraklion (35.3397/25.1803), Position 50.5/8.3, trackDeg 124, altitudeM 12 497, verticalRateMs 0 → `isPlausibleRoute` true mit Defaults; mit `capReliefHeadingDeg: 0` (Aufweichung aus) → false.
- [ ] Test: EWG16Y (STR–LCA, Oberweyer, trackDeg 113, ft(26225), vr 12,6) bleibt false; der bestehende Test „the cap is required“ bleibt unverändert grün; DLH7PP (MUC–GDN) bleibt false; CTN4456, LHX1979, AUA166D, DLH400 bleiben true.
- [ ] Test: TOM16Y-Position ohne `trackDeg` → false (keine Aufweichung ohne Kurs). TOM16Y-Position mit trackDeg 124, aber Verhältnis > `capReliefCrossTrackRatio` (konstruierte Position nahe am Start) → false.
- [ ] Defaults `capReliefHeadingDeg` 20 und `capReliefCrossTrackRatio` 0.4 per zod validiert (Grad 0..180, Verhältnis 0..1), in `config.example.yaml`, README und BC-README dokumentiert; der `DEFAULT_PLAUSIBILITY`-Snapshot-Test ist angepasst.
- [ ] `scripts/route-why.mjs` zeigt in der Korridor-Zeile `capRelief` samt Kursabweichung und Verhältnis; Lauf gegen TOM16Y-Daten (Position per `--lat --lon --alt-m --track --rate-ms`) meldet hexdb als PLAUSIBLE.
- [ ] `npm run typecheck`, `npm test` grün; keine FlightAware-Aufrufe im Live-Code.

## Notes
- Diagnose: `node scripts/route-why.mjs TOM16Y` am 2026-10-31. hexdb hit, corridor FAIL {crossTrackKm 171.2, limitKm 150, routeLengthKm 2929.4}, heading ok {deviation 10.9}, altitudeProfile ok {distanceFromOriginKm 794.5}.
- Verworfene Varianten (modeling): Deckel pauschal anheben (kippt EWG16Y), nur Kurs (EWG16Y 7° rutscht durch), Kurs + Reiseflug (trennt, aber ein falscher Flugplan im Reiseflug ginge durch). Gewählt: Kurs + weit vom Start, weil der Abstand zwischen den beiden Belegfällen (0,22 vs 1,0) groß ist.
- Das Verhältnis Querabstand/Entfernung vom Start ist der Sinus des Winkels zwischen Leg-Peilung am Start und Peilung Start→Flugzeug; 0,4 entspricht ≈ 24°. Der Worker darf das alternativ als Winkel formulieren, wenn es im Code klarer ist, Default dann 24°.
- Vorbilder: airspace-p8w2k (Schärfung), prwpv (8 % + Deckel), v4kqz (Umleitung), hw8f9 (Phase nur unter Reiseflughöhe).

## Verifier note (iteration 1)

REASONS:
- Criterion 3, second half, not covered as written: the test "no relief when the plane stands close to the origin (ratio above limit)" reuses the TOM position 50.5/8.3 (ratio ~0.22, ~790 km from MAN) and lowers capReliefCrossTrackRatio to 0.1 instead of constructing a position near the origin; the default 0.4 ratio gate is never exercised by a near-origin MAN–HER position.
- Test "EWG16Y stays rejected; DLH7PP stays rejected" asserts nothing about DLH7PP (both expectations use route(STR, LCA) at OBERWEYER). Rename or add the MUC–GDN assertion.
- Secondary: README_DELTA appends a separate "Korridor-Aufweichung" bullet, but the task's What names the existing **Plausibilitaetspruefung (Route)** bullet as the place for this; that bullet would still read "capped at corridorMaxKm 150" with no relief exception. Cosmetic: route-why prints crossTrackRatio 0.21899999999999997 (float noise).
- Everything else checks out: npm test (693 passed) and typecheck green; legPlausible logic matches the What; zod bounds correct; route-why TOM16Y reports PLAUSIBLE with capRelief applied.

SUGGESTED_FIX: Add a test with a real constructed MAN–HER position near Manchester: outside originZoneKm, cross-track over 150 km, ratio above 0.4, trackDeg within 20° of the bearing to HER — rejected with defaults, would pass if the ratio check were removed. Rename or fix the mislabeled DLH7PP test. In README_DELTA, add the relief exception to the existing Plausibilitaetspruefung (Route) bullet (replace op) instead of / in addition to the new bullet. Round crossTrackRatio cleanly.

ITERATION_HINT: likely-fixable

## Outcome

legPlausible (src/server/modules/airspace/route-service.ts) lifts the corridorMaxKm cap when track deviation to the leg destination <= capReliefHeadingDeg (default 20, 0 = off) and cross-track/origin distance <= capReliefCrossTrackRatio (default 0.4); requires trackDeg, altitude above minHeadingCheckAltitudeM and outside both airport zones; detoured legs unchanged. New zod-validated config keys (0..180 / 0..1), config.example.yaml and README documented. scripts/route-why.src.mjs corridor line shows capRelief (applied, deviation, rounded ratio); against TOM16Y data it reports hexdb PLAUSIBLE. Tests in tests/unit/server/route-plausibility.test.ts include TOM16Y with/without relief, no track, a constructed near-Manchester position rejected by the default ratio gate (passes without it), EWG16Y rejected. npm test and typecheck green.
