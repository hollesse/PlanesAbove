---
id: sky-scene-xw8jv
title: Nummern-Plakette tippen öffnet das Foto-Overlay mit echten Fotos des Flugzeugs; X rechts oben schließt (Prototyp)
status: done
type: feature
context: sky-scene
created: 2026-10-31
completed:
depends_on: [design-system-001-styleguide, design-system-pawdq, design-system-g83gh, airspace-gw6w9]
blocks: []
tags: [foto, overlay, plakette, tippen, prototyp]
related_adrs: [0004, 0017, 0029]
related_research: [aircraft-photo-sources-2026-10-31]
prior_art: []
---

## Why
Erwachsene im Zimmer wollen wie bei Flightradar24 sehen, wie das Flugzeug da oben wirklich aussieht. Für den Prototyp ist die Nummern-Plakette das Tippziel: sie gehört sichtbar zu einem Flugzeug, ist groß genug und verwechselt sich nicht mit dem Vorlesen.

## What
Tippt jemand auf die **Nummern-Plakette** eines Flugzeugs (in der Szene neben dem Flugzeug, `pa-badge-slot`, oder in der Info-Zeile, `pa-badge` in `renderInfoRow`), holt der Client `GET /api/photos/:icao24` (airspace-gw6w9, ADR 0029) und öffnet das **Foto-Overlay** (design-system-pawdq) über der Szene — bei mehreren Fotos als Galerie, bei leerer oder gestörter Antwort im Zustand „Kein Foto“. Das **X** rechts oben schließt; ebenso ein Tipp auf die abgedunkelte Fläche (Baustein-Verhalten). Es gibt **kein automatisches Schließen** (Entscheidung des Betreibers am 2026-10-31): das Overlay bleibt offen, bis jemand es schließt, auch wenn das Flugzeug inzwischen die Szene verlassen hat oder die Szene sich dahinter neu rendert.

Ein Tipp auf die Plakette löst **kein Vorlesen** aus; Tippen auf Flugzeug oder Text liest weiterhin vor. Die Vorlese-Sperre und die Slot-Regeln (ADR 0017) bleiben unberührt: ein offenes Overlay hält keinen Slot fest und unterbricht kein laufendes Vorlesen. Die **Einzelansicht** (ein Flugzeug) hat im Prototyp keine Plakette und damit kein Foto — bewusst (Betreiber 2026-10-31); ein späterer Task ergänzt das Tippziel dort.

Die Bilder lädt das iPad direkt von den Quell-Hosts (ADR 0029); der Client zeigt je Foto den `licenceText` und den `pageUrl` als Text, wie der Baustein es vorsieht.

## Acceptance criteria
- [ ] Tippen auf eine Nummern-Plakette (Szene oder Info-Zeile, nur Zwei-Flugzeug-Ansicht) öffnet das Foto-Overlay für genau dieses Flugzeug (Slot → icao24); die Treffer-Zuordnung prüft die Plakette **vor** Flugzeug- und Textflächen, sodass kein Vorlesen startet (Unit-Test für die Zuordnung, z. B. Erweiterung von `tapTarget`).
- [ ] Das Overlay zeigt die Fotos aus `GET /api/photos/:icao24`; `status: 'ok'` → ein Foto oder Galerie, `'none'`/`'unavailable'`/Netzfehler/404 → Zustand „Kein Foto“; nie eine Fehlermeldung an der Wand. Während des Ladens der Zustand „Lädt“.
- [ ] Das X rechts oben (und ein Tipp auf die Abdunklung) schließt das Overlay; danach ist die Szene unverändert bedienbar (Vorlesen funktioniert). Kein Timer, kein Auto-Close beim Verschwinden des Flugzeugs.
- [ ] Das Overlay überlebt Szenen-Updates: es ist außerhalb des neu gerenderten Szenen-Wurzelknotens montiert (oder wird nach jedem Voll-Render wieder angehängt) und bleibt bei Takt-Update, Übergang, Himmel-/Stale-Wechsel und beim Verschwinden des Flugzeugs offen (Unit-Test über `render`/`data-planes`-Wechsel).
- [ ] Tippen auf Flugzeug oder Text liest weiterhin den Steckbrief vor; ein offenes Overlay ändert Vorlese-Sperre, Slot-Haltezeit und Auswahl nicht; Tippen auf Flugzeug/Text unter dem offenen Overlay ist nicht möglich (Overlay fängt Tipps). Bestehende Tests bleiben grün.
- [ ] Einzelansicht: kein Tippziel, kein Overlay (bewusst); ein Test stellt sicher, dass ein Tipp auf die Info-Leiste im Einzelbild weiterhin nur vorliest.
- [ ] Playwright-E2E (WebKit) gegen gemockte Foto-API: „zwei Flugzeuge, Plakette 2 tippen → Galerie blättern → X“, „Kein Foto“ und „Flugzeug verschwindet bei offenem Overlay → Overlay bleibt, X schließt“.
- [ ] Das Overlay fühlt sich an der Wand ruhig an: Öffnen/Schließen ohne Flackern der Szene dahinter. [human-eye]

## Notes
- Planespotters-Terms (2026-10-31, Primärtext): Link-back muss als QR-Code erfolgen, URL als Text genügt nicht → hängt zusätzlich an design-system-g83gh.
- Prototyp-Scope laut Betreiber (2026-10-31): nur Plakette als Auslöser, nur X (und Abdunklung) zum Schließen, kein Auto-Close, Einzelansicht ohne Foto. Folge-Idee für später: Tippziel in der Einzelansicht (Plakette „1“ auch dort oder Foto-Symbol) und optional ein Auto-Close, falls ein offenes Foto die Wandszene zu lange verdeckt.
- Datenvertrag: `Photo { id, thumbUrl, imageUrl, photographer, source, pageUrl, licenceText }`, Antwort `{ photos, status }` (airspace-gw6w9). Der Baustein design-system-pawdq bringt Galerie, Zähler, Attributionszeile und X mit; dieser Task verdrahtet nur Tippen, Laden, Montage und Schließen.
- Spannung zur Vision: Non-Goal „Keine Interaktion über das Tippen hinaus“ und v2+-Eintrag „Foto-Knopf“ — bei Abnahme des Prototyps in `vision.md` nachziehen (Betreiber).
- Wenn das Overlay offen ist, während die Vorlese-Sperre läuft: beides unabhängig; das Overlay unterbricht kein laufendes Vorlesen.

## Verifier note (iteration 1)

**REASONS:**
- Kriterien 3 und 5 nicht erfüllt: Ein Tipp, der das Overlay schließt (X oder Abdunklung), fällt in die Szene durch. In `src/client/app/app.ts` läuft `closePhoto` zuerst (setzt `photoHost = undefined`), derselbe Klick bubbelt dann zum `d.root`-Listener, dessen Guard `photoHost.contains(e.target)` jetzt false ist — die Koordinaten werden gegen Plaketten/Flugzeuge/Text geprüft. Folge: Abdunklung oder X über einem Flugzeug/einer Info-Zeile schließt UND liest vor; über einer Plakette schließt und öffnet sofort wieder.
- Reproduziert: Kopie des Worker-Tests `the backdrop closes` mit Klick bei (5,105) (Info-Zeile 1 im Test-Layout) plus `expect(r.audio.played).toBe(0)` schlägt fehl („expected 1 to be +0“). Die Worker-Tests klicken bei (0,0) und prüfen nicht, dass der Narrator nach dem Schließen still bleibt; der Tipp-Fang-Test deckt nur Tipps ab, die nicht schließen.
- E2E prüft es ebenfalls nicht (kein `data-speaking`-Assert nach dem X).
- Rest in Ordnung: badgeTarget vor tapTarget, Host wird nach jedem Render/Übergang wieder angehängt, kein Timer/autoCloseMs, Sperre/Slot/Auswahl unberührt, Einzelansicht liest vor, ScenarioPhotoSource nur im Mock-Zweig ohne injizierten Fetch, 404 außerhalb der Auswahl unverändert, Design-System-Modul importiert, `npm test` grün, README-Delta passend.

**SUGGESTED_FIX:** Ein Tipp, der das Overlay schließt, muss dort enden und nie die Szene erreichen — z. B. `stopPropagation` für Klicks innerhalb des Foto-Hosts oder ein Just-closed-Check im Root-Handler. Unit-Tests: Schließen per X und per Abdunklung an Koordinaten über Flugzeug, Info-Zeile und Plakette, Assert `audio.played === 0` und kein erneut geöffnetes Overlay. E2E: `data-speaking` bleibt `'false'` nach dem X.

**ITERATION_HINT:** likely-fixable

## Outcome

Nummern-Plakette tippen (Szene oder Info-Zeile, nur Zwei-Flugzeug-Ansicht) öffnet das Foto-Overlay des Designsystems für das Flugzeug n-1 mit Fotos aus /api/photos/:icao24 (Lädt / Galerie / Kein Foto). Das Overlay liegt in einem eigenen Host neben der Bühne (src/client/app/app.ts), wird nach jedem Render/Übergang wieder angehängt, schließt nur per X oder Abdunklung. Iteration 2 behebt den Durchfall: der Foto-Host stoppt per click-Listener (stopPropagation) jeden Tipp im Overlay, so dass auch der schließende Tipp nie die Szene erreicht (kein Vorlesen, kein Wieder-Öffnen über Plakette); das Designsystem-Overlay blieb unverändert. Unit-Tests (tests/unit/app.test.ts) schließen per X und Abdunklung sowie klicken Pfeil, Bild, Rahmen, QR, Text über Flugzeug, Info-Zeile und Plakette und prüfen audio.played === 0, ein einziges Overlay/Host. E2E (tests/e2e/photo-overlay.spec.ts) prüft data-speaking 'false' nach dem X; der Helfer tapAt wartet jetzt robust auf die Bounding-Box (vorher sporadisch null bei Re-Render).
