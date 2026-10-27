---
name: route-why
description: Diagnose why PlanesAbove showed "Route unbekannt" (or a wrong route) for a flight. Use when the user asks "wieso gibt es für <CALLSIGN> keine Route", "warum wurde die Route abgelehnt", "was ist mit <CALLSIGN>" or names a callsign with a route problem. Runs scripts/route-why.mjs and interprets the result.
---

# route-why — Warum hat ein Flug keine (oder eine falsche) Route?

Lauf `node scripts/route-why.mjs <CALLSIGN>` (optional `--json`). Das Skript macht genau das, was bei der Diagnose bisher von Hand nötig war:

1. **SQLite** (`data/planesabove.db`, read-only): die letzten Sichtungen des Callsigns und je Sichtung die `route_lookups`-Befunde (`hexdb=rejected adsbdb=unknown vrs=hit*`; `*` = gewählt, `!` = Konflikt).
2. **Live-Position** von adsb.fi (eine Anfrage, 250 km um den Standort). Ist der Flieger weg, Position aus dem Server-Log oder der Datenbank nachreichen: `--lat --lon --alt-m --track --rate-ms` (Meter, Grad, m/s).
3. **Quellen jetzt**: hexdb, adsbdb (je eine Anfrage, nichts wird gespeichert) und der VRS-Snapshot, in der Reihenfolge aus `config.yaml`. FlightAware wird **nie** aufgerufen.
4. **Plausibilität** je gefundener Route: Gesamturteil aus `isPlausibleRoute` (die Produktionsregel) plus Aufschlüsselung je Leg: Korridor (Querabstand vs. Grenze), Höhenprofil (Hüllkurven), Flugphase, Kurs. Grenzwerte kommen aus `config.yaml` → `sources.route.plausibility`, sonst Defaults.

## Ergebnis einordnen

| Befund | Bedeutung | Typische Antwort |
|---|---|---|
| alle Quellen `unknown` | Callsign unbekannt; oft alphanumerische Callsigns (THY8EF, EXS75F) oder Charter/Ferry | Nur FlightAware könnte helfen (Freigabe des Betreibers nötig, Anzahl Anfragen vorher nennen) |
| `hit`, aber `REJECTED` mit `corridor: FAIL` | Flieger weit neben dem Großkreis | Umleitung (Luftraumsperrung, Wetter) oder falsche Route in der Quelle; Querabstand und Routenlänge prüfen |
| `REJECTED` mit `altitudeProfile: FAIL` | zu hoch für die Entfernung vom Start-/Zielflughafen | Route stimmt wahrscheinlich nicht (Quelle veraltet, Flugplanwechsel), oder Abflugroute viel länger als Luftlinie |
| `REJECTED` mit `phase: FAIL` | Steig-/Sinkflug weit weg vom Flughafen | Stufen-Sinkflug oder Quelle falsch |
| `REJECTED` mit `heading: FAIL` | Kurs zeigt nicht Richtung Ziel | Quelle falsch (häufig Sommer-/Winterflugplan) oder große Umleitung |
| Quellen unterschiedlich, eine `PLAUSIBLE` | Konflikt; erste plausible Quelle in der Kette gewinnt | hexdb ist meist aktueller als adsbdb/VRS |
| SQLite `rejected`, jetzt `PLAUSIBLE` | Grenzfall zum Zeitpunkt der Sichtung (prwpv prüft abgelehnte Routen jeden Takt neu) | nichts zu tun, oder Grenzwert diskutieren |

## Regeln

- Keine Routendaten von hexdb/adsbdb persistieren oder in Tickets als Tabelle übernehmen (Lizenz, ADR 0005/0016). Städte nennen ist in Ordnung.
- Grenzwerte nicht spontan im Code ändern. Ergebnis erklären, dann bei Bedarf einen airspace-Task über `modeling` anlegen (Vorbilder: airspace-p8w2k, prwpv, hw8f9, v4kqz).
- Läuft der Service mit altem Build, erst `npm run build` und Neustart prüfen, bevor man einen Regelfehler vermutet (`buildId` im Server-Log vs. `git log`).
- Wenn das Skript nicht baut, zuerst `npm run assets` ausführen und sicherstellen, dass `node_modules` vorhanden ist (das Skript bündelt die TypeScript-Module mit esbuild nach `node_modules/.cache/planesabove/`).
