---
id: airspace-w1q3x
title: hexdb und VRS immer beide fragen; eine VRS-Mehrleg-Route, deren Endstück zur hexdb-Route passt, gewinnt (Startflughafen bei Zwischenlandungen)
status: doing
type: feature
context: airspace
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [route, hexdb, vrs, multi-leg, conflict]
related_adrs: [0016, 0021]
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
