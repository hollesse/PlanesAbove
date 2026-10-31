---
id: sky-scene-xw8jv
title: Nummern-Plakette tippen öffnet das Foto-Overlay mit echten Fotos des Flugzeugs; X rechts oben schließt (Prototyp)
status: backlog
type: feature
context: sky-scene
created: 2026-10-31
completed:
depends_on: [design-system-001-styleguide, design-system-pawdq, airspace-gw6w9]
blocks: []
tags: [foto, overlay, plakette, tippen, prototyp]
related_adrs: [0004, 0017]
related_research: [aircraft-photo-sources-2026-10-31]
prior_art: []
---

## Why
Erwachsene im Zimmer wollen wie bei Flightradar24 sehen, wie das Flugzeug da oben wirklich aussieht. Für den Prototyp ist die Nummern-Plakette das Tippziel: sie gehört sichtbar zu einem Flugzeug, ist groß genug und verwechselt sich nicht mit dem Vorlesen.

## What
Tippt jemand auf die **Nummern-Plakette** eines Flugzeugs (in der Szene neben dem Flugzeug oder in der Info-Zeile), holt der Client die Fotos dieses Flugzeugs vom Server (airspace-gw6w9) und öffnet das **Foto-Overlay** (design-system-pawdq) über der Szene; bei mehreren Fotos als Galerie. Das **X** rechts oben schließt. Ein Tipp auf die Plakette löst **kein** Vorlesen aus; Tippen auf Flugzeug oder Text liest weiterhin vor wie bisher. Das Overlay verdeckt die Wandszene nicht dauerhaft: es schließt von selbst, wenn das Flugzeug die Szene verlässt oder nach einer Höchstdauer. Die Vorlese-Sperre und die Slot-Regeln (ADR 0017) bleiben unberührt — ein offenes Overlay hält keinen Slot fest.

## Acceptance criteria
- [ ] Tippen auf eine Nummern-Plakette (Szene oder Info-Zeile) öffnet das Foto-Overlay für genau dieses Flugzeug; `tapTarget` o. ä. ordnet die Plakette vor Flugzeug-/Textflächen zu, sodass kein Vorlesen startet.
- [ ] Das Overlay zeigt die Fotos aus `GET /api/photos/:icao24`; bei mehreren Fotos als Galerie, bei leerer Antwort den Zustand „Kein Foto“, bei Fehler ebenfalls „Kein Foto“ (nie eine Fehlermeldung an der Wand).
- [ ] Das X rechts oben schließt das Overlay; danach ist die Szene unverändert bedienbar (Vorlesen funktioniert).
- [ ] Das Overlay schließt von selbst, wenn das zugehörige Flugzeug aus der Szene verschwindet, spätestens nach `scene.photoOverlayMaxSeconds` (Default 90).
- [ ] Tippen auf Flugzeug oder Text liest weiterhin den Steckbrief vor; ein offenes Overlay ändert Vorlese-Sperre, Slot-Haltezeit und Auswahl nicht (bestehende Tests bleiben grün).
- [ ] Playwright-E2E (WebKit) gegen gemockte Foto-API: Szenarien „zwei Flugzeuge, Plakette 2 tippen → Galerie → X“, „Kein Foto“ und „Flugzeug verschwindet bei offenem Overlay“.

## Notes
- Prototyp-Scope laut Betreiber: nur Plakette als Auslöser, X zum Schließen. Die Plakette existiert heute nur in der Zwei-Flugzeug-Ansicht (`renderBadgeSlot`, `renderInfoRow`); in der Einzelansicht gibt es derzeit kein Tippziel — Entscheidung des Betreibers in REFINE: Plakette auch im Einzelbild zeigen, ein kleines Foto-Symbol, oder Einzelbild im Prototyp ohne Foto.
- Spannung zur Vision: Non-Goal „Keine Interaktion über das Tippen hinaus“ und v2+-Eintrag „Foto-Knopf“ — bei Abnahme des Prototyps in `vision.md` nachziehen.
- Wenn das Overlay offen ist, während die Vorlese-Sperre läuft: beides unabhängig; das Overlay unterbricht kein laufendes Vorlesen.
