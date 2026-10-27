---
id: airspace-hw8f9
title: Flugphasen-Prüfung nur unterhalb der Reiseflughöhe, ab 5 m/s und erst 400 km vom Flughafen; Turbulenz und Stufen-Sinkflug nicht als Anflug werten
status: todo
type: bug
context: airspace
created: 2026-10-27
completed:
depends_on: [airspace-prwpv]
blocks: []
tags: [routes, plausibility, live-test]
related_adrs: [0005, 0016]
related_research: []
prior_art: [airspace-p8w2k, airspace-prwpv]
---

## Why
Live-Test 2026-10-27 19:23 Uhr (Oberweyer): LZB407 (Bulgaria Air, Sofia → Brüssel) kannten hexdb, adsbdb und VRS richtig; Korridor (69 km, Grenze 135 km) und Kurs (278° bei Peilung 283°) passten. Abgelehnt hat die Flugphasen-Prüfung: Sinkflug mit 11,7 m/s in FL314 (9578 m), 280 km vor Brüssel, Grenze `maxClimbDistanceKm` 250. Im Reiseflug entstehen solche Vertikalraten durch Turbulenzen und Stufen-Sinkflüge (ATC leitet Sinkflüge oft früh und in Stufen ein), ohne dass ein Anflug beginnt. Entscheidung des Betreibers: beim Sinkflug nicht nur die Rate, sondern auch die Höhe betrachten.

## What
Steig- bzw. Sinkflug zählt für die Phasenprüfung in `isPlausibleRoute` nur, wenn alle drei Bedingungen gelten:
1. Höhe unter `phaseMaxAltitudeM` (Default 8000 m). Darüber keine Phasenprüfung — dort sind Vertikalraten Reiseflug-Rauschen oder Stufenwechsel.
2. Vertikalrate über `phaseMinRateMs` (Default 5 m/s statt bisher 2,5; Turbulenz von ±2,5 m/s fällt heraus).
3. Distanz zum Abflughafen (Steigflug) bzw. Zielflughafen (Sinkflug) größer als `maxClimbDistanceKm`, Default 250 → 400 km.
Alle drei konfigurierbar unter `sources.route.plausibility`, per zod validiert, in `config.example.yaml`, README und BC-README (Delta) dokumentiert. Kurs-, Korridor- und Höhenprofil-Prüfung bleiben unverändert. EWG9YV (Steigflug in FL350, 355 km von Split) bleibt über Höhenprofil und Kurs abgelehnt; der bestehende Phasen-Test wird auf einen Fall unter 8000 m umgestellt. Baut auf prwpv auf (gleiche Datei/Config-Block), daher `depends_on`.

## Acceptance criteria
- [ ] LZB407-Fall (Sofia–Brüssel, Position 50.53/7.75, Kurs 278, 9578 m, −11,7 m/s, 280 km vor Brüssel) ist plausibel.
- [ ] Derselbe Fall in 4000 m mit −11,7 m/s 450 km vor dem Ziel: abgelehnt. 4000 m mit −2 m/s (unter `phaseMinRateMs`): plausibel. 9000 m mit −11,7 m/s 450 km vor dem Ziel (über `phaseMaxAltitudeM`): plausibel. 4000 m mit −11,7 m/s 300 km vor dem Ziel (unter 400 km): plausibel.
- [ ] Steigflug spiegelbildlich gegen den Abflughafen getestet (unter 8000 m, > 5 m/s, > 400 km → abgelehnt; je eine Bedingung nicht erfüllt → plausibel).
- [ ] Bestehende Fälle bleiben: EWG9YV, EWG16Y, DLH7PP (München–Danzig) abgelehnt; LHX1979, AUA166D, DLH400, CTN4456 plausibel.
- [ ] Defaults 8000 m / 5 m/s / 400 km validiert und dokumentiert; `npm run typecheck`, `npm test`, Playwright chromium grün; keine FlightAware-Aufrufe im Live-Code.

## Notes
Captured via `modeling` on 2026-10-27 direkt nach todo (Entscheidung des Betreibers liegt vor). Getrennt von prwpv angelegt, weil prwpv bereits in Arbeit war.
