---
id: airspace-w1q3x
title: hexdb und VRS immer beide fragen; eine VRS-Mehrleg-Route, deren Endstück zur hexdb-Route passt, gewinnt (Startflughafen bei Zwischenlandungen)
status: done
type: feature
context: airspace
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [route, hexdb, vrs, multi-leg, conflict]
related_adrs: [0016, 0021, 0023]
related_research: []
prior_art: [airspace-w3k8d, airspace-r5n3k]
---

## Why
Befund UPS1 am 2026-10-27 (Boeing 747-8F, Sinkflug auf Köln/Bonn): hexdb kannte nur das letzte Leg Sharjah → Köln, der VRS-Snapshot die ganze Kette Hongkong → Sharjah → Köln. Beide Routen sind plausibel. Weil hexdb in der Reihenfolge vorn steht und bei der ersten plausiblen Route Schluss ist, wurde VRS nie gefragt, und der Steckbrief verlor den eigentlichen Startflughafen. hexdb führt bei Zwischenlandungen systematisch nur das aktuelle Segment; das trifft Frachtflüge (UPS, FedEx, Cargolux) und Langstrecken mit Tankstopp regelmäßig.

VRS ist ein lokaler Snapshot. Ihn zusätzlich zu befragen kostet keinen Netzwerk-Request; nur hexdb und adsbdb gehen live raus. Nebeneffekt: VRS ist CC0, der Routentext darf persistiert werden (hexdb nicht, ADR 0016), also bekommt jede so gewählte Sichtung auch eine lesbare Route im Sichtungslog und in `stats:routes`.

Die bestehende Option `compareAll` löst das nicht: Sie fragt alle Quellen inklusive adsbdb (Requests) und wählt trotzdem strikt nach Reihenfolge.

## What
Im `RouteService` (`src/server/modules/airspace/route-service.ts`) eine Zusammenführungsregel zwischen hexdb und VRS:

1. **hexdb und VRS werden bei jedem Lookup beide gefragt**, unabhängig von `compareAll`. adsbdb bleibt Fallback nur, wenn beide `unknown`/`unavailable` liefern (oder deren Routen abgelehnt sind). FlightAware bleibt letzte Stufe wie bisher (ADR 0018). Reihenfolge in `sources.route.order` bleibt die Konfliktpriorität.
2. **Ergänzung (VRS gewinnt):** Sind beide plausibel und ist die hexdb-Route ein Endstück der VRS-Route (gleicher Zielflughafen, hexdb-Startflughafen ist ein Zwischenstopp der VRS-Route, die Reihenfolge der Legs stimmt), wird die VRS-Route gewählt. `route_source = 'vrs'`, Routentext wird persistiert. In `route_lookups` wird hexdb als `hit` (nicht gewählt) und vrs als `hit*` festgehalten; das ist kein Konflikt.
3. **Echter Konflikt (hexdb gewinnt):** Widersprechen sich die beiden (anderes Ziel, oder der Start ist kein Zwischenstopp), bleibt die erste Quelle der Reihenfolge vorn, Konflikt-Flag wie bei `compareAll`.
4. Nur eine plausibel: die plausible gewinnt (bereits heute so, nur dass VRS jetzt immer befragt wird).
5. Identische Routen (gleiche ICAO-Legs): hexdb bleibt gewählt, kein Konflikt; VRS-Treffer wird weiter wie bisher beim späteren Takt zum Persistieren genutzt (bestehende Upgrade-Regel aus ADR 0016 bleibt).
6. `config.example.yaml` und Root-README (Abschnitt Routenquelle) um die Regel ergänzen; `compareAll` bleibt erhalten und bedeutet weiterhin „auch adsbdb immer fragen".
7. airspace-README: Ubiquitous-Language-Eintrag „Routenquelle" um die Zusammenführungsregel ergänzen; ADR-0016-Amendment oder kleiner neuer ADR, falls der Worker die Konfliktregel als Entscheidung festhält.

Nicht Teil des Tasks: Reihenfolge der Quellen ändern; adsbdb in die Zusammenführung einbeziehen; Endstück-Erkennung über Flughafennamen statt ICAO-Codes.

## Acceptance criteria
- [ ] Unit-Test mit dem UPS1-Fall: hexdb liefert `OMSJ → EDDK`, VRS liefert `VHHH → OMSJ → EDDK`, Position im Sinkflug nahe Köln; gewählt wird die VRS-Route mit drei Legs, `route_source = 'vrs'`, Anzeige „Hongkong (HKG) → Sharjah (SHJ) → Köln (CGN)" gemäß Flughafen-Tabelle.
- [ ] Unit-Test echter Konflikt: hexdb `EGLL → EDDK`, VRS `VHHH → OMSJ → EDDK`, beide plausibel; gewählt wird hexdb, `route_lookups` trägt das Konflikt-Flag.
- [ ] Unit-Test Endstück nicht ganz hinten: hexdb `VHHH → OMSJ`, VRS `VHHH → OMSJ → EDDK`; das ist kein Endstück, es gilt die Konfliktregel (hexdb vorn, Konflikt-Flag).
- [ ] Unit-Test: VRS wird auch dann befragt, wenn hexdb eine plausible Route lieferte und `compareAll: false` ist; adsbdb wird in diesem Fall nicht befragt (Fake-Quelle zählt Aufrufe).
- [ ] Unit-Test: hexdb `unknown`, VRS Treffer → VRS wie bisher; hexdb Treffer, VRS `unknown` → hexdb wie bisher; beide `unknown` → adsbdb wird befragt.
- [ ] `route_lookups` enthält für den UPS1-Fall hexdb als `hit` (nicht gewählt, kein Konflikt) und vrs als gewählt; `npm run stats:routes` zählt die Sichtung unter Quelle `vrs`.
- [ ] `scripts/route-why.mjs` zeigt bei einem Endstück-Fall die Zusammenführung an („VRS-Mehrleg-Route gewählt, hexdb-Leg ist Endstück"), damit die Diagnose den Grund nennt.
- [ ] Root-README und `config.example.yaml` beschreiben die Regel; airspace-README-Eintrag „Routenquelle" ergänzt; `npm test`, `npm run typecheck`, `npm run build` grün.

## Notes
- Diagnose vom 2026-10-27 mit `npm run why:route -- UPS1`: hexdb `hit Sharjah → Cologne Bonn`, adsbdb `unknown`, vrs `hit Hong Kong → Sharjah → Cologne`, beide PLAUSIBLE (Iran-Umleitung, Korridor übersprungen). Keine Routendaten von hexdb hier als Tabelle übernehmen (Lizenz); Städte nennen ist in Ordnung.
- Einstiegspunkt: `RouteService` Konstruktor-Option `compareAll` und die Schleife über die Quellen (`route-service.ts` um Zeile 120–135, `lastResort`-Guard beachten).
- Endstück-Vergleich über ICAO-Codes der Legs (`AirportCodes`), nicht über Anzeigetext; die Flughafen-Tabelle (ADR 0021) formatiert erst danach.
- Die Upgrade-Regel aus ADR 0016 (späterer VRS-Takt ersetzt hexdb-Befund derselben Sichtung) bleibt unverändert; neu ist nur, dass der Vergleich bereits im selben Takt stattfindet.

## Verifier note (iteration 1)
**REASONS:**
- Criterion 5 / What #1 not met with the default order `[hexdb, adsbdb, vrs]`: the pair logic in `route-service.ts` (the `wanted`/PAIR block) only fires after a hexdb or vrs *hit*. When hexdb returns `unknown`/`unavailable`/`rejected`, the loop goes on to adsbdb (a live request); if adsbdb hits, `break` runs and VRS is never asked. Reproduced: hexdb=null, adsbdb=OMSJ→EDDK, vrs=VHHH→OMSJ→EDDK, compareAll=false → chosen adsbdb, vrs calls 0.
- `tests/unit/server/route-merge.test.ts` ("hexdb unknown -> vrs") hides this by building the service with only `[hexdb, vrs]`, without adsbdb.
- Criterion 6 (`route_lookups` holds hexdb as `hit` not chosen, no conflict; vrs chosen; `stats:routes` counts under `vrs`) has no test; nothing goes through the persistence path (`sighting-log/repository.ts`, `route-stats.ts`).
- Minor: criterion 1 asks for "Hongkong (HKG) → Sharjah (SHJ) → Köln (CGN)" from the airport table; the test asserts "Hong Kong … Cologne" from fixture city fields. Confirm the airport table (ADR 0021) renders the German names or put them into the test. The UPS1 test sets no descent (`verticalRateMs`) although the criterion says "im Sinkflug".
- Not run (stopped at first failing check): npm test, typecheck, build, checks 2-8.

**SUGGESTED_FIX:** When hexdb or vrs gives no plausible hit, ask its partner (vrs or hexdb) before any non-pair source (adsbdb) whatever the configured order, so adsbdb is only asked when both have nothing (or with compareAll). Add a test with the default order `[hexdb, adsbdb, vrs]` checking call counts (vrs asked, adsbdb not). Add a test recording the UPS1 lookup through the repository into `route_lookups` and checking the rows and the `stats:routes` attribution to `vrs`.

**ITERATION_HINT:** likely-fixable

## Verifier note (iteration 2)
**REASONS:**
- Check 5 (README sync) / criterion 8: `readmeDelta` only appends a new bullet "Zusammenfuehrungsregel hexdb/VRS" and leaves the existing **Routenquelle (RouteSource)** bullet (airspace README line 22) unchanged. That bullet still says "die erste plausible Route der Kette gewinnt (spaetere Quellen nur bei unknown/rejected/unavailable)", which the diff makes false (partner always asked, VRS can win over an earlier hexdb hit, partner pulled ahead of configured order, hexdb/VRS conflicts recorded without compareAll). Applied as-is the README would contradict itself.
- Everything else checked out: partner-first with default order, persistence-path test via SightingRepository.recordLookup + routeStats, UPS1 in descent with the real airport table ("Hong Kong"/"Cologne" accepted as "gemäß Flughafen-Tabelle"), lastResort guard intact, compareAll intact. npm test 484 passed, typecheck + build exit 0. No .agentheim paths in the diff.

**SUGGESTED_FIX:** Add a `replace` op to readmeDelta (anchor "Routenquelle") keeping the bullet in step with the new behaviour: replace "die erste plausible Route der Kette gewinnt" with the hexdb/VRS pair exception (both always asked, VRS multi-leg tail match wins, conflicts recorded), pointing to the new ADR. The separate Zusammenfuehrungsregel bullet can stay. No code changes needed.

**ITERATION_HINT:** likely-fixable


## Outcome

Implemented the hexdb/VRS merge rule in `route-service.ts` (`isLegTail`, partner-first queue: a hexdb/vrs source without a plausible hit pulls its partner to the front, so adsbdb is asked only when both have nothing, in the default order [hexdb, adsbdb, vrs] too; chosen = VRS on tail match, conflict computed excluding the tail pair; lastResort guard intact). `scripts/route-why.src.mjs` prints "VRS-Mehrleg-Route gewählt, hexdb-Leg ist Endstück". README and `config.example.yaml` document the rule. Tests in `tests/unit/server/route-merge.test.ts`: UPS1 (in descent, real airport table; the table's city names are "Hong Kong"/"Cologne", so the display is "Hong Kong (HKG) → Sharjah (SHJ) → Cologne (CGN)" per ADR 0021 data, not the criterion's German spelling), real conflict, non-tail, call counts, default-order partner-first (hexdb unknown/unavailable/rejected -> vrs asked, adsbdb 0 calls), vrs nothing -> hexdb, both nothing -> adsbdb once, and UPS1 through SightingRepository.recordLookup into route_lookups (hexdb hit not chosen, vrs chosen, no conflict) plus routeStats attributing the sighting to vrs. ADR 0023 proposed (provisional 0022, renumbered at integration). The airspace README's existing Routenquelle entry was aligned with the new rule (replace op) so it no longer claims that the first plausible route of the chain always wins. npm test, typecheck, build green.
