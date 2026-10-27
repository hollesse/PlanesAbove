---
id: airspace-p8w2k
title: Plausibilitätsprüfung schärfen: Kurs und Flugphase gegen die Route prüfen, nur fern von Start- und Zielflughafen; engerer Korridor per Querabstand
status: backlog
type: feature
context: airspace
created: 2026-10-27
completed:
depends_on: [airspace-r5n3k]
blocks: []
tags: [routes, plausibilitaet, live-test]
related_adrs: [0005, 0016]
related_research: [route-coverage-sources-2026-10-27]
prior_art: [airspace-r5n3k, airspace-m3w9c]
---

## Why
Am 2026-10-27 passierten zwei falsche Routen (umgewidmete Eurowings-Flugnummern bei adsbdb) den Korridor-Check und wurden vorgelesen: EWG16Y "Stuttgart → Larnaca" (wirklich Köln → Wien; 134 km neben der Linie, Ellipse zu weit) und EWG9YV "Split → Köln" (wirklich Düsseldorf → München; Flugzeug fliegt Kurs 140°, die Route verlangt 305°, exakt entgegengesetzt). Die heutige Prüfung in `isPlausibleRoute` nutzt nur Position gegen eine Ellipse (Summe der Teilstrecken ≤ Länge × 1,25 + 150 km) und ignoriert Kurs und Flugphase, obwohl beide im Modell vorliegen (`Flugzeug.track`, `verticalRateMs`, `altitudeM`).

## What
- `isPlausibleRoute` erhält zusätzlich Beobachtungsdaten: `track`, `verticalRateMs`, `altitudeM` (vom Takt aus dem `Flugzeug` übergeben; bei fehlendem `track`, z. B. MLAT, entfällt die Richtungsprüfung).
- **Schutzzone um die Flughäfen (Betreiber-Entscheidung):** Kurs- und Phasenprüfung laufen nur, wenn das Flugzeug weiter als `plausibility.airportZoneKm` (Default 50) sowohl vom Abflug- als auch vom Zielflughafen der geprüften Route entfernt ist. Innerhalb der Zone zählt nur der Korridor, weil Abflug- und Anflugrouten in alle Richtungen führen.
- **Richtung:** Peilung vom Standort zum nächsten Zwischenziel/Ziel der Route gegen `track`; Abweichung über `plausibility.maxHeadingDeviationDeg` (Default 65) → Route unbekannt.
- **Flugphase:** Steigflug (`verticalRateMs` > ca. 2,5 m/s ≈ 500 ft/min) bei Abstand zum Abflughafen > `plausibility.maxClimbDistanceKm` (Default 250) → unbekannt; Sinkflug analog gegen das Ziel.
- **Engerer Korridor:** Querabstand (Cross-Track) zur Großkreislinie statt Ellipse: erlaubt `corridorBaseKm` (Default 50) + `corridorPercent` (Default 5) × Streckenlänge; Mehrleg-Routen je Leg, plausibel wenn ein Leg passt.
- Alle Schwellen in `config.yaml` unter `sources.route.plausibility`, validiert, mit Defaults.
- `route_lookups` zählt die Ablehnung weiter als `rejected` (Statistik aus sighting-log-m7p2v zeigt den Effekt).

## Acceptance criteria
- [ ] Testfall EWG9YV (Split–Köln, Position Oberweyer, Kurs 140°, Reiseflug): abgelehnt wegen Richtung.
- [ ] Testfall EWG16Y (Stuttgart–Larnaca, Position Oberweyer, Steigflug +12 m/s, 210 km von Stuttgart): abgelehnt wegen Querabstand (134 km > 50 + 5 % × 2521) und/oder Phase.
- [ ] Positivfälle bleiben plausibel: LHX1979 Köln–München, AUA166D Düsseldorf–Wien, DLH400 Frankfurt–New York (Steigflug 60 km von Frankfurt, innerhalb der Schutzzone → nur Korridor).
- [ ] Schutzzone: ein Flugzeug 30 km vom Abflughafen mit Kurs 180° gegen eine Route Richtung 0° wird NICHT abgelehnt (Zone), dasselbe 80 km entfernt schon.
- [ ] Fehlender `track` oder `verticalRateMs`: nur Korridor-Prüfung, keine Ablehnung aus Richtung/Phase.
- [ ] Mehrleg-Route: plausibel, wenn ein Leg alle Prüfungen besteht.
- [ ] Config-Validierung aller Schwellen (positive Zahlen, Grad 0–180); Defaults wie oben.
- [ ] Ablehnungen erscheinen als `rejected` in `route_lookups` und in `npm run stats:routes`.
- [ ] `npm run typecheck` und `npm test` grün.

## Notes
- Betreiber-Entscheidung 2026-10-27: Kurs/Phase nur prüfen, wenn weit genug vom Start- und Zielflughafen entfernt. Research route-coverage-sources-2026-10-27 §2 (eigene Beobachtung als Schiedsrichter).
- Messungen 2026-10-27 (Oberweyer 50.45/8.09): EWG9YV track 140°, alt 35000 ft, vrate −64; EWG16Y track 113°, alt 26225 ft, vrate +2496 ft/min. Cross-Track STR–LCA 134 km, CGN–VIE 20 km, SPU–CGN 17 km, DUS–MUC 10 km.
- Nebeneffekt: Quote "Route bekannt" sinkt leicht, Vorlesefehler sinken deutlich. Konflikt-Schiedsrichter für hexdb (airspace-w3k8d) kann dieselben Prüfungen nutzen.
