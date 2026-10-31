---
id: airspace-gw6w9
title: Fotoquelle (PhotoSource): echte Fotos eines konkreten Flugzeugs per Kennzeichen/Hex aus mehreren kostenlosen Plattformen, mit Attribution, als Galerie
status: backlog
type: feature
context: airspace
created: 2026-10-31
completed:
depends_on: []
blocks: [sky-scene-xw8jv]
tags: [foto, overlay, galerie, anreicherung, lizenz]
related_adrs: [0001, 0005, 0016]
related_research: [aircraft-photo-sources-2026-10-31]
prior_art: []
---

## Why
Wie bei Flightradar24 sollen Erwachsene (und Mona) zu einem Flugzeug am Himmel ein echtes Foto genau dieses Flugzeugs sehen können — nicht nur die gezeichnete Lackierung. Die Vision führt den „Foto-Knopf mit echtem Foto des konkreten Flugzeugs“ bisher als bewusst verschobene v2+-Idee mit dem Vorbehalt „Spotter-Seiten, Lizenz/Attribution klären“. Der Betreiber zieht ihn jetzt als Prototyp vor; die Lizenzfrage wird durch die Research geklärt, nicht übersprungen.

## What
Ein neuer Port **Fotoquelle (PhotoSource)** im Anticorruption-Layer von airspace: zu einem Flugzeug (Kennzeichen, ICAO24-Hex) liefert er eine Liste von **Fotos** — jedes mit Bild-URL (Vorschau + größer), Fotograf, Quelle/Plattform, Link zur Originalseite und Lizenz-/Attributionstext — oder den regulären Zustand **Kein Foto**. Mehrere Adapter (eine je Plattform aus der Research), zusammengeführt zu einer Galerie-Liste; jede Plattform nur mit geklärter Lizenz (kostenlos, nicht-kommerziell/privat erlaubt, Attribution wie gefordert). Ergebnis wird im Speicher gecacht (TTL) und per Server-API an den Client gereicht; was persistiert oder lokal gecacht werden darf, folgt den Terms der jeweiligen Quelle (Vorbild: adsbdb-/hexdb-Regel, nie persistieren, wo die Lizenz es nicht hergibt). Kein Foto ist kein Fehler; Netz-/429-Fehler zählen als *nicht verfügbar* mit Backoff je Quelle wie bei den Routenquellen.

## Acceptance criteria
- [ ] Port `PhotoSource` mit Rückgabe `{ photos: Photo[] }` (leer = Kein Foto) und Unterscheidung *kein Foto* / *nicht verfügbar*; `Photo` trägt mindestens `thumbUrl`, `imageUrl`, `photographer`, `source`, `pageUrl`, `licenceText`.
- [ ] Mindestens zwei Adapter für Plattformen, die laut Research keyless (oder mit kostenlosem Schlüssel per Umgebungsvariable) und lizenzseitig für ein privates, nicht-kommerzielles Self-Hosting erlaubt sind; Reihenfolge und Aktivierung per `config.yaml` (`sources.photo.order`), Default-Reihenfolge aus der Research.
- [ ] Zusammenführung mehrerer Quellen zu einer Galerie-Liste (Dedup per Quelle+Foto-Id, maximal N Fotos, Default 6).
- [ ] Contract-Tests je Adapter gegen aufgezeichnete Fixtures (Treffer, kein Foto, 429, Netzfehler), nach ADR 0003.
- [ ] Server-Endpunkt (z. B. `GET /api/photos/:icao24`) liefert die Galerie-Liste; Antwort enthält je Foto den vollständigen Attributionstext in der Form, die die Quelle verlangt.
- [ ] In-Memory-Cache mit TTL je Hex; 429 löst Backoff je Quelle aus (`/healthz` nennt den Zustand je Fotoquelle), kein Foto wird nach den Terms der Quelle nicht länger gespeichert als erlaubt (Hotlink statt Download, wo verlangt).
- [ ] Der Steckbrief, die Auswahl und das Sichtungslog bleiben unverändert — die Fotoquelle ist rein additiv.

## Notes
- Research-Bericht: `knowledge/research/aircraft-photo-sources-2026-10-31.md` — wird nach Abschluss der Review-Gate hier eingefaltet (Kandidatenliste, Lizenzlage, Hotlink/Cache-Regeln).
- Offene Entscheidung (REFINE): welche Plattformen genau, in welcher Reihenfolge; ob ein API-Schlüssel (Umgebungsvariable, wie `ELEVENLABS_API_KEY`) akzeptabel ist; ob ein Foto lokal zwischengespeichert werden darf (Kiosk ohne Netzausfall-Sorgen) oder nur per Hotlink gezeigt wird.
- Zusammenspiel mit der Vision: Non-Goal „Keine Interaktion über das Tippen hinaus“ und der v2+-Eintrag „Foto-Knopf“ sollten bei Abnahme des Prototyps in `vision.md` angepasst werden (Betreiber-Entscheidung).
- Erwartung laut Research: Airliner gut abgedeckt, Kleinflugzeuge (D-Exxx) schlechter — Kein Foto muss ein normaler, ruhiger Zustand sein.
