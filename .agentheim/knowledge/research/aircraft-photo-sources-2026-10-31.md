---
topic: Kostenlose Fotoquellen für ein konkretes Flugzeug (Lookup per Kennzeichen/Hex) für ein Foto-Overlay mit Galerie
date: 2026-10-31
requested_by: model
related_tasks: [airspace-gw6w9, design-system-pawdq, sky-scene-xw8jv]
---

# Research: Kostenlose Fotoquellen für ein konkretes Flugzeug (Lookup per Kennzeichen/Hex)

## Question
Woher bekommen wir kostenlos echte Fotos eines *bestimmten* Flugzeugs (Lookup per Registrierung und/oder ICAO24-Hex) für ein Foto-Overlay auf dem Kinderzimmer-iPad (wie Flightradar24 mit JetPhotos)? Idealerweise mehrere Plattformen für eine kleine Galerie. Pro Kandidat: Lookup-Endpoint, Auth/Kosten/Limits, Lizenz/Attribution/Hotlinking/Caching, Abdeckung (Airliner vs. D-Exxx), ein oder mehrere Fotos.

## Summary

**Wichtigste Einschränkung der Recherche:** Die offizielle Planespotters-Doku (`planespotters.net/photo/api`) und die Planespotters-ToU waren per WebFetch nicht abrufbar (HTTP 403). Die Planespotters-Bedingungen unten stammen aus (a) Zusammenfassungen der WebSearch-Tools, die die offizielle Doku wiedergeben, (b) einem Live-Test der API und (c) Zitaten aus Open-Source-Projekten, die die Terms am 19./26.10.2026 gelesen haben. Das ist Sekundärquellenniveau; vor Implementierung die Doku im Browser selbst lesen.

- **Planespotters ist die einzige keylose Quelle mit expliziter, API-spezifischer Nutzungsregelung** und Lookup per Hex *und* Reg. Sie liefert aber **genau ein Foto** pro Abfrage und verlangt: Fotografen-Credit als Text neben dem Bild, Bild verlinkt auf `link` (ohne `nofollow`), Bild-URL unverändert vom Anzeigegerät laden (kein Download/Rehosting/Proxy), JSON max. 24 h cachen, nicht als bezahltes/Premium-Feature. Das heißt: **iPad-Browser lädt Thumbnail direkt von `t.plnspttrs.net`**; ein Server-Proxy oder lokaler Bild-Cache wäre nach den (sekundär zitierten) Terms nicht erlaubt.
- **Galerie-Potenzial gibt es nur durch Kombination:** Planespotters (1 Foto) + hexdb.io (1 Foto, Hex) + Airport-Data (bis zu n Fotos per Hex, Param `n`) + Wikimedia Commons (mehrere, per Reg-Suche, lizenzklar CC BY/BY-SA). Eine einzelne Quelle liefert nur bei Airport-Data und Commons mehrere Bilder.
- **Lizenzklar ist nur Wikimedia Commons** (pro Datei CC-Lizenz maschinenlesbar, Attribution Pflicht, Hotlinking erlaubt aber "nicht empfohlen"). Die Treffer sind aber eher für bekannte Airliner/Muster als für D-Exxx-Kleinflugzeuge, und Suchtreffer per Freitext müssen auf Registrierung gefiltert werden (Fehltreffer-Risiko).
- **Airport-Data und hexdb.io: keine veröffentlichten Nutzungsbedingungen für Fotos.** Urheberrecht liegt bei den einzelnen Fotografen (Moderator im Airport-Data-Forum, informell). Technisch keylos und einfach; rechtlich unklar. Für einen privaten, nicht-kommerziellen Haushaltseinsatz mit Credit+Link ist das Risiko gering, aber nicht "lizenzklar".
- **JetPhotos, Airliners.net, airhistory.net: keine öffentliche API, Fotos "alle Rechte beim Fotografen"; Scraping/Hotlinking nicht erlaubt bzw. nicht belegt erlaubt.** Nicht empfohlen.
- Beobachtung zur Praxis: tar1090 hat `planespottersAPI = true` in `config.js` (Quelle: context7-Auszug der tar1090-Doku), und ADS-B Exchange sagt, seine Fotos kämen von Planespotters. Planespotters ist also de facto der Standard für keyless Dashboards.

### Ranking (keylos + lizenzsauber + Lookup per Reg/Hex zuerst)

| # | Quelle | Lookup per | Keyless? | Lizenz / Attribution | Hotlink / Cache | Mehrere Fotos | GA-Abdeckung (D-Exxx) |
|---|---|---|---|---|---|---|---|
| 1 | Planespotters Photo API | Hex und Reg | ja | Foto © Fotograf; API-Terms: Credit-Text + Link auf Planespotters-Seite, nicht-exklusiv/nicht Premium | Bild direkt vom API-Thumbnail im Browser; kein Speichern/Proxy; JSON ≤ 24 h (sekundär zitiert) | nein, 1 Foto | gut bei Airlinern; GA mittel, unbelegt |
| 2 | Wikimedia Commons API | Freitextsuche Reg (Namespace File) | ja (UA-Header nötig) | CC BY / CC BY-SA je Datei, maschinenlesbar (`extmetadata`); Attribution Pflicht | Hotlink möglich, "nicht empfohlen"; Cache/Kopie bei Lizenzeinhaltung ok | ja | Airliner gut, GA schlecht |
| 3 | Airport-Data `ac_thumb.json` | Hex (`m=`), Reg (`r=`) | ja | keine veröffentlichten Terms; Copyright beim Fotografen | unklar; Thumbnails liegen auf airport-data.com | ja (`n=`) | Airliner gut, GA mittel (unbelegt) |
| 4 | hexdb.io Image | Hex | ja | keine Terms/Lizenz veröffentlicht | v2 `/image` liefert 302 auf Bild; Hosting bei hexdb | nein, 1 Foto | unbelegt |
| 5 | adsbdb `url_photo` | Hex/Reg über bestehende Abfrage | ja | Quelle laut README: Airport-Data; keine Lizenz | adsbdb-Felder `url_photo`, `url_photo_thumbnail` (nullable) | nein, 1 Foto | unbelegt |
| 6 | Flickr API | Freitext/Tag | Key nötig (kostenlos, nicht-kommerziell) | Lizenz pro Foto filterbar, Attribution je Lizenz | Cache nur "angemessene Zeit"; max. 30 Fotos/Seite | ja | schlecht planbar |
| 7 | JetPhotos | keine offizielle API | n/a | Rechte beim Fotografen | Hotlink/Scraping nicht freigegeben | n/a | n/a |
| 8 | Airliners.net | keine API gefunden | n/a | "All rights reserved", Weiterverwendung nur mit Erlaubnis | nicht erlaubt belegt | n/a | n/a |
| 9 | airhistory.net | keine API gefunden | n/a | Fotograf behält Rechte; Downloads nicht weiterverwenden | nicht erlaubt | n/a | n/a |

## Findings

### 1. Planespotters.net Photo API
- **Endpoints:** `https://api.planespotters.net/pub/photos/hex/<ICAO24>` und `https://api.planespotters.net/pub/photos/reg/<REG>`. Wenn Hex bekannt ist, werden nur Fotos des aktuellen Flugzeugs geliefert; bei unbekanntem Hex wird auf die dem Hex zugeordnete Registrierung zurückgefallen [1][2].
- **Live-Test (31.10.2026):** `reg/D-AIXA` lieferte ein Foto (Fotograf "AsharkNGB", Thumbnail 200x113, `thumbnail_large` 498x280, Link-Slug "d-aixa-lufthansa-airbus-a350-941"). `hex/3C6444` lieferte ein Objekt `photos` mit genau 1 Eintrag. Felder: `id` (String), `thumbnail{src,size{width,height}}`, `thumbnail_large{src,size}`, `link`, `photographer`. Bild-Host: `t.plnspttrs.net` [3]. Eine leere `photos`-Liste kommt bei keinem Treffer [1].
- **Auth/Kosten:** kein Key, kostenlos, keine Custom-Parameter [1][2]. Generische Library-User-Agents (curl, python-requests) sind unerwünscht und können geblockt werden [1]; Open-Source-Projekte zitieren: für Non-Browser-Clients ein beschreibender User-Agent mit Kontakt-URL/E-Mail [4]. Ein Rate-Limit wurde nicht gefunden.
- **Terms (sekundär):** Fotograf als Text neben dem Bild; Thumbnail verlinkt auf `link`, ohne `nofollow`; nicht als exklusives Bezahl-/Premium-/Mitgliederfeature; Zugriff kann entzogen werden [1][2]. Bilddateien nicht herunterladen/rehosten, sondern im Browser des Endnutzers von der gelieferten URL laden [1][5][6]. Alle von der API gelieferten URLs unverändert verwenden [4]. JSON bis zu 24 h cachebar [4][6]. Weitere zitierte Verbote: kein ML-Training mit Fotos/Metadaten, kein Re-Exposing der Daten über eigene API oder Bulk-Export [7].
- **Widerspruch:** Die alten allgemeinen ToU (Dez. 2012) erlauben Thumbnails mit Fotografen-Credit und Link, begrenzt auf 200 px längste Seite [8]. Die API-Terms nennen `thumbnail_large` (280 px Höhe) [1]. Die ToU von 2012 und die API-Terms sind nicht deckungsgleich; für die API gelten die API-Terms. Zudem sagt `Jxck-S/aircraft-photos`, Planespotters habe seine Fotos "nicht genehmigt", was eine Alternative (nicht Planespotters-Nutzung per API) beschreibt [9].
- **Coverage:** Planespotters zeigt laut ADS-B-Exchange-Support das *neueste* Foto zu Hex und Reg, es kann falsch sein [10]. GA-Abdeckung nicht belegt.
- **Galerie:** nein, nur ein Foto pro Abfrage [1][2].
- **Folge für die Architektur:** Wenn ein lokaler Proxy/Cache der Bilder gewünscht ist, passt das nicht zu den zitierten Terms; der iPad-Browser müsste direkt laden. Das ist eine Entscheidung für den Leser (ADR).

### 2. hexdb.io
- **Endpoints:** v2 `GET https://hexdb.io/api/v2/aircraft/{hex}/image` (302-Redirect auf das Foto, direkt als `<img src>` nutzbar) und `/image/thumbnail`; Legacy `https://hexdb.io/hex-image?hex={HEX}` und `hex-image-thumb?hex={HEX}` liefern die Bild-URL als Text. Kein Foto: JSON 404; Aircraft-Record hat dann `images: null` [11].
- **Live-Test:** `/api/v2/aircraft/3C6444/image` lieferte ein JPEG (ca. 670 KB, Vollbild) [11-Test].
- **Auth/Limits:** "Free · No API key". Auf der Startseite steht kein Limit [11]; eine andere Suchzusammenfassung der gleichen Seite nennt max. 1000 Requests/5 Minuten und IP-Blocks bei Missbrauch [12]. **Widerspruch** zwischen den beiden Seitenauszügen; konservativ mit 1000/5 min planen.
- **Lizenz:** Keine Terms, keine Bildlizenz; Footer nennt Datenquellen (PlaneBase/PlanePlotter, Jim Mason, Steve Hibberd, ip2location, Airport-Data), ohne Zuordnung zu den Bildern [11]. Urheber/Credit nicht in der Antwort enthalten.
- **Coverage/Galerie:** nur Hex-Lookup, ein Foto. GA-Abdeckung nicht belegt.

### 3. Airport-Data.com
- **Endpoint:** `https://airport-data.com/api/ac_thumb.json?m=<HEX>&n=<N>` (Live-Test mit `m=3C6444&n=3`: `status: 200`, `count: 3`, `data[]` mit `image` (Thumbnail-JPG unter `/images/aircraft/thumbnails/`), `link` (Seite unter `/aircraft/photo/`), `photographer`; alles auf airport-data.com) [13]. Reg-Parameter `r=` ist aus der Dokumentation nicht verifiziert, da die Doku-URL `airport-data.com/api` per WebFetch 404 lieferte.
- **Auth/Limits:** im Test keylos; Limits nicht gefunden.
- **Terms:** Keine Terms für die Foto-Nutzung gefunden. Im Airport-Data-Forum gibt es mehrere Threads zur Nutzung in Apps/Produkten (u. a. #10970, #7267, #8192); die Antworten waren nicht abrufbar (Seite lud nicht) [14]. Ein Moderator verweist laut Suchauszug auf die Fotografen als Rechteinhaber (informell) [15]. adsbdb nutzt Airport-Data als Fotoquelle [16].
- **Galerie:** ja, bis `n` Fotos per Hex. Das ist die einzige keylose Quelle mit Mehrfach-Ergebnis plus Fotografennamen.
- **Offen:** Hotlink-/Cache-Regeln unbekannt; für Fotos muss mit Credit + Link gearbeitet werden.

### 4. adsbdb (bereits im Projekt)
- Aircraft-Antwort enthält `url_photo` und `url_photo_thumbnail` (`string || null`, nicht änderbar). README nennt Airport-Data als Fotoquelle; keine Lizenz oder Rate-Limit-Angabe; der einzige Hinweis auf Nutzungseinschränkung betrifft Routendaten ("may not be copied, published, or incorporated into other databases") [16]. Die Antwort enthält keinen Fotografen-Credit. Praktisch gleiche Quelle wie Airport-Data (eine Vorschau-Datei). Das Projekt nutzt adsbdb schon; die Felder gäbe es also ohne zusätzlichen Request.

### 5. Wikimedia Commons API
- **Endpoint (Live-Test):** `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=D-AIXA&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640&format=json`. Ergebnis: 5 Dateien, alle zu D-AIXA, Thumbnails unter `thumb.wikimedia.org`, `extmetadata` mit `LicenseShortName` (CC BY-SA 4.0 / CC BY 4.0), `Artist`, `AttributionRequired: true` [17].
- **Auth:** kein Key. (Wikimedia verlangt allgemein einen beschreibenden User-Agent; nicht in dieser Recherche gegen die Policy-Seite geprüft.)
- **Lizenz/Attribution:** Urheber nennen (nicht nur Uploader), Lizenz benennen/verlinken, ShareAlike beachten; Hotlinking ist "möglich, aber nicht empfohlen"; Wikimedia gibt keine Gewähr für Rechtestatus [18]. Lokaler Cache bei Einhaltung der Lizenz zulässig (aus [18] abgeleitet, nicht ausdrücklich dort so formuliert).
- **Galerie:** ja. **Coverage:** Airliner mit Aufmerksamkeit gut, D-Exxx selten (nicht gemessen). Freitextsuche kann falsche Dateien liefern (Dateiname/Beschreibung enthält Kennzeichen, aber evtl. anderes Flugzeug); Filter nötig. Open-Source-Projekt overhead-board nutzt Commons nur als "MODEL ONLY"-Fallback (Typfoto), nicht Flugzeug-spezifisch [4].
- **Typfoto-Fallback:** Für den ICAO-Typcode könnte Commons ein generisches Musterfoto liefern; das ist ein eigener Lookup, hier nicht untersucht.

### 6. Flickr API
- Key erforderlich (nicht-kommerzieller Key kostenlos; Hauptzweck Umsatz = kommerziell) [19]. App muss Disclaimer "nicht von SmugMug/Flickr zertifiziert" zeigen; Cache nur "angemessen"; max. 30 Fotos/Seite; Rechte der Besitzer (CC bzw. all rights reserved) bleiben maßgeblich [19]. `flickr.photos.search` hat einen `license`-Parameter (kommagetrennte IDs aus `flickr.photos.licenses.getInfo`); max. 4000 Ergebnisse je Suche [20]. Registrierungs-Tag-Suche ungeprüft; Qualität und Trefferquote unbelegt. Erfordert Key-Verwaltung, vom Projekt mit Free-only-Prinzip vereinbar, aber unnötig aufwendig.

### 7. JetPhotos / Flightradar24
- JetPhotos gehört seit August 2015 zu Flightradar24 und liefert die Fotos für deren Website und Apps [21]. **Keine offizielle API** und keine veröffentlichten Terms gefunden. Inoffizielle Endpunkte werden von einer Drittseite mit unklarer Verlässlichkeit erwähnt, mit der Warnung, nicht zu hotlinken/scrapen [22]. Nicht empfohlen.

### 8. Airliners.net
- Terms-Seite war nicht lesbar (Redirect auf `tollbit.airliners.net`, dann HTTP 402, was auf Bot-/Bezahlschranke hindeutet). Keine API gefunden. Fotos tragen "All rights reserved"-Vermerke pro Fotograf; Weiterverwendung auf anderen Seiten laut einem VATSIM-Forumsbeitrag nur mit Erlaubnis [23]. Nicht empfohlen.

### 9. airhistory.net
- Keine API gefunden. FAQ: Fotos bleiben beim Urheber; Downloads dürfen nicht für Gewinn oder andere Zwecke ohne Genehmigung des Rechteinhabers weiterverwendet oder auf anderen Websites gepostet werden [24]. Nicht empfohlen. Das Archiv ist zudem historisch ausgerichtet.

### 10. Weitere Quellen
- **Planefinder:** Fotos über einen Apify-Scraper erhältlich [25]; Scraping, keine offizielle API; nicht empfohlen.
- **Jxck-S/aircraft-photos:** Community-GitHub-Repo mit Fotos je Kennzeichen (`photo-list.json`, `?reg=`), "All photos © their respective photographers", keine Open-Source-Lizenz genannt; für Plane-Notify/tar1090-Overlays gedacht [9]. Sehr kleiner Bestand, nicht skalierbar; interessant als Muster für eine eigene lokale Fotoliste (z. B. D-EBEC der Sportfluggruppe Elz mit eigenen Fotos).
- **OpenSky, FlightAware:** nicht untersucht (kein Foto-Endpoint belegt). Nur eine Suchabfrage, kein Treffer.
- **tar1090:** `showPictures`, `planespottersAPI`, `planespottersLinks` in `config.js` [26]. Die tatsächliche Aufrufstelle im Code habe ich nicht gefunden (WebFetch von `planeObject.js` ohne Treffer, Datei gekürzt).

## Sources
1. [Photo API Docs (Planespotters)](https://planespotters.net/photo/api) — offizielle Doku; per WebFetch 403, nur über Suchzusammenfassung gelesen.
2. [Photo API Docs (www)](https://www.planespotters.net/photo/api) — dito.
3. Live-Abruf `https://api.planespotters.net/pub/photos/reg/D-AIXA` und `/hex/3C6444`, 2026-10-31 — Response-Form verifiziert.
4. [Belstria/overhead-board PR #170](https://github.com/Belstria/overhead-board/pull/170) — zitiert Planespotters-Terms (gelesen 26.10.2026), nutzt adsbdb und Commons als Fallback.
5. [LiveTrafficStan Issue #79](https://github.com/vasilyevstan/LiveTrafficStan/issues/79) — beschreibt Browser-direkt-Laden-Vertrag.
6. [ZenithBoard PR #110](https://github.com/regis57/ZenithBoard/pull/110) — zitiert 24-h-JSON-Cache, kein Speichern/Proxy (Terms gelesen 19.10.2026).
7. Suchzusammenfassung zu Planespotters-Terms (ML-Verbot, kein Re-Exposing) — Quelle [JetPhotos-Suchlauf zu Photo API Docs](https://www.planespotters.net/photo/api); nur sekundär.
8. [Planespotters Terms of Use](https://www.planespotters.net/legal/termsofuse) — allgemeine ToU (Dez. 2012), nur über Suchzusammenfassung gelesen.
9. [Jxck-S/aircraft-photos](https://github.com/Jxck-S/aircraft-photos) — Community-Fotodatenbank pro Kennzeichen.
10. [ADS-B Exchange Support: photo shown is incorrect](https://support.adsbexchange.com/hc/en-us/articles/37364011852301-The-photo-shown-for-the-airplane-selected-is-incorrect-can-you-fix-it) — Fotos von Planespotters, neuestes Foto zu Hex/Reg.
11. [hexdb.io](https://www.hexdb.io/) — Image-Endpoints; keine Terms; Live-Test lieferte JPEG.
12. Suchzusammenfassung zu hexdb.io (Limit 1000 pro 5 min) — Widerspruch zu [11].
13. Live-Abruf `https://airport-data.com/api/ac_thumb.json?m=3C6444&n=3`, 2026-10-31.
14. [Airport-Data-Forum #10970](https://discuss.airport-data.com/d/10970-use-of-photos-in-an-aviation-product-we-are-developing) — Frage zur Nutzung, Antworten nicht abrufbar.
15. [Airport-Data-Forum #796](https://discuss.airport-data.com/d/796-aircraft-n756np) — Suchauszug: Moderator verweist auf Fotografen als Rechteinhaber.
16. [mrjackwills/adsbdb](https://github.com/mrjackwills/adsbdb) — `url_photo`, `url_photo_thumbnail`, Quelle Airport-Data.
17. Live-Abruf Wikimedia Commons API (Suche D-AIXA), 2026-10-31 — Lizenzmetadaten.
18. [Commons:Reusing content outside Wikimedia](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia) — Attribution, Hotlinking.
19. [Flickr API Terms of Use](https://www.flickr.com/services/api/tos/) — nicht-kommerzieller Key, Caching, 30 Fotos/Seite.
20. [Flickr-API-Suchparameter (Jentic)](https://jentic.com/apis/flickr.com/flickr.md) — `license`-Parameter; max. 4000 Ergebnisse.
21. [JetPhotos About](https://jetphotos.com/about.php) — gehört zu Flightradar24.
22. [Jetphotos API (Drittseite)](https://edx.ipeindia.org/mirror-bluff/jetphotos-api) — unzuverlässig; keine offizielle Doku.
23. [VATSIM-Forum: Links to photos on Airliners.net](https://forums.vatsim.net/topic/2173-links-to-photos-on-airlinersnet) — Fotos copyright, nicht ohne Erlaubnis weiterposten.
24. [AirHistory FAQ](https://airhistory.net/info/faq.php) — Rechte beim Fotografen.
25. [Planefinder Photos Scraper (Apify)](https://apify.com/romy/planefinder-photos-scraper) — Scraping-Lösung, keine API.
26. [tar1090 llms.txt (context7)](https://context7.com/wiedehopf/tar1090/llms.txt) — `planespottersAPI`-Config.

## Open questions
- **Wortlaut der Planespotters-API-Terms** (v. a. Cache-Dauer, Proxy-Verbot, User-Agent-Regeln, Rate-Limits): Primärseite per WebFetch 403; nur Sekundärzitate. Im Browser prüfen.
- **Terms/Lizenz von Airport-Data und hexdb.io:** nicht veröffentlicht oder nicht abrufbar; ggf. per Kontaktmail nachfragen (hexdb gibt eine Kontaktadresse an).
- **Airport-Data-API-Doku:** `r=`-Parameter für Registrierung nicht verifiziert (Doku-URL 404).
- **GA-Trefferquote (D-Exxx)** für alle Quellen nicht gemessen. Vorschlag: ein Stichprobenskript gegen 20-30 reale D-E-Kennzeichen aus den Projektdaten laufen lassen (Planespotters, Airport-Data, hexdb). Dafür keine kostenpflichtigen Keys nötig.
- **Wikimedia User-Agent-Policy** und konkrete Rate-Limits nicht geprüft.
- **OpenSky, FlightAware, Planefinder (offizielle API):** nicht ausreichend untersucht; keine Foto-Endpunkte gefunden.
- **tar1090-Code:** Aufrufstelle der Planespotters-API nicht verifiziert.
