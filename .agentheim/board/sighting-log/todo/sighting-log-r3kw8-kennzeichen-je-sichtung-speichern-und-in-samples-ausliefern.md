---
id: sighting-log-r3kw8
title: Kennzeichen je Sichtung speichern (Spalte registration) und in den samples von /api/stats/sightings-by-class ausliefern
status: todo
type: feature
context: sighting-log
created: 2026-11-01
completed:
depends_on: [sighting-log-js2t1]
blocks: [airspace-yvdbz]
tags: [editor, fotos, schema]
related_adrs: [0007, 0033]
related_research: []
prior_art: [sighting-log-js2t1]
---

## Why
Das Referenzfoto im Lackierungs-Editor (airspace-yvdbz) braucht das Kennzeichen: Wikimedia Commons, die primäre Fotoquelle (ADR 0029), sucht nur nach Kennzeichen. Heute speichert `sightings` keins, und die samples von `/api/stats/sightings-by-class` liefern `registration: null` (Kommentar in `sightings-by-class.ts`). Ohne Kennzeichen bleibt nur Planespotters (280 px).

## What
- Neue forward-only-Migration `0009-registration.ts`: `ALTER TABLE sightings ADD COLUMN registration TEXT` (nullable, kein Backfill; alte Zeilen behalten NULL).
- `SightingInput` bekommt `registration?: string`; `sky-service.ts` reicht `a.registration` durch (Quelle ist nur der Flugdaten-Feed, adsb.lol `r`, kein hexdb-/adsbdb-Wert, ADR 0016 bleibt unberührt). Leerstring wird als NULL gespeichert, Wert getrimmt und in Großbuchstaben.
- Beim Fortsetzen eines Besuchs füllt ein später bekanntes Kennzeichen eine noch leere Spalte (`COALESCE(registration, ?)`), überschreibt aber kein vorhandenes.
- `sightingsByClass` liefert in jedem sample das gespeicherte Kennzeichen statt `null`.
- Lesefunktion für airspace (ADR 0007: nur sighting-log berührt die Tabelle): `knownAircraft(db, icao24)` → `null`, wenn der Hex in `sightings` nie vorkam (Standort egal), sonst `{ registration: string | null }` mit dem Kennzeichen der neuesten Sichtung dieses Hex, die eins trägt. Groß-/Kleinschreibung des Hex egal.

## Acceptance criteria
- [ ] Migration 0009 läuft auf einer bestehenden DB (mit Zeilen aus Migration 0001–0008) ohne Datenverlust; alte Zeilen haben `registration` NULL.
- [ ] Eine neue Sichtung mit Kennzeichen `d-aixa ` wird als `D-AIXA` gespeichert; ohne Kennzeichen oder mit Leerstring als NULL.
- [ ] Ein fortgesetzter Besuch, dessen Zeile noch NULL hat, übernimmt ein später geliefertes Kennzeichen; eine Zeile mit Kennzeichen wird nicht überschrieben.
- [ ] `GET /api/stats/sightings-by-class` liefert in `samples[].registration` das gespeicherte Kennzeichen bzw. `null`; der bestehende Vertragstest bleibt sonst grün.
- [ ] `knownAircraft` gibt `null` für einen nie gesehenen Hex, `{ registration: null }` für einen Hex ohne gespeichertes Kennzeichen und das Kennzeichen der neuesten Sichtung mit Kennzeichen, wenn es mehrere gibt; Hex-Vergleich ohne Rücksicht auf Groß-/Kleinschreibung.
- [ ] README des BC sighting-log nennt das Kennzeichen in „Sichtung“; ADR 0033 bekommt ein kurzes Amendment („Offene Punkte“: Kennzeichen wird ab Migration 0009 gespeichert).

## Notes
- Entscheidung des Betreibers (2026-11-01): Kennzeichen mit erfassen, damit Commons im Editor Fotos findet.
- Kein eigener ADR: additive, nullable Spalte für ein öffentliches Merkmal, das wie Callsign/Typcode aus dem Flugdaten-Feed kommt; das Amendment an ADR 0033 genügt.
- Reale config.yaml anpassen: nein.
