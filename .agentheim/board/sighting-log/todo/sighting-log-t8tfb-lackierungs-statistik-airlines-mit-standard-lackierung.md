---
id: sighting-log-t8tfb
title: Lackierungs-Statistik „npm run stats:liveries“: welche Airlines wie oft mit der Standard-Lackierung gezeigt wurden, weil kein Design oder keine Zuordnung vorlag
status: todo
type: feature
context: sighting-log
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [stats, liveries]
related_adrs: [0010, 0007]
related_research: []
prior_art: [sighting-log-m7p2v]
---

## Why
Papa zeichnet Lackierungen und soll wissen, welche Airlines tatsächlich über dem Haus fliegen, aber weiß gezeichnet werden. Das Sichtungslog hält je Sichtung `livery_present` (0/1) und `airline`, und `unmapped_keys` zählt Präfixe ohne Tabelleneintrag. Es gibt aber keine Auswertung dafür; `stats:routes` zeigt nur Routenquellen.

## What
Neue Auswertung `npm run stats:liveries -- --db <file> [--days N] [--json] [--standort …]` nach dem Muster von `stats:routes` (`scripts/stats-routes.mjs` + `route-stats.ts`): read-only, eigene Datei `src/server/modules/sighting-log/livery-stats.ts` (erasable syntax, kein Runtime-Import), gleiche `--standort`-Semantik.

Ausgabe, nur Sichtungen mit Slot im Fenster:
1. **Airlines mit Standard-Lackierung**: je Airline-Name + Präfix die Anzahl Sichtungen mit `livery_present = 0`, absteigend; Typklassen `light-aircraft` und `glider` ausgenommen (dort gibt es keine Lackierung, ADR 0009). Zusätzlich die Typklassen je Airline (z. B. „Emirates UAE 7 (double-decker 4, widebody 3)“).
2. **Präfixe ohne Airline-Eintrag**: die `unmapped_keys`-Zeilen mit `kind = 'airline'` (Präfix, Anzahl), absteigend. Diese Flugzeuge fallen ebenfalls auf die Standard-Lackierung.
3. **Sichtungen ohne Airline** (callsign ohne Präfix-Muster): nur eine Summenzeile.
4. Kopfzeile mit Anteil „Lackierung vorhanden“ gesamt (present / gesamt ohne light-aircraft/glider).

Die Auswertung sagt nicht, ob der Grund „kein Katalog-Design“ oder „keine Zuordnung“ ist (das Log weiß das nicht); nach airspace-f9cjz bleiben nur echte Design-Lücken übrig.

## Acceptance criteria
- [ ] `liveryStats(db, { days, nowMs, standort?, hasPoints? })` liefert `{ airlines: [{ name, prefix, count, byTypklasse }], unmappedPrefixes: [{ prefix, count }], withoutAirline, presentShare }`; Unit-Tests mit einer In-Memory-SQLite (wie `tests/unit` für `route-stats`) decken: Zählung je Airline, Ausschluss von light-aircraft/glider, Ausschluss von Sichtungen ohne Slot, Zeitfenster, `--standort`-Filter, leere Datenbank.
- [ ] `formatLiveryStats` erzeugt die Textform mit den vier Abschnitten; `--json` gibt das Objekt aus.
- [ ] `npm run stats:liveries -- --db data/planesabove.db --days 30` läuft gegen die Betreiber-DB ohne Fehler und nennt SunExpress (SXS) mit ≥ 1 Sichtung (Stand 2026-10-27: 10).
- [ ] Fehlende Tabelle `unmapped_keys` (alte DB) führt nicht zum Absturz, Abschnitt 2 ist dann leer.
- [ ] README des BC: Ubiquitous-Language-Eintrag „Lackierungs-Statistik“ mit dem Befehl, im RESULT gemeldet.

## Notes
- Abgespalten aus design-system-t6wz4 beim Refine am 2026-10-27 (Statistik-Teil gehört in dieses BC).
- Stand 2026-10-27 in `data/planesabove.db`: SunExpress 10, Emirates 7, Qatar 4, United 4, Cathay Pacific 3, je 1 Cargolux, DHL Air, Etihad, Icelandair, Lufthansa Cargo, Singapore; unmapped: EXS 17, KLC 13, LHX 10, OCN 9, TKJ 8, CAI 5, NJE 4, CXI 4, AEE 4, CCA 4, VIR 4.
- Unabhängig von airspace-f9cjz lauffähig; sinnvoll erst nach dessen Merge zu lesen.
