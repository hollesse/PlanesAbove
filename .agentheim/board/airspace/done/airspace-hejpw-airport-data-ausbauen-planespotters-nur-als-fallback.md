---
id: airspace-hejpw
title: Airport-Data als Fotoquelle ausbauen; Planespotters nur noch als Fallback, wenn Wikimedia Commons gar kein Foto liefert
status: done
type: feature
context: airspace
created: 2026-10-31
completed:
depends_on: [airspace-vcytm]
blocks: []
tags: [foto, qualitaet, planespotters, airport-data, commons, fallback]
related_adrs: [0029]
related_research: [aircraft-photo-sources-2026-10-31]
prior_art: [airspace-gw6w9, airspace-vcytm]
---

## Why
Airport-Data liefert nur kleine Thumbnails, die im Vollbild-Overlay unscharf wirken, und hat keine veröffentlichten Terms — es fliegt raus. Planespotters liefert ebenfalls nur 280 px, hat aber die beste Abdeckung bei Airlinern; es soll bleiben, aber nur als letzte Rettung: Wenn Wikimedia Commons (1600 px, lizenzklar) gar kein Foto kennt, ist ein unscharfes Planespotters-Foto besser als „Kein Foto“. Liefert Commons auch nur ein einziges Foto, wird Planespotters nicht gefragt (Betreiber-Entscheidung 2026-10-31).

## What
1. Adapter `airport-data` samt Fixtures, Tests, Eintrag in `PHOTO_SOURCE_NAMES`, Config-Schema und `config.example.yaml` entfernen; Stichproben-Skript verschlanken.
2. Neue Kettenregel **Fallback-Quelle**: `sources.photo.order` bleibt die Primärkette (Default `[commons]`), neu `sources.photo.fallback` (Default `[planespotters]`). Fallback-Quellen werden **nur** gefragt, wenn jede Primärquelle leer geantwortet hat (*Kein Foto*); hat eine Primärquelle mindestens ein Foto, bleibt die Galerie bei den Primärquellen. Antwortet eine Primärquelle *nicht verfügbar* und keine liefert Fotos, wird der Fallback trotzdem gefragt (ein Foto ist besser als keins); Status bleibt wie bisher (`unavailable` nur, wenn alles gestört ist und nichts kam).
3. `/healthz` zeigt Fallback-Quellen weiter unter `photo.sources[]`, markiert mit `role: primary | fallback`.
4. README (Fotoquellen-Kette, Fotoquelle) und ADR 0029 (Amendment: Airport-Data entfernt, Fallback-Regel) nachziehen — ADR-Amendment schreibt der Conductor bei Integration.

## Acceptance criteria
- [ ] Keine Referenz auf airport-data mehr in `src/`, `tests/`, `scripts/`, `config.example.yaml`; `airport-data` in einer alten config.yaml ergibt eine klare Validierungsmeldung.
- [ ] Config-Test: Default `order: [commons]`, `fallback: [planespotters]`; beide konfigurierbar, `fallback: []` schaltet den Fallback ab; eine Quelle darf nicht in beiden Listen stehen (Validierungsfehler).
- [ ] Ketten-Tests: (a) Commons liefert 1 Foto → Planespotters wird nicht aufgerufen (Fetch-Spy), Galerie = Commons; (b) Commons leer → Planespotters gefragt, Galerie = Planespotters-Foto, `status: ok`; (c) Commons leer, Planespotters leer → `status: none`; (d) Commons gestört, Planespotters liefert → Galerie = Planespotters, `status: ok`, nicht gecacht (Teilergebnis-Regel bleibt); (e) alles gestört → `unavailable`.
- [ ] `/healthz`-Test: `photo.sources[]` enthält `commons` mit `role: primary` und `planespotters` mit `role: fallback`.
- [ ] Stichproben-Skript fragt Primär- und Fallback-Quellen weiterhin alle ab (zur Messung) und weist die Rolle aus.
- [ ] `npm test`, `npm run typecheck` grün; bestehende Tests angepasst, nicht gelöscht.

## Notes
- Betreiber-Entscheidung 2026-10-31: Airport-Data raus (Qualität, keine Terms); Planespotters nur, wenn Commons nichts liefert — nicht zum Auffüllen der Galerie.
- Planespotters-Terms (QR-Link-back, User-Agent mit Kontakt, JSON ≤ 24 h, Bild direkt vom iPad) gelten unverändert, auch wenn die Quelle selten zieht.
- Erwartung aus der Stichprobe 2026-10-31: Commons 19/30, Planespotters hätte bei korrektem User-Agent wohl deutlich mehr als 8/30 (22 × 403). Der Fallback hilft vor allem bei Airlinern, die Commons nicht kennt.

## Outcome

Airport-Data entfernt (Adapter airport-data-photo-source.ts und Fixtures airport-data-*.json geloescht; PHOTO_SOURCE_NAMES, Config-Enum, config.example.yaml, Stichproben-Skript bereinigt). Neue Config sources.photo.fallback (Default [planespotters], [] = aus), order Default [commons]; Quelle in beiden Listen = Validierungsfehler; airport-data in einer alten config.yaml scheitert an der Enum-Validierung (sources.photo.order). PhotoSourceChain nimmt Fallback-Quellen entgegen und fragt sie nur, wenn die Primaerkette kein Foto lieferte (leer oder gestoert); Teilergebnis-Regel bleibt (nicht gecacht). status() traegt role primary|fallback, /healthz zeigt es. scripts/photo-sample.src.mjs fragt alle Quellen weiter ab und weist die Rolle aus (plus Zeilen "nur Primaerquellen" und "mit Fallback"). Tests: Ketten-Tests (a)-(e) plus Rollen-Status in tests/unit/server/photo-chain.test.ts, Config-Tests, /healthz-Test mit role; bestehende Tests angepasst. npm test (689 passed) und typecheck gruen. Reale config.yaml anpassen: nur noetig, falls sie airport-data oder eine eigene photo.order enthaelt.
