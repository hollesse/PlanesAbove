---
id: airspace-vcytm
title: Schärfere Fotos im Overlay — Commons-Vorschau mit 1600 px anfordern und Default-Kette auf [commons, airport-data, planespotters] drehen
status: done
type: feature
context: airspace
created: 2026-10-31
completed:
depends_on: [airspace-gw6w9]
blocks: []
tags: [foto, qualitaet, commons, planespotters, konfiguration]
related_adrs: [0029]
related_research: [aircraft-photo-sources-2026-10-31]
prior_art: [airspace-gw6w9]
---

## Why
Planespotters liefert über die kostenlose API nur `thumbnail_large` mit 280 px Höhe; auf dem iPad Pro wird das im Overlay rund vierfach hochskaliert und wirkt unscharf. Andere URLs abzuleiten verbieten die Terms. Wikimedia Commons erlaubt dagegen beliebige Vorschaubreiten, der Adapter fragt bisher nur 640 px an. Das erste Bild der Galerie sollte das schärfste sein.

## What
1. Der Commons-Adapter fordert Vorschauen mit `iiurlwidth=1600` an (Konstante, kommentiert: iPad Pro Overlay ≈ 1800 physische Pixel breit). `thumbUrl` darf eine kleinere Variante bleiben, `imageUrl` ist die 1600-px-Vorschau.
2. Default der Fotoquellen-Kette `sources.photo.order` wird `[commons, airport-data, planespotters]`; `config.example.yaml` und Kommentar nachziehen. Die Zusammenführungsregel „erstes Bild der Galerie = erstes Bild der ersten Quelle mit Treffer“ bleibt; die bisherige Sonderregel „Planespotters-Foto zuerst“ entfällt.
3. Stichproben-Skript meldet zusätzlich je Treffer die Bildabmessungen aus der Antwort, soweit die Quelle sie liefert (Planespotters `size`, Commons `thumbwidth/thumbheight`), damit Airport-Data-Größen beim nächsten Lauf sichtbar werden — ohne Bild-Download.

## Acceptance criteria
- [ ] Commons-Contract-Test: die Anfrage-URL enthält `iiurlwidth=1600`; `imageUrl` ist `thumburl` der Antwort (Fixture mit 1600er thumburl).
- [ ] Config-Test: Default `sources.photo.order` ist `[commons, airport-data, planespotters]`; eine explizit konfigurierte Reihenfolge gewinnt weiterhin.
- [ ] Ketten-Test: bei Treffern aus mehreren Quellen steht das erste Foto der ersten konfigurierten Quelle vorn (kein Planespotters-Vorrang mehr).
- [ ] `scripts/photo-sample.mjs` gibt je Treffer Breite × Höhe aus, wenn die Quelle sie liefert, sonst „?“; kein Bild-Download.
- [ ] `npm test`, `npm run typecheck` grün; bestehende Foto-Tests angepasst, nicht gelöscht.

## Notes
- ADR 0029 Punkt 4 (Default-Kette) wird bei Integration als Amendment nachgezogen (Conductor).
- Reale config.yaml: wenn dort `sources.photo.order` explizit gesetzt ist, greift der neue Default nicht — dann die Reihenfolge dort ändern (Betreiber).

## Outcome

Commons-Adapter fragt `iiurlwidth=1600` an (Konstante `PREVIEW_WIDTH_PX`, kommentiert), `imageUrl` ist die thumburl der Antwort. `PHOTO_SOURCE_NAMES` (und damit der Config-Default `sources.photo.order`) ist jetzt `[commons, airport-data, planespotters]`; `config.example.yaml` nachgezogen. Die Kette selbst hatte keine Planespotters-Sonderregel (sie mischt strikt in Konfigurationsreihenfolge) -- der Vorrang kam nur aus dem alten Default; ein Ketten-Test belegt nun Commons-zuerst. Neues optionales `Photo.size` (Commons thumbwidth/thumbheight, Planespotters thumbnail_large.size); `scripts/photo-sample.src.mjs` gibt je Treffer Breite x Hoehe oder `?` aus (stderr-Zeile und `--json` unter `sizes`), ohne Bild-Download; `photo-sample.mjs` ist nur ein esbuild-Launcher, keine Kopie noetig. Bestehende Foto-/Config-/Wiring-Tests angepasst. Hinweis Betreiber: ist `sources.photo.order` in der realen config.yaml explizit gesetzt, greift der neue Default nicht. npm test und typecheck gruen.
