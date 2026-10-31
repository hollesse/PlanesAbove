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
- Research-Bericht (Review: PASS, 2026-10-31): `knowledge/research/aircraft-photo-sources-2026-10-31.md`. Ergebnis in Kürze:
  - **Planespotters Photo API** (`api.planespotters.net/pub/photos/hex/<HEX>` und `/reg/<REG>`, keyless, live bestätigt): genau **ein** Foto (`thumbnail`, `thumbnail_large` 498×280, `link`, `photographer`, Host `t.plnspttrs.net`). Terms (nur sekundär belegt, Doku-Seite liefert 403 an Skripte — im Browser nachlesen): Fotografen-Credit als Text neben dem Bild, Bild auf `link` verlinken (kein nofollow), Bild-URL unverändert **vom Anzeigegerät (iPad) laden**, kein Proxy/Download/Rehosting, JSON ≤ 24 h cachen, beschreibender User-Agent mit Kontakt. De-facto-Standard (tar1090 `planespottersAPI`).
  - **Wikimedia Commons API** (Suche nach Kennzeichen im File-Namespace, keyless, UA-Header): mehrere Fotos, einzige **lizenzklare** Quelle (CC BY / CC BY-SA je Datei maschinenlesbar in `extmetadata`, Attribution an den Urheber Pflicht); Hotlinking „möglich, nicht empfohlen“ → lokaler Cache erlaubt. Treffer müssen auf das Kennzeichen gefiltert werden; Kleinflugzeuge schlecht abgedeckt.
  - **Airport-Data** `airport-data.com/api/ac_thumb.json?m=<HEX>&n=<N>` (auch `r=<REG>`, beide live bestätigt): bis zu N Fotos mit `image`, `link`, `photographer`; keyless, aber **keine veröffentlichten Terms** (Rechte beim Fotografen). adsbdb liefert `url_photo` aus derselben Quelle.
  - **hexdb.io** `GET /api/v2/aircraft/{hex}/image` (302 auf JPEG, auch `/image/thumbnail`): ein Foto, keine Terms, kein Fotografen-Credit → für eine Attributionspflicht ungeeignet.
  - **JetPhotos (FR24), Airliners.net, airhistory.net**: keine API, Rechte beim Fotografen, Scraping/Hotlinking nicht freigegeben → nicht verwenden. Flickr nur mit Key und Cache-Einschränkungen.
- Empfehlung für REFINE (Entscheidung des Betreibers): Default-Reihenfolge `[planespotters, commons]` als lizenzseitig sauberes Paar (Galerie aus 1 + n Fotos); Airport-Data optional als dritter Adapter mit explizitem Opt-in in `config.yaml`, solange Terms unklar sind. Konsequenz aus den Planespotters-Terms: der Server reicht nur URLs + Attribution durch, das iPad lädt die Bilder selbst (kein Bild-Proxy), JSON-Cache ≤ 24 h; Commons-Bilder dürfen lokal gecacht werden.
- Nicht gemessen: Trefferquote für Kleinflugzeuge (D-Exxx). Vorschlag: Stichprobe mit ~20–30 Kennzeichen aus dem Sichtungslog je Quelle, bevor die Reihenfolge festgezurrt wird.
- Offene Entscheidung (REFINE): welche Plattformen genau, in welcher Reihenfolge; ob ein API-Schlüssel (Umgebungsvariable, wie `ELEVENLABS_API_KEY`) akzeptabel ist; ob ein Foto lokal zwischengespeichert werden darf (Kiosk ohne Netzausfall-Sorgen) oder nur per Hotlink gezeigt wird.
- Zusammenspiel mit der Vision: Non-Goal „Keine Interaktion über das Tippen hinaus“ und der v2+-Eintrag „Foto-Knopf“ sollten bei Abnahme des Prototyps in `vision.md` angepasst werden (Betreiber-Entscheidung).
- Erwartung laut Research: Airliner gut abgedeckt, Kleinflugzeuge (D-Exxx) schlechter — Kein Foto muss ein normaler, ruhiger Zustand sein.
