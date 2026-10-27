---
id: sighting-log-k4m7q
title: Beobachtungsstandort je Sichtung mitloggen (Tabelle observation_points, Standortwechsel beendet den Besuch, Statistik je Standort)
status: done
type: feature
context: sighting-log
created: 2026-10-27
completed:
depends_on: []
blocks: []
tags: [statistik, live-test, migration]
related_adrs: [0007]
related_research: []
prior_art: [sighting-log-m7p2v]
---

## Why
Live-Test am 2026-10-27: Die Datenbank enthielt Sichtungen vom Frankfurt-Beispielstandort und vom echten Standort Oberweyer nebeneinander, ohne dass man sie unterscheiden kann. Wird der Standort in `config.yaml` angepasst, vermischen sich Statistiken und Abstände. Beobachtet: Beim Neustart mit neuem Standort wurde der laufende Besuch QTR85M (closest_distance 4,2 km vom Frankfurter Punkt) weitergeführt, obwohl das Flugzeug nun von Oberweyer aus gesehen wurde.

## What
Jede Sichtung hält fest, von welchem Beobachtungsstandort aus geschaut wurde, damit Auswertungen nach Standort trennbar bleiben und `closest_distance_km` nie zwei Beobachtungspunkte vermischt.

1. **Standort-Identität:** Koordinaten (lat/lon auf 4 Nachkommastellen gerundet) + `radiusKm`. `place` ist nur eine Beschriftung und gehört nicht zur Identität.
2. **Schema (Migration 0006):** neue Tabelle `observation_points(id, lat, lon, radius_km, place, first_used_at)` mit `UNIQUE(lat, lon, radius_km)`; `sightings` bekommt die nullable Spalte `observation_point_id REFERENCES observation_points(id)`. Rein additiv, kein Backfill, kein Löschen: bestehende Zeilen behalten NULL („vor Standort-Erfassung").
3. **Repository:** `SightingRepository(db, gapMs, point)` legt den aktuellen Standort beim Start per find-or-create an (`place`-Label wird bei Abweichung aktualisiert, `first_used_at` bleibt). `observe` schreibt `observation_point_id` mit. Hydrate des Dedup nur aus Zeilen mit dem aktuellen Standort; der „Besuch fortsetzen"-UPDATE, `recordLookup` und `latest()` greifen nur auf Zeilen mit dem aktuellen Standort zu. Ein Standortwechsel beendet damit den Besuch: eine neue Zeile entsteht auch innerhalb von `visitGap`.
4. **Verdrahtung:** `app.ts` übergibt `config.location`, `config.radiusKm`, `config.place` an den Konstruktor. airspace / `SkyService` / `SightingInput` bleiben unverändert.
5. **Statistik:** `npm run stats:routes` filtert standardmäßig auf den Standort der neuesten Sichtung; `--standort <id|unbekannt|alle>` überschreibt das. Die Textausgabe beginnt mit dem aktiven Filter und einer Standorte-Übersicht (je Gruppe id, place, lat/lon, Radius, Anzahl angezeigter Sichtungen im Fenster; NULL-Zeilen als Gruppe „unbekannt"). `--json` erhält die Schlüssel `standort` und `standorte` zusätzlich zu den bestehenden.
6. **README:** Begriffe „Beobachtungsstandort" und „Standort unbekannt" ergänzen, „Besuch" um die Standortwechsel-Regel erweitern.

## Acceptance criteria
- [ ] Migration 0006 legt `observation_points` (mit `UNIQUE(lat, lon, radius_km)`) und `sightings.observation_point_id` an und läuft auf einer DB im Stand von Migration 0005 mit vorhandenen Sichtungen ohne Datenverlust; die alten Zeilen haben danach `observation_point_id IS NULL`; `user_version` ist 6; erneuter Start ist idempotent (Test mit Roh-DB, früheren Migrationen und gesetzter `user_version`, dann Reopen).
- [ ] Find-or-create: Zweimal `new SightingRepository(db, gap, pointA)` ergibt genau eine `observation_points`-Zeile; lat/lon werden auf 4 Nachkommastellen gerundet (Eingabe `50.123449` und `50.12341` führen zur selben Zeile); andere Koordinaten oder anderer `radiusKm` ergeben eine zweite Zeile; ein geändertes `place` bei gleichen Koordinaten und gleichem Radius erzeugt keine neue Zeile, sondern aktualisiert nur das Label (`first_used_at` unverändert).
- [ ] Repository-Unit-Test „Standortwechsel beendet den Besuch": Sichtung von icao24 X am Standort A zum Zeitpunkt t0 (`observe` gibt `'new'`), dann ein neues Repository auf derselben DB mit Standort B und `observe` desselben X bei t0 + 1 Min (< `visitGap`) gibt `'new'` und die Tabelle hat zwei Zeilen mit verschiedener `observation_point_id`; `closest_distance_km` der A-Zeile bleibt unverändert, auch wenn B eine kleinere Distanz meldet.
- [ ] Gegenprobe: Neues Repository auf derselben DB mit demselben Standort A und `observe` von X innerhalb von `visitGap` gibt `'seen'` und lässt die Zeilenzahl bei 1 (Hydrate funktioniert für den gleichen Standort); eine Zeile mit NULL-Standort wird nie hydriert (`observe` gibt `'new'`).
- [ ] Jede neu geschriebene Sichtungszeile trägt die `observation_point_id` des aktuellen Standorts; `recordLookup` und `latest()` berücksichtigen nur Zeilen des aktuellen Standorts (Test mit zwei Standorten in derselben DB).
- [ ] Auf dem echten Pfad (`createApp`/SkyService-Test mit Fake-Quelle und `config.location`/`radiusKm`/`place`) enthält die geschriebene Sichtungszeile eine `observation_point_id`, die auf eine `observation_points`-Zeile mit den Config-Werten (Koordinaten gerundet, Radius, place) zeigt.
- [ ] `npm run stats:routes -- --db <seeded.db>` (Seed: zwei Standorte plus NULL-Zeilen, alle mit `slot IS NOT NULL`) filtert standardmäßig auf den Standort der neuesten Sichtung; `--standort <id>` wählt einen Standort, `--standort unbekannt` genau die NULL-Zeilen, `--standort alle` alle Zeilen; Zähler stimmen mit dem Seed überein.
- [ ] Die Textausgabe und `--json` enthalten die Standorte-Übersicht inklusive der Gruppe „unbekannt" mit korrekter Anzahl (JSON-Schlüssel `standort` und `standorte`; die bisherigen Schlüssel `days`, `sources`, `unknown`, `airlines`, `conflicts` bleiben, der Schema-/Snapshot-Test wird erweitert); eine DB ohne `observation_points` (Stand vor 0006) liefert Exit-Code 0 und nur die Gruppe „unbekannt"; ungültiges `--standort` führt zu verständlicher Fehlermeldung und Exit-Code ungleich 0.
- [ ] `npm run typecheck` und die komplette Testsuite sind grün (bestehende Tests mit Zwei-Argument-Konstruktor sind auf den neuen Parameter umgestellt); README-Delta (Beobachtungsstandort, Standort unbekannt, Besuch-Regel) ist vorhanden.

## Notes
Builder-Entscheidungen (Refine 2026-10-27, final, nicht neu öffnen): (1) Standort-Identität = Koordinaten (4 Nachkommastellen) + `radiusKm`, `place` nur Label; (2) ein Standortwechsel beendet den Besuch, `closest_distance_km` mischt nie zwei Beobachtungspunkte; (3) Altzeilen behalten NULL, in der Statistik Gruppe „unbekannt", kein Backfill, kein Löschen.

Form: eigene Tabelle `observation_points` statt denormalisierter Spalten, weil Identität per `UNIQUE(lat, lon, radius_km)` und alle Vergleiche (Hydrate, Besuch fortsetzen, GROUP BY) zu einem Integer-Vergleich werden; Label-Änderungen fragmentieren nichts. Kein ADR nötig (Detail innerhalb ADR 0007: BC-eigene Tabellen, vorwärts gerichtete Migrationen); kein Task-Split; keine Änderung in airspace.

Der Standort ist pro Prozess konstant (Config beim Start); deshalb reicht ein Hydrate-Filter, `SightingDedup` bleibt unverändert. Wechsel A, B, A innerhalb von `visitGap` setzt die alte A-Zeile fort (gleicher Standort, echte Kontinuität).

Prior art: sighting-log-m7p2v (Statistik-CLI, `--json`, Schema-Test) — dort die Konventionen für `scripts/stats-routes.mjs` und `route-stats.ts` (keine Laufzeit-Imports, erasable syntax) übernehmen.

## Outcome

Migration 0006 (`src/server/migrations/0006-observation-points.ts`) adds `observation_points(id, lat, lon, radius_km, place, first_used_at)` with `UNIQUE(lat, lon, radius_km)` and the nullable `sightings.observation_point_id` (additive, no backfill). `SightingRepository(db, gapMs, point)` find-or-creates the point at start (lat/lon rounded to 4 decimals, `place` relabelled only); new rows carry the point id, and hydrate, the continue-visit UPDATE, `recordLookup` and `latest()` only consider the current point, so a location change ends the visit. `recordLookup`'s signature is unchanged. `app.ts` passes `config.location`, `radiusKm`, `place`. `stats:routes` (`scripts/stats-routes.mjs`, `route-stats.ts`) defaults to the newest sighting's point, accepts `--standort <id|unbekannt|alle>` (invalid value exits non-zero), prints the filter plus a Standorte overview, and `--json` gains `standort` and `standorte`; a pre-0006 DB yields only the "unbekannt" group. Root README documents the new flag. Tests: `tests/unit/server/observation-points.test.ts` (migration, find-or-create, visit end, hydrate, lookup/latest, CLI), `observation-point-wiring.test.ts` (startService path), existing constructor calls and the JSON-keys test updated. `npm test` (406+1 tests) and `npm run typecheck` are green.
