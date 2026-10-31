---
id: airspace-gw6w9
title: Fotoquelle (PhotoSource): echte Fotos eines konkreten Flugzeugs per Kennzeichen/Hex aus mehreren kostenlosen Plattformen, mit Attribution, als Galerie
status: todo
type: feature
context: airspace
created: 2026-10-31
completed:
depends_on: []
blocks: [sky-scene-xw8jv]
tags: [foto, overlay, galerie, anreicherung, lizenz]
related_adrs: [0001, 0005, 0016, 0029]
related_research: [aircraft-photo-sources-2026-10-31]
prior_art: []
---

## Why
Wie bei Flightradar24 sollen Erwachsene (und Mona) zu einem Flugzeug am Himmel ein echtes Foto genau dieses Flugzeugs sehen können — nicht nur die gezeichnete Lackierung. Die Vision führt den „Foto-Knopf“ bisher als v2+-Idee mit dem Vorbehalt „Lizenz/Attribution klären“; die Research `aircraft-photo-sources-2026-10-31` hat das geklärt, ADR 0029 hält die Entscheidung fest. Der Betreiber zieht den Prototyp vor.

## What
Ein neuer Port **PhotoSource** im Anticorruption-Layer von airspace (Vorbild RouteSource): zu einem Flugzeug (ICAO24-Hex, Kennzeichen) liefert er eine Liste von **Fotos** — je `thumbUrl`, `imageUrl`, `photographer`, `source`, `pageUrl`, `licenceText` — oder leer (**Kein Foto**, regulärer Zustand), getrennt von *nicht verfügbar* (Netzfehler, 429, Timeout). Drei Adapter, Default-Kette `sources.photo.order: [planespotters, commons, airport-data]`:

- **planespotters** — `GET https://api.planespotters.net/pub/photos/hex/<HEX>` (Fallback `/reg/<REG>`); `photos[0]` mit `thumbnail.src`, `thumbnail_large.src`, `link`, `photographer`. `licenceText` = „© <photographer> · planespotters.net“, `pageUrl` = `link`.
- **commons** — Wikimedia-Commons-API-Suche im File-Namespace nach dem Kennzeichen (mit `extmetadata`: `Artist`, `LicenseShortName`, `AttributionRequired`), gefiltert auf Dateien, deren Titel/Beschreibung das Kennzeichen exakt enthält; `licenceText` = „<Artist> · <LicenseShortName> · Wikimedia Commons“.
- **airport-data** — `GET https://airport-data.com/api/ac_thumb.json?m=<HEX>&n=5` (Fallback `r=<REG>`); `data[]` mit `image`, `link`, `photographer`; `licenceText` = „© <photographer> · airport-data.com“.

Der Server **proxyt und speichert keine Bilder** (ADR 0029): die Galerie-Liste geht per `GET /api/photos/:icao24` an den Client, das iPad lädt die Bilder direkt. Antworten werden nur im Speicher gecacht (TTL ≤ 24 h, auch *Kein Foto*; *nicht verfügbar* nicht). Backoff je Quelle bei 429/Fehlern wie bei den Routenquellen; `/healthz` nennt den Zustand je Fotoquelle. Zusammenführung: Reihenfolge der Kette, Dedup per `source + id/URL`, maximal `sources.photo.maxPhotos` (Default 6). Jede Anfrage trägt `sources.userAgent`, der eine Kontaktadresse enthalten muss (Planespotters-Terms).

Teil des Tasks ist eine **Stichprobe**: `scripts/photo-sample.mjs` fragt ~30 Kennzeichen/Hex aus dem Sichtungslog (Mischung Airliner / Kleinflugzeuge) je Quelle ab und gibt die Trefferquote je Quelle und Typklasse aus; das Ergebnis landet im Outcome des Tasks und in den Notes.

## Acceptance criteria
- [ ] Port `PhotoSource` (`src/server/modules/airspace/photo-source.ts` o. ä.) mit `lookup({ icao24, registration }) → { photos: Photo[] } | { unavailable: true }`; `Photo` = `{ id, thumbUrl, imageUrl, photographer, source, pageUrl, licenceText }`; leere Liste = Kein Foto.
- [ ] Adapter `planespotters`, `commons`, `airport-data` mit Contract-Tests gegen aufgezeichnete Fixtures (Treffer, Kein Foto/404, 429, Netzfehler, Timeout) nach ADR 0003; Commons-Adapter verwirft Treffer ohne exaktes Kennzeichen im Titel/Beschreibung (Test mit Fehltreffer-Fixture).
- [ ] `PhotoSourceChain` fragt die konfigurierte Reihenfolge, führt zusammen (Dedup, `maxPhotos` Default 6, Planespotters-Foto zuerst, wenn vorhanden), unterscheidet *Kein Foto* (alle Quellen leer) von *nicht verfügbar* (alle Quellen gestört) und liefert Teilergebnisse, wenn nur einzelne Quellen gestört sind.
- [ ] Konfiguration `sources.photo.{order, maxPhotos, timeoutMs, cacheTtlHours ≤ 24}` im Schema validiert; `config.example.yaml` dokumentiert; `sources.userAgent` ohne `@`/Kontakt-URL führt bei aktiver Fotoquelle zu einem Boot-`warn`.
- [ ] `GET /api/photos/:icao24` liefert `{ photos, status: 'ok' | 'none' | 'unavailable' }` für ein Flugzeug der aktuellen Auswahl (sonst 404); der Server lädt, speichert oder proxyt keine Bilddaten (kein Test, der Bildbytes erwartet; Review-Kriterium per Diff).
- [ ] In-Memory-Cache je Hex mit TTL (Default 24 h), nie in SQLite; 429 setzt Backoff je Quelle; `/healthz` zeigt `photo.sources[]` mit Zustand (ok / backoff / blocked).
- [ ] `scripts/photo-sample.mjs --limit 30` liest Kennzeichen/Hex aus `sightings`, fragt jede Quelle ab (mit Pausen, `sources.userAgent`) und druckt Trefferquote je Quelle und Typklasse; Ergebnis im Task-Outcome festgehalten.
- [ ] Steckbrief, Auswahl und Sichtungslog unverändert; bestehende Tests grün.

## Notes
- Research (Review PASS, 2026-10-31): `knowledge/research/aircraft-photo-sources-2026-10-31.md`. Entscheidung: ADR 0029 (Bilder lädt das iPad direkt, kein Proxy; Default-Kette Planespotters → Commons → Airport-Data; hexdb.io nicht, weil ohne Fotografen-Credit; Cache nur im Speicher ≤ 24 h).
- Planespotters-Terms sind nur sekundär belegt (Doku-Seite `planespotters.net/photo/api` blockt Skripte, 403). Betreiber liest sie im Browser nach, bevor der Prototyp dauerhaft läuft. Bekannt: Credit-Text neben dem Bild, Bild verlinkt auf `link` (kein nofollow), Bild-URL unverändert, JSON ≤ 24 h, nicht als Premium-Feature, beschreibender User-Agent mit Kontakt.
- Airport-Data hat keine veröffentlichten Terms; der Betreiber hat sich am 2026-10-31 bewusst dafür entschieden, die Quelle im privaten Haushalt mit Credit + Link zu nutzen; per `order` abschaltbar.
- **Reale config.yaml anpassen: ja** — `sources.userAgent` braucht eine Kontaktadresse (z. B. `PlanesAbove/0.1 (self-hosted, single household; mailto:…)`); neuer Block `sources.photo` ist optional mit Defaults.
- Rate-Limit von Planespotters unbekannt; die Abfrage erfolgt nur beim Tippen (nicht je Takt), gecacht je Hex, daher wenige Requests pro Tag.
- Vision nachziehen (Non-Goal „keine Interaktion über das Tippen hinaus“, v2+-Eintrag „Foto-Knopf“) bei Abnahme des Prototyps — Betreiber-Entscheidung, nicht Teil dieses Tasks.
