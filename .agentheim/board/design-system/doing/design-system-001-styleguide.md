---
id: design-system-001-styleguide
title: Storybook-Instanz nach Atomic Design mit allen vorhandenen Assets aufbauen und vom Betreiber abnehmen lassen
status: doing
type: feature
context: design-system
created: 2026-10-26
completed:
depends_on: [infrastructure-pn3w4]
blocks: [infrastructure-001-walking-skeleton]
tags: [frontend, storybook, atomic-design, gate]
related_adrs: [0002, 0003]
related_research: []
prior_art: []
---

## Why
Die Himmelsszene lebt von ihrer Gestaltung. Der Betreiber will jedes visuelle Teil einzeln sehen und abnehmen, bevor es in die App kommt (ADR 0002). Die Claude-Design-Entwürfe (`Flugzeugmodelle.html`, `Himmel.html`, `Screens.html`, `svg/`) sind bisher nur Mock-Seiten. Daraus wird jetzt eine Storybook-Instanz nach Atomic Design. Sie ist die einzige Quelle für alle UI-Bausteine, die der Walking Skeleton und alle späteren Features verwenden.

## What
Eine eigene Storybook-Instanz im Repo (Storybook `html`-Renderer, framework-freie Komponenten, passend zum Client-Stack aus `infrastructure-pn3w4`). Sie enthält **alle vorhandenen Assets**, jedes einzeln ansehbar und mit Controls für seine Varianten:

- **Atoms**
  - Farb- und Typo-Tokens: `#1F2A33`, `#ECEBE3`, `#D8D6CC`, `#C8313E`, Himmel-Tinte hell/dunkel; Archivo 900 und IBM Plex Mono 400/500, lokal eingebunden
  - jede der 10 Typklassen-Silhouetten (unlackiert)
  - jeder der 28 Himmel, mit Controls für Tageszeit × Wetterlage
  - jedes Logo
  - Nummern-Plakette
  - Textstile (Eyebrow, Route groß, Meta klein)
- **Molecules**
  - lackiertes Flugzeug: Typklasse × Lackierung × Logo, über Controls aus dem vollständigen Lackierungskatalog wählbar; „keine Lackierung“ für Light Aircraft und Glider wie in den Entwürfen
  - Kopfzeile „Der Himmel über … · Live · HH:MM“ mit Tinte hell/dunkel
  - Info-Zeile (eine Zeile mit Plakette)
- **Organisms**
  - Info-Leiste: ein Flugzeug mit Route bekannt, Route unbekannt, zwei Flugzeuge, schmale „Zuletzt“-Leiste
  - Szenen-Ebene mit 0, 1 oder 2 Flugzeugen
- **Templates**
  - Bildschirmzustände leer, eins und zwei im Format 5:3
- **Pages und Übergänge**
  - gefüllte Beispielszenen
  - alle Übergänge aus `Screens.html` als abspielbare Stories: Flugzeug kommt, geht, wechselt; Wetter wechselt; Tageszeit wechselt; ca. 5 s

**Konventionen:**
- Story-Hierarchie `Atoms/…`, `Molecules/…`, `Organisms/…`, `Templates/…`, `Pages/…`.
- Die App importiert später dieselben Komponenten-Module, die Storybook rendert. Es gibt keine Kopien.

## Acceptance criteria
- [ ] Storybook startet mit einem dokumentierten Befehl (z. B. `npm run storybook`) und kann als statische Seite gebaut werden.
- [ ] Jede Typklasse, jede Lackierung aus dem Katalog der Entwürfe, jedes Logo und jeder der 28 Himmel ist als eigene Story bzw. über Controls einzeln ansehbar.
- [ ] Die Atomic-Design-Ebenen Atoms, Molecules, Organisms, Templates und Pages sind in der Story-Navigation sichtbar, und jede Komponente liegt auf genau einer Ebene.
- [ ] Alle vier Info-Leisten-Zustände und die drei Bildschirmzustände aus `Screens.html` existieren als Stories.
- [ ] Die Übergänge Flugzeug kommt/geht/wechselt, Wetter wechselt und Tageszeit wechselt sind als Stories abspielbar.
- [ ] Die Komponenten sind framework-freie Module, die der App-Client ohne Storybook importieren kann. Ein Smoke-Test rendert mindestens eine Komponente außerhalb von Storybook.
- [ ] Die Schriften werden lokal ausgeliefert, nicht über Google Fonts.
- [ ] Templates und Pages gibt es im Format **4:3**, dem Format der Ziel-iPads. Die 5:3-Fassung der Entwürfe ist als Viewport-Option zuschaltbar.
- [ ] Alle Komponenten laufen in Safari 16 (iPadOS 16, Mindestgrenze). Storybook-Viewports für iPad Pro 12,9" und iPad 9,7" sind vorhanden.
- [ ] **Test-getrieben (ADR 0003):** Die Komponenten haben Unit-Tests, z. B. Lackierung auf Typklasse anwenden, Logo-Ankerpunkte, Fallback Standard-Lackierung, Info-Leisten-Zustände. Ein Playwright-Test (WebKit) prüft, dass alle Stories fehlerfrei rendern.
- [ ] Die Stories sehen aus wie die Claude-Design-Entwürfe. [human-eye]
- [ ] **Gate:** Der Betreiber hat das Design-System in Storybook durchgesehen und freigegeben. Erst danach wird ein Task, der diese Komponenten in der App verwendet, nach `todo/` befördert bzw. gestartet. [human-eye]

## Notes
- Quellen: `Flugzeugmodelle.html`, `Himmel.html`, `Screens.html` und `svg/` im Repo-Root. Original-Entwürfe im Claude-Design-Projekt `da5d4e02-191f-49a3-9db0-aa8095e016b7`. Die Seiten können nach vollständiger Übernahme in Storybook entfallen.
- Die Lackierungsdefinitionen weichen zwischen den Entwürfen leicht ab (z. B. `--skin-aft-sweep-1` vs. `--skin-tailband`). Bei der Übernahme eine Variante festlegen und begründen.
- `svg/business-jet.svg` enthält einen leeren Pfad (`d="M Z"`), der eine Konsolenwarnung erzeugt. Bei der Übernahme bereinigen.
- **Regel für alle Folge-Tasks (ADR 0002):** Braucht ein Task ein UI-Element, das es noch nicht gibt, entsteht es zuerst als Story in Storybook und wird abgenommen, erst dann wird es in der App verwendet. Jeder Frontend-Task hängt per `depends_on` von diesem Task ab.
- Die Komponenten müssen auf den alten iPads laufen. Die Mindestgrenze ist iPadOS 16 / Safari 16, siehe `infrastructure-pn3w4`. Die Format-Anpassung von 5:3 auf 4:3 zeigt mehr Himmel oben und unten bzw. einen schmalen Rand. Die gestalterische Lösung legt der Betreiber bei der Abnahme fest. Storybook selbst läuft nur auf dem Entwicklungsrechner bzw. Heimserver.
