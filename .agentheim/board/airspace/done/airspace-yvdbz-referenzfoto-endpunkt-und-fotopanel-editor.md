---
id: airspace-yvdbz
title: Referenzfoto-Endpunkt GET /api/photos/reference und Fotopanel im Lackierungs-Editor (ADR 0033)
status: done
type: feature
context: airspace
created: 2026-11-01
completed:
depends_on: [sighting-log-js2t1, sighting-log-r3kw8]
blocks: []
tags: [editor, fotos]
related_adrs: [0007, 0029, 0033]
related_research: []
prior_art: [airspace-hejpw-airport-data-ausbauen-planespotters-nur-als-fallback]
---

## Why
Beim Zeichnen will Papa ein echtes Foto der Airline auf dieser Typklasse neben dem Brett sehen (README livery-editor: „Referenzfoto“).

## What
**Server (airspace, ADR 0033 §2):** `GET /api/photos/reference?icao24=<hex>&registration=<optional>`.
- Antwortet nur für Hexes, die in `sightings` vorkommen; die Prüfung läuft über `knownAircraft` aus sighting-log (sighting-log-r3kw8), airspace liest die Tabelle nie selbst (ADR 0007).
- Für die Abfrage zählt das gespeicherte Kennzeichen aus `knownAircraft`. Ein `registration`-Parameter wird nur verwendet, wenn er (getrimmt, in Großbuchstaben) genau diesem gespeicherten Kennzeichen entspricht, sonst ignoriert. So bleibt der Endpunkt kein offener Proxy auf die Commons-Suche.
- **Nur Wikimedia Commons**, kein Planespotters-Fallback, unabhängig von `sources.photo.order`/`fallback`: Planespotters liefert nur 280 px und reicht zum Nachzeichnen nicht (Entscheidung des Betreibers 2026-11-01). Dafür eine eigene `PhotoSourceChain` nur mit dem Commons-Adapter (im Mock-Modus die `ScenarioPhotoSource`) hinter einem eigenen `PhotoService` (24-h-Speichercache je Hex, Backoff je Quelle wie gehabt). Keine neue Rate-Limit-Logik, kein Bild-Proxy (ADR 0029). Der Live-Fotoweg `/api/photos/:icao24` bleibt unverändert.
- Ohne gespeichertes Kennzeichen wird Commons gar nicht gefragt (der Adapter braucht eins); Antwort `status: none`.
- Antwort wie `/api/photos/:icao24`: `{ photos, status }`. Ungültiger Hex (nicht 6 Hex-Zeichen) → 400, nie gesehener Hex → 404, beides ohne Abfrage der Fotoquellen.

**Editor (livery-editor, Fotopanel):** Ein Fotopanel neben dem Brett.
- Sobald in der Sichtungsauswahl eine Kombination (Airline-Gruppe + Typklasse) gewählt ist, nimmt das Panel die `samples` der passenden Zeile (`prefix` + `typklasse`) und fragt sie nacheinander ab (mit `registration`, falls vorhanden). Es hört beim ersten Sample mit `status: ok` auf und zeigt dessen erstes Foto.
- Gezeigt werden das Bild in der größten Commons-Vorschau, die die Kette liefert (`imageUrl`, vom Browser direkt von Commons geladen), dazu Fotograf, Quelle und Lizenztext (CC BY / CC BY-SA verlangt Attribution) sowie ein klickbarer Link auf `pageUrl` in neuem Tab.
- Zustände: keine Kombination gewählt („Keine Sichtung gewählt“), lädt, kein Foto in allen Samples („Kein Foto“), Heimserver nicht erreichbar bzw. alle Abfragen fehlgeschlagen („Foto nicht verfügbar“). Wechselt die Kombination während einer laufenden Suche, wird die alte Antwort verworfen.
- Ohne Heimserver und ohne Sichtungsauswahl arbeitet der Editor unverändert weiter.

## Acceptance criteria
- [ ] `GET /api/photos/reference?icao24=<hex>` für einen Hex aus `sightings` antwortet 200 mit `{ photos, status }` aus der Fotokette (Unit/Contract-Test mit Scenario-Fotoquelle).
- [ ] Nie gesehener Hex → 404, ungültiger Hex → 400; in beiden Fällen wird keine Fotoquelle gefragt (Test zählt Quellenaufrufe).
- [ ] Die Fotokette bekommt das gespeicherte Kennzeichen des Hex. Ein abweichender `registration`-Parameter wird ignoriert, ein gleicher nicht doppelt verwendet. Test: Commons-Fake sieht nur das gespeicherte Kennzeichen.
- [ ] Der Endpunkt fragt nur Commons: Auch wenn Commons nichts findet und Planespotters als Fallback konfiguriert ist, wird Planespotters nie gefragt (Test mit beiden Fakes). `/api/photos/:icao24` fragt weiter nach Konfiguration.
- [ ] Hex ohne gespeichertes Kennzeichen → 200 mit `status: none`, ohne dass Commons gefragt wird.
- [ ] Ein zweiter Abruf desselben Hex innerhalb der Cache-Zeit fragt Commons nicht erneut.
- [ ] Editor-E2E (gemockter Heimserver): Nach Auswahl einer Kombination zeigt das Fotopanel das erste Foto des ersten Samples mit Foto (das erste Sample liefert `none`, das zweite `ok`), mit Fotograf, Quelle, Lizenz und einem Link auf `pageUrl` mit `target="_blank"`. Das dritte Sample wird nicht abgefragt.
- [ ] Editor-E2E: „Kein Foto“, wenn alle Samples `none` liefern; „Foto nicht verfügbar“, wenn die Abfragen scheitern; „Keine Sichtung gewählt“ ohne Auswahl. Die Seite wirft in keinem Fall einen Fehler.
- [ ] Editor-E2E: Ein Kombinationswechsel während einer langsamen Antwort zeigt nur das Foto der neuen Kombination.
- [ ] README airspace nennt den Endpunkt (Fotoquelle/Referenzfoto); README livery-editor beschreibt das Fotopanel.
- [ ] Das Fotopanel steht neben dem Brett, ohne das Zeichnen zu verdecken, und das Foto ist groß genug, um die Lackierung zu erkennen. [human-eye]

## Notes
- Captured 2026-11-01 als dritter Teil der Editor-Sichtungs-Anbindung. Verfeinert 2026-11-01: Kennzeichen kommt aus sighting-log-r3kw8 (Entscheidung des Betreibers: mit erfassen, damit Commons im Editor greift). Nur Commons, weil Planespotters zum Nachzeichnen zu schlecht ist (Betreiber, 2026-11-01). Abweichung von ADR 0033 §2 („bestehende Fotokette“): Der Worker ergänzt ADR 0033 um ein kurzes Amendment.
- Wo der Endpunkt im Code liegt: Neben der Route `/api/photos/:icao24` in `src/server/app.ts`. `knownAircraft` wird dort hineingereicht (wie `sightings`). Im Mock-Modus liefert `ScenarioPhotoSource` die Fotos. Der Commons-Adapter wird mit derselben Konfiguration (Timeout, User-Agent) gebaut wie in `mkPhotoSource`.
- Das Fotopanel ist Editor-eigene UI außerhalb des Storybook-Gates (README livery-editor, ADR 0034); kein `design-system-001-styleguide` in `depends_on`.
- Der Editor erreicht den Server nur über den Vite-Proxy `/api` → `PLANESABOVE_HOME_URL` (ADR 0033 §4); keine CORS-Änderung.
- Reale config.yaml anpassen: nein.

## Outcome

Server: `GET /api/photos/reference` in `src/server/app.ts` (neben `/api/photos/:icao24`). Pruefung per `knownAircraft`, eigene Commons-only `PhotoSourceChain` + `PhotoService` (Mock-Modus: `ScenarioPhotoSource`); nur das gespeicherte Kennzeichen wird verwendet, `registration`-Parameter wirkungslos; 400/404/none-Faelle ohne Quellenabfrage. Tests: `tests/unit/server/photo-reference.test.ts` (5).

Editor: Fotopanel (`<aside id="photo">`, rechts neben dem Brett) in `tools/livery-editor/index.html` + `src/main.ts` (`updatePhoto`: Samples der Zeile prefix+Typklasse nacheinander, stoppt beim ersten `ok`, verwirft veraltete Antworten per Request-Zaehler; Zustaende Keine Sichtung gewaehlt / Lade Foto / Kein Foto / Foto nicht verfuegbar). `gaps.ts` typisiert `samples`. E2E: `tests/e2e-editor/photo-panel.spec.ts` (5). Das [human-eye]-Kriterium (Layout, Fotogroesse) ist nicht automatisch geprueft.

Hinweis Verifikation: `npm test` (858 gruen) und `npm run typecheck` gruen. Die E2E-Konfiguration war hier nicht direkt lauffaehig (Port 5174 von einem fremden Editor belegt, storybook-static fehlt im Worktree); die Editor-Specs sightings und photo-panel liefen gruen ueber eine temporaere Config auf Port 5199, die Storybook-abhaengigen Specs draw-and-compare und logo blieben mangels storybook-static unausgefuehrt.

Noch zu tun durch den Conductor: README livery-editor (kein Worker-Delta fuer fremdes BC moeglich): Bullet **Referenzfoto** ersetzen durch: echtes Foto der Airline auf dieser Typklasse aus Wikimedia Commons (nur Commons, GET /api/photos/reference des Heimservers), in einem Fotopanel rechts neben dem Brett; das Panel fragt die Samples der gewaehlten Zeile nacheinander ab und zeigt das erste Foto mit Fotograf, Quelle, Lizenz und Link auf die Quellseite (neuer Tab); Zustaende Keine Sichtung gewaehlt / Kein Foto / Foto nicht verfuegbar. Relationship-Zeile 'Customer of airspace-Fotokette' entsprechend 'nur Commons'.
