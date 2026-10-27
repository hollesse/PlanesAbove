---
id: airspace-prwpv
title: Abgelehnte Routen je Takt gegen die aktuelle Position neu prüfen statt 10 Minuten negativ zu cachen; Korridor auf 50 km + 8 % lockern
status: done
type: bug
context: airspace
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [routes, plausibility, live-test]
related_adrs: [0005, 0016]
related_research: []
prior_art: [airspace-p8w2k, airspace-w3k8d, airspace-r5n3k]
---

## Why
Live-Test 2026-10-27 19:16 Uhr (Oberweyer): CTN4456 (Croatia Airlines, Zagreb → Brüssel, hexdb korrekt) wurde bei der ersten Abfrage abgelehnt, weil der Querabstand zur Großkreislinie Zagreb–Brüssel mit ca. 101–104 km knapp über der Grenze 50 km + 5 % × 1029 km = 101,5 km lag. Eine Minute später lag der Flieger bei 96 km, also im Korridor — die Ablehnung war aber als „Route unbekannt“ 10 Minuten negativ gecacht (`negativeTtlMinutes`), die richtige Route blieb bis ca. 19:27 Uhr unsichtbar. Zwei Ursachen: (1) eine Ablehnung wegen Position ist kein „keine Quelle kennt den Flug“, die Position ändert sich jeden Takt; (2) bei langen Legs liegt der reale Flugweg (Luftstraßen über Knotenpunkte) oft 100 km und mehr neben dem Großkreis, 5 % sind dafür knapp.

## What
- **Quellantworten und Plausibilitätsurteil trennen.** `RouteService` merkt sich die von einer Quelle gelieferte Route (mit Quelle, im Speicher, TTL wie positive Treffer `cacheTtlHours`) auch dann, wenn sie bei dieser Position unplausibel war. In jedem folgenden Takt wird die Plausibilität gegen die aktuelle Position/Beobachtung neu bewertet, **ohne** die Quelle erneut zu fragen. Wird eine gemerkte Route plausibel, wird sie angezeigt und als `hit` (chosen) in `route_lookups` gezählt. Keine zusätzlichen Netzaufrufe gegenüber heute (hexdb/adsbdb werden pro Callsign weiterhin höchstens einmal je TTL gefragt).
- **Negativ-Cache nur für echtes Unbekannt.** `negativeTtlMinutes` gilt nur, wenn jede Quelle `unknown` geantwortet hat. Ein Lookup, bei dem mindestens eine Quelle eine (abgelehnte) Route lieferte, wird nicht negativ gecacht. `unavailable` bleibt wie bisher ungecacht.
- **Statistik:** die erste Ablehnung bleibt als `rejected` in `route_lookups`; eine spätere Umbewertung aus dem Speicher schreibt einen eigenen Lookup-Datensatz mit `hit`/`chosen` für die Quelle (fresh = true), damit `stats:routes` zeigt, wie viele Routen erst im Verlauf plausibel wurden. Kein Routentext, keine Codes (ADR 0016).
- **Korridor lockern:** Default `corridorPercent` 5 → 8 (Config `sources.route.plausibility.corridorPercent`, `config.example.yaml`, README, BC-README-Delta). Belege im Task: CTN4456 (1029 km Leg: Grenze 132 km statt 101,5) wird plausibel; EWG16Y Stuttgart–Larnaca (Querabstand 212 km, Grenze dann 252 km!) — **prüfen**: mit 8 % würde EWG16Y nur noch durch Kurs/Flugphase/Höhenprofil abgelehnt (Steigflug 210 km von Stuttgart: Höhenprofil 600 + 120 × 210 = 25 800 m greift nicht; Kurs: Richtung Larnaca ≈ 125°, realer Kurs CGN→VIE ≈ 110–120° — knapp). Daher Alternative in den Tests gegeneinander abwägen: 50 km + 8 % **gedeckelt bei 150 km** (`corridorMaxKm`, Default 150). Damit CTN4456 (Grenze 132) drin, EWG16Y (212) draußen, DLH7PP über München–Danzig (349) draußen. Ergebnis der Abwägung als Default festhalten.
- Keine Änderung an Kurs-, Phasen- und Höhenprofil-Prüfung.

## Acceptance criteria
- [ ] Test (FakeClock, injizierter fetch, Fixture CTN4456 oder konstruierte Route Zagreb–Brüssel): Takt 1 Position mit Querabstand knapp über der Grenze → `rejected`, keine Anzeige; Takt 2 (30 s später) Position im Korridor → Route angezeigt, Quelle **nicht** erneut gefragt (fetch-Zähler unverändert), `route_lookups` enthält einen neuen `hit`/`chosen`-Datensatz für die Quelle.
- [ ] Test: alle Quellen `unknown` → weiterhin negativ gecacht für `negativeTtlMinutes` (Quelle im nächsten Takt nicht gefragt). Test: eine Quelle `rejected`, Rest `unknown` → kein Negativ-Cache, aber auch kein erneuter Netzaufruf innerhalb der TTL.
- [ ] Test: gemerkte abgelehnte Route läuft nach `cacheTtlHours` ab und die Quelle wird danach wieder gefragt.
- [ ] Korridor-Default: Test mit den realen Fällen — CTN4456 (Zagreb–Brüssel, Position 50.48/8.24, Kurs 279, FL320) plausibel; EWG16Y (STR–LCA, Oberweyer) abgelehnt; DLH7PP (München–Danzig, Oberweyer) abgelehnt; LHX1979 CGN–MUC, AUA166D DUS–VIE, DLH400 weiterhin plausibel. Default-Werte (`corridorPercent`, ggf. `corridorMaxKm`) per zod validiert, in `config.example.yaml`, README und BC-README dokumentiert.
- [ ] `stats:routes` weist Umbewertungen nicht gesondert aus, zählt sie aber korrekt als `hit` der jeweiligen Quelle; `route_lookups` enthält keinen Routentext und keine Flughafencodes (bestehender Scan-Test bleibt grün).
- [ ] `npm run typecheck`, `npm test`, Playwright chromium grün; keine FlightAware-Aufrufe im Live-Code.

## Notes
Captured via `modeling` on 2026-10-27 after the CTN4456 live finding; direkt nach todo, da Entscheidungen des Betreibers vorliegen (abgelehnte Routen je Takt neu prüfen, Korridor lockern). Der Worker entscheidet zwischen „8 % ohne Deckel“ und „8 % mit Deckel 150 km“ anhand der Tests oben und hält das Ergebnis im Outcome fest; wenn EWG16Y mit 8 % ohne Deckel plausibel würde, ist der Deckel Pflicht. FlightAware (lastResort) darf durch die Umbewertung nie zusätzlich gefragt werden.

## Verifier note (iteration 1)
REASONS:
- Check 1 (acceptance criteria): criterion 4 requires the defaults (`corridorPercent`, `corridorMaxKm`) documented in the BC README too; `readmeDelta` is `[]`.
- Check 5 (BC README sync): the BC README bullet `**Plausibilitaetspruefung (Route)**` (line 36) still reads "corridorBaseKm 50 + corridorPercent 5 % of leg length"; stale after this change (8 % with `corridorMaxKm` 150 cap). It also does not mention that a rejected route is remembered and re-judged every tick.
- Everything else holds: npm test 406 passed, typecheck clean; criteria 1-3 and the corridor cases (incl. the "cap is required" test) are covered; recordLookup is called when fresh && attempts.length, so re-evaluation writes a route_lookups record; no scope creep.
- Playwright (note only): `npm run e2e:chromium` has no `pretest` build hook; `storybook-static/` is missing in a fresh worktree, hence the webServer timeout. Run `npm run build-storybook` (or `npm run e2e -- --project=chromium`) first.
SUGGESTED_FIX: Return a non-empty README_DELTA with a `replace` op on the airspace BC README bullet `**Plausibilitaetspruefung (Route)**`: "corridorBaseKm 50 + corridorPercent 8 % of leg length, capped at corridorMaxKm 150"; add that a rejected route is remembered for cacheTtlHours and re-judged against the current position each tick without asking the source again, and that a later plausible re-evaluation counts as a `hit` (chosen) in route_lookups. If possible run Playwright chromium after `npm run build-storybook` and record the result in the Outcome.
ITERATION_HINT: likely-fixable

## Outcome

Rejected routes (a source delivered a route, but it failed plausibility at the current position) are now remembered in memory for cacheTtlHours and re-judged each tick against the current position without asking the source again; once plausible they are shown and counted as a `hit` (chosen) in `route_lookups`. The negative cache (negativeTtlMinutes) applies only when every source answered unknown. The corridor is widened to 50 km + 8 % of leg length (`sources.route.plausibility.corridorPercent`) with a mandatory cap `corridorMaxKm` 150 km. Measured: EWG16Y at 212 km cross-track would pass uncapped (~282 km limit) but is rejected with the cap; CTN4456 ~100 km cross-track, limit 132 km, plausible; DLH7PP still rejected; LHX1979, AUA166D, DLH400 still plausible. 7 tests in tests/unit/server/route-plausibility.test.ts. Key files: src/server/modules/airspace/route-service.ts, src/server/config.ts, config.example.yaml, README.md.

Verification: npm test 406/406 green, npm run typecheck green, build-storybook succeeded. `npm run e2e:chromium`: 5 passed, 6 failed in tests/e2e/skeleton.spec.ts, all with "Cannot find module dist/server/server.mjs" (no server build in the worktree: environment, not related to this change).
