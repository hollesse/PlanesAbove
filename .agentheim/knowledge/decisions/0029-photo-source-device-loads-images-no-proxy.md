---
id: ADR-0029
title: Fotoquelle: Server reicht nur Foto-URLs und Attribution durch, das Anzeigegerät lädt die Bilder selbst; Default-Kette Planespotters, Wikimedia Commons, Airport-Data
scope: airspace
status: accepted
date: 2026-10-31
supersedes: []
superseded_by: []
related_tasks: [airspace-gw6w9, design-system-pawdq, sky-scene-xw8jv]
related_research: [aircraft-photo-sources-2026-10-31]
related_adrs: [0001, 0004, 0005, 0016]
---

# ADR-0029: Fotoquelle: Server reicht nur Foto-URLs und Attribution durch, das Anzeigegerät lädt die Bilder selbst

## Context
Das Foto-Overlay (sky-scene-xw8jv) soll echte Fotos des konkreten Flugzeugs zeigen. Die Research
`aircraft-photo-sources-2026-10-31` ergab: Planespotters ist die einzige keylose Quelle mit expliziten
API-Terms (Credit-Text + Link, Bild-URL unverändert vom Anzeigegerät laden, kein Proxy, kein Download
oder Rehosting, JSON höchstens 24 h cachen, beschreibender User-Agent mit Kontakt) und liefert genau
ein Foto. Wikimedia Commons ist lizenzklar (CC BY / CC BY-SA je Datei) und liefert mehrere Fotos.
Airport-Data liefert mehrere Fotos keyless, hat aber keine veröffentlichten Terms. JetPhotos,
Airliners.net und airhistory.net scheiden aus (keine API, kein Hotlinking). ADR 0001 erlaubt nur
kostenlose Quellen; ADR 0004 macht das iPad zum dünnen Browser-Client.

## Decision
1. Ein Port **PhotoSource** (Anticorruption-Layer wie RouteSource, ADR 0005/0016) liefert zu Hex und
   Kennzeichen eine Liste von Fotos mit `thumbUrl`, `imageUrl`, `photographer`, `source`, `pageUrl`,
   `licenceText`, oder leer (*Kein Foto*), getrennt von *nicht verfügbar*.
2. Der Server **proxyt, speichert und rehostet keine Bilder**. Er reicht nur URLs und Attribution
   durch; das iPad lädt jedes Bild direkt vom Host der Quelle. Das gilt einheitlich für alle Quellen,
   damit ein Bildweg genügt und die Planespotters-Terms erfüllt sind.
3. Antworten der Quellen werden **nur im Speicher** gecacht, höchstens 24 h, nie in SQLite
   (dieselbe Regel wie hexdb-/adsbdb-Routen).
4. Default-Kette `sources.photo.order: [planespotters, commons, airport-data]`, Reihenfolge und
   Aktivierung reine Konfiguration. Airport-Data bleibt bewusst dabei (Entscheidung des Betreibers
   am 2026-10-31): privater, nicht-kommerzieller Haushalt, Credit + Link werden gezeigt, die Terms sind
   unveröffentlicht, nicht verbietend. hexdb.io wird nicht verwendet (kein Fotografen-Credit).
5. Jede Anfrage trägt einen beschreibenden User-Agent **mit Kontaktadresse** (`sources.userAgent`).

## Consequences
### Positive
- Planespotters-Terms eingehalten, Commons-Attribution maschinenlesbar, keine Bilddaten auf dem Server.
- Ein Bildweg für alle Quellen; Galerie aus 1 (Planespotters) + n (Commons, Airport-Data).

### Negative
- Ohne Internet am iPad erscheinen keine Fotos (Kiosk zeigt *Kein Foto*); kein Offline-Cache.
- Airport-Data ist lizenzseitig nicht belegt; bei Beschwerde per Konfiguration abschaltbar.
- Die Planespotters-Terms sind nur sekundär belegt (Doku-Seite blockt Skripte); der Betreiber liest sie
  im Browser nach, bevor der Prototyp dauerhaft läuft.

### Neutral
- Ein offizieller Rate-Limit-Wert von Planespotters ist unbekannt; es gilt das übliche Backoff je Quelle.

## Alternatives considered
- **Server-Cache für Commons-Bilder** — lizenzrechtlich erlaubt, aber ein zweiter Bildweg; verschoben.
- **Nur Planespotters** — einfachster Prototyp, aber keine Galerie.
- **hexdb.io Image** — keyless, liefert aber keinen Fotografen, Attribution unmöglich.

## Amendment 2026-10-31 — Planespotters-Terms im Primärtext verifiziert

Der Betreiber hat die Photo API Terms of Use im Wortlaut vorgelegt. Bestätigt: Backend darf die API
aufrufen und die Ergebnisse an die eigene App weiterreichen; URLs unverändert; Bild lädt das
Anzeigegerät direkt und hält es nur im Speicher, solange es angezeigt wird; JSON-Cache ≤ 24 h;
non-browser Clients mit User-Agent inkl. Kontakt-URL/E-Mail, sonst 403; keine ML-Nutzung; nur ein
Foto je Abfrage. **Neu gegenüber der Research:** der Link zurück zur Fotoseite muss auf einem
Kiosk-Display per QR-Code oder NFC erfolgen — die URL als Text genügt ausdrücklich nicht. Folge:
das Foto-Overlay bekommt einen QR-Code je Foto (design-system-g83gh), bevor Planespotters im
Betrieb aktiv ist. Außerdem: `thumbnail_large` ist nur 280 px hoch (Breite 360–500 px); auf dem
iPad wird es hochskaliert.
