---
id: 0033
title: Sichtungen je Airline x Typklasse und Referenzfotos über zwei lesende Endpunkte des Heimservers
scope: global
status: accepted
date: 2026-10-31
supersedes: []
superseded_by: []
related_adrs: [0029, 0031]
related_tasks: [infrastructure-cc9gq, sighting-log-r3kw8, airspace-yvdbz]
related_research: []
---

# ADR-0033: Sichtungen je Airline x Typklasse und Referenzfotos über zwei lesende Endpunkte des Heimservers

## Context

Der Lackierungs-Editor (ADR 0031) läuft auf dem Mac des Betreibers und soll Lücken anzeigen: Kombinationen aus Airline x Typklasse, die gesehen wurden, für die aber noch keine Lackierungsdatei im Repo liegt. Zwei Daten fehlen dafür.

1. Die heutige Lackierungs-Statistik (`/api/stats/liveries`) kennt nur die Airline, nicht die Typklasse. `livery_present` wird zum Sichtungszeitpunkt eingefroren und veraltet, sobald eine Datei nachgereicht wird. Für Lücken ist es also die falsche Grundlage.
2. Ein Referenzfoto zu einer vergangenen Sichtung ist heute nicht erreichbar: `/api/photos/:icao24` antwortet nur für die aktuell ausgewählte Maschine.

Die Sichtungen liegen im Heimserver (sighting-log, SQLite). Der Fotoweg gehört zu airspace (ADR 0029: Server reicht nur URLs und Attribution durch, das Gerät lädt die Bilder). Die Entscheidung betrifft beide Module und ist deshalb global.

## Decision

1. **Sichtungen je Klasse (sighting-log).** `GET /api/stats/sightings-by-class?days=&standort=` liefert je Kombination `{prefix, airline, typklasse, count, lastSeenMs, samples}` mit höchstens 3 Beispiel-Sichtungen. Die Aggregation ist unabhängig von `livery_present`, sie zählt alle Sichtungen im Zeitfenster.
2. **Referenzfoto (airspace).** `GET /api/photos/reference?icao24=&registration=` antwortet nur für Hexes, die in `sightings` vorkommen. Es ist kein offener Proxy auf Commons oder Planespotters. Es liefert wie ADR 0029 nur Foto-URL, Attribution und Link; der Browser lädt das Bild direkt, mit Attribution und klickbarem Link.
3. **Lücken rechnet der Editor selbst:** gesehene Kombinationen minus lokal vorhandene Lackierungsdateien. Unbekannte Präfixe erscheinen als "Airline fehlt im Katalog". Die Schwelle für "gesehen" ist ein UI-Parameter im Editor (Default 90 Tage, mindestens 1 Sichtung); der Server kennt keine Lückenlogik.
4. **Transport.** Der Editor erreicht den Server nur über Vites `server.proxy` auf `PLANESABOVE_HOME_URL`. Es gibt keine CORS-Änderung, und der Server bleibt für den Editor rein lesend (keine schreibenden Endpunkte).
5. Die Umsetzung erfolgt in späteren Feature-Tasks in sighting-log und airspace; dieser ADR ändert keinen Code. Eine Änderung der realen `config.yaml` ist nicht nötig.

## Consequences

### Positive
- Die Lücken-Ansicht stützt sich auf Rohsichtungen und veraltet nicht, wenn Dateien nachgereicht werden.
- Die Lückenlogik und die Schwelle liegen beim Editor und lassen sich dort ohne Server-Deployment ändern.
- Der Server bleibt nur-lesend ohne neue Angriffsfläche: Foto-Endpunkt ist auf bekannte Sichtungen beschränkt, keine CORS-Öffnung.
- Bilder laufen weiter nicht durch den Server (ADR 0029).

### Negative
- Zwei neue Endpunkte sind zu pflegen und zu testen, in zwei Modulen.
- Der Editor funktioniert für die Lücken-Ansicht nur, solange der Heimserver erreichbar ist.
- Die Aggregation über das Zeitfenster läuft bei jedem Aufruf in SQLite; bei sehr großen Zeiträumen ist das nicht gratis.

### Neutral
- `livery_present` bleibt unverändert bestehen und bedient weiterhin die bisherige Statistik.

## Alternatives considered

- **`/api/stats/liveries` um die Typklasse erweitern.** Verworfen: bliebe an `livery_present` hängen und würde die bestehende Statistik mit anderer Bedeutung überladen.
- **Editor ruft Commons/Planespotters direkt.** Verworfen: verdoppelt die Fotoquellen-Logik (Kette, Fallback, Attribution) aus ADR 0029 im Editor und verfehlt den Bezug zu vergangenen Sichtungen.
- **SQLite-Datei auf den Mac kopieren.** Verworfen: manueller Schritt, veraltete Kopie, zweiter Lesepfad am Schema vorbei.

## Offene Punkte

- Der Architekten-Entwurf nennt keine ausdrücklich offenen Punkte; die Betreiberbestätigung des Entwurfs steht aus ([human-eye]-Kriterium des Tasks).
- Kennzeichen: wird ab Migration 0009 gespeichert (siehe Amendment); ältere Sichtungen behalten NULL.
- Wie die Typklasse zum Sichtungszeitpunkt gewonnen und in `sightings` abgelegt wird (heute vorhanden oder nachzurüsten), klärt der Feature-Task in sighting-log; falls ein Schema-Zuwachs nötig ist, ist dort ein eigener ADR zu prüfen.

## Amendment (2026-11-01, sighting-log-r3kw8)

Das Kennzeichen wird ab Migration 0009 je Sichtung gespeichert (Spalte `registration`, nullable, kein Backfill; Quelle ist nur der Flugdaten-Feed, ADR 0016 bleibt unberührt). `samples[].registration` von `/api/stats/sightings-by-class` liefert es, und sighting-log stellt `knownAircraft(db, icao24)` für den Referenzfoto-Endpunkt bereit. Damit findet Wikimedia Commons (Suche nur nach Kennzeichen) Fotos zu vergangenen Sichtungen.

## Amendment (2026-11-01, airspace-yvdbz)

Abweichung von §2 ("bestehende Fotokette"): `GET /api/photos/reference` fragt nur Wikimedia Commons, nie Planespotters, unabhängig von `sources.photo.order` und `fallback` (Entscheidung des Betreibers: 280 px reichen zum Nachzeichnen einer Lackierung nicht). Dafür hat der Endpunkt eine eigene `PhotoSourceChain` mit nur dem Commons-Adapter (im Mock-Modus die `ScenarioPhotoSource`) hinter einem eigenen `PhotoService` (24-h-Speichercache je Hex). Die Hex-Prüfung läuft über `knownAircraft` (sighting-log, ADR 0007); abgefragt wird nur mit dem gespeicherten Kennzeichen, ein `registration`-Parameter kann die Suche nicht steuern. Ohne gespeichertes Kennzeichen antwortet der Endpunkt `status: none`, ohne Commons zu fragen; ungültiger Hex ergibt 400, nie gesehener Hex 404. `/api/photos/:icao24` bleibt unverändert.

## References

- ADR 0031 (Lackierung je Airline x Typklasse als Pfaddatei im Repo; Farbfelder: Pfade gehören nur zu Rumpf und Finne)
- ADR 0029 (Fotoquelle: Gerät lädt Bilder, Server reicht nur URLs und Attribution durch)
- Task infrastructure-cc9gq