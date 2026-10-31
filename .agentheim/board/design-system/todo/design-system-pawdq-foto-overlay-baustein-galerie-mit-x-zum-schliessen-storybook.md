---
id: design-system-pawdq
title: Foto-Overlay-Baustein (Organism) in Storybook — Vollbild-Overlay mit Foto-Galerie, Attribution und X rechts oben zum Schließen
status: todo
type: feature
context: design-system
created: 2026-10-31
completed:
depends_on: [design-system-001-styleguide]
blocks: [sky-scene-xw8jv]
tags: [foto, overlay, galerie, organism, storybook]
related_adrs: [0002, 0009]
related_research: [aircraft-photo-sources-2026-10-31]
prior_art: [design-system-pyheh]
---

## Why
Der Prototyp „echtes Foto des Flugzeugs“ braucht einen abgenommenen UI-Baustein, bevor sky-scene ihn verwendet (Storybook-first, ADR 0002). Vorbild ist das Foto-Overlay von Flightradar24: Bild groß über der Szene, schließen über ein X rechts oben.

## What
Ein Organism **Foto-Overlay** im Design-System: liegt über der Himmelsszene (Szene bleibt dahinter sichtbar, abgedunkelt), zeigt ein Foto des Flugzeugs möglichst groß im 4:3-Rahmen des iPads, darunter eine dezente Zeile mit Kennzeichen · Typ · Airline und die **Attribution** (Fotograf, Plattform, Link als Text). Gibt es mehrere Fotos, wird daraus eine **Galerie**: Punkte/Zähler („2 / 5“) und Blättern per Tippen auf die linke/rechte Bildhälfte oder Wischen. Ein **X** rechts oben schließt das Overlay. Zustände: ein Foto, mehrere Fotos, Ladezustand, **Kein Foto** (kurzer, freundlicher Hinweis statt leerem Rahmen). Alles in Tokens/Typografie des Styleguides; Safari-16-tauglich.

## Acceptance criteria
- [ ] Story `Organisms/Foto-Overlay` mit den Zuständen „Ein Foto“, „Galerie (mehrere Fotos)“, „Lädt“ und „Kein Foto“, je bei 4:3 (Default) und 5:3.
- [ ] Das X sitzt rechts oben, ist mindestens 64 × 64 px groß (Tippziel für Kinderhand) und löst einen `close`-Callback aus; Tippen auf die abgedunkelte Fläche außerhalb des Fotos schließt ebenfalls.
- [ ] In der Galerie wechselt Tippen auf die rechte/linke Bildhälfte (und Wischen) zum nächsten/vorigen Foto; Zähler und Punkte stimmen mit dem Index überein; am Ende wird nicht weitergeblättert.
- [ ] Jede Foto-Ansicht zeigt die Attributionszeile mit Fotograf und Plattform exakt im vom Datensatz gelieferten Text (`licenceText`), nie gekürzt; der Link zur Originalseite ist als Text sichtbar (Kiosk hat keinen Browser-Wechsel).
- [ ] Der Baustein nimmt Daten in der Form des `Photo`-Modells aus airspace-gw6w9 entgegen (`thumbUrl`, `imageUrl`, `photographer`, `source`, `pageUrl`, `licenceText`); Beispieldaten in der Story sind als solche markiert und keine echten Hotlinks.
- [ ] Nur `text-shadow`/CSS, die Safari 16 beherrscht; keine Abhängigkeit von `dialog`-Element-Features, die iPadOS 16 nicht hat.
- [ ] Das Overlay wirkt im Storybook als ruhiger Teil der Szene (Abdunklung, Rahmen, Typografie passen zum Styleguide). [human-eye]

## Notes
- Datenmodell und Lizenz-/Attributionsregeln kommen aus `knowledge/research/aircraft-photo-sources-2026-10-31.md`; der Attributionstext ist Pflichtanzeige, nicht Deko.
- Offen für das Ein-Flugzeug-Bild: Die Nummern-Plakette gibt es heute nur bei zwei Flugzeugen. Ob in der Einzelansicht eine Plakette (oder ein kleines Foto-Symbol) als Tippziel ergänzt wird, entscheidet der Betreiber in sky-scene-xw8jv; dieser Baustein ist davon unabhängig.
- Kiosk-Rücksicht: Das Overlay soll optional nach einer Zeit (Prop `autoCloseMs`) von selbst schließen, damit kein offen gelassenes Foto die Wandszene stundenlang verdeckt.
