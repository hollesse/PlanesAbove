---
id: 0039
title: Referenzfoto-Galerie - ein Foto je Kennzeichen, neueste zuerst, lazy geladen (ändert ADR 0033 §1 und §2)
scope: livery-editor
status: accepted
date: 2026-11-02
related_tasks: [livery-editor-c24r8]
related_adrs: [0033, 0034, 0007]
---

# ADR-0039: Referenzfoto-Galerie - ein Foto je Kennzeichen, neueste zuerst, lazy geladen

Ändert/ergänzt ADR 0033 §1 und §2 (ersetzt dort "höchstens 3 Beispiel-Sichtungen" und "erstes Foto des ersten Samples"). Alles andere aus 0033 gilt weiter: nur Commons, nur gesichtete Hexes, keine Bytes über den Server.

## Context

Das Fotopanel zeigte nur den ersten Commons-Treffer des ersten von höchstens 3 Samples. Die Samples waren nicht nach Kennzeichen dedupliziert, die Commons-Reihenfolge ist Suchrelevanz statt Datum. Verschiedene Lackierungen derselben Airline × Typklasse blieben so unsichtbar.

## Decision

1. **Samples** (`/api/stats/sightings-by-class`): je Airline × Typklasse bis zu 20 Samples, höchstens eines je Kennzeichen, neueste Sichtung zuerst. Sichtungen ohne Kennzeichen zählen nicht als Sample (ein Foto braucht ein Kennzeichen); sie zählen weiter in `count`.
2. **`/api/photos/reference`**: die Fotos eines Kennzeichens kommen neueste zuerst, sortiert nach `DateTimeOriginal` aus den Commons-extmetadata, ersatzweise nach dem Upload-Zeitstempel (`timestamp`). `Photo` trägt dazu das optionale Feld `date` (ISO 8601); es fehlt, wenn weder das eine noch das andere vorliegt, solche Fotos stehen am Ende.
3. **Editor-Galerie**: ein Foto je Kennzeichen (das jeweils neueste), ‹ ›, Position "n / m" ("+" solange Kennzeichen offen sind), Beschriftung aus Kennzeichen, Datum und Fotograf · Quelle · Lizenz · Link. Geladen wird lazy und strikt nacheinander: das erste sofort, das nächste im Hintergrund vorab, nie 20 Anfragen gleichzeitig. Kennzeichen ohne Commons-Foto werden übersprungen. "Kein Foto" nur, wenn kein Kennzeichen ein Foto hat; "Foto nicht verfügbar" nur, wenn jede Anfrage scheiterte. Ein Wechsel von Airline oder Typ bricht laufendes Laden ab (`photoRequest`).

## Consequences

- Commons wird pro angeklicktem Kennzeichen höchstens einmal je Gallery-Schritt gefragt (plus Vorab-Laden), nicht für alle 20 auf einmal; der Server-Cache bleibt wie gehabt.
- Die Gesamtzahl "m" ist erst bekannt, wenn alle Kennzeichen aufgelöst sind; bis dahin zeigt die Position ein "+".
- Keine neuen oder geänderten config.yaml-Schlüssel.
