---
id: design-system-001-styleguide
title: Styleguide aus den Claude-Design-Entwürfen ableiten und vom Betreiber abnehmen lassen
status: todo
type: feature
context: design-system
created: 2026-10-26
completed:
depends_on: [infrastructure-001-walking-skeleton]
blocks: []
tags: [frontend, styleguide, gate]
related_adrs: []
related_research: []
prior_art: []
---

## Why
Die Himmelsszene lebt von ihrer Gestaltung. Die Entwürfe in `Flugzeugmodelle.html`, `Himmel.html` und `Screens.html` legen Typografie, Farben, Info-Leisten und Übergangs-Choreografie bereits fest, aber nur als Mock-Seiten. Bevor sky-scene echte UI baut, braucht es eine verbindliche, wiederverwendbare Grundlage im laufenden Stack. Sonst wächst die Gestaltung Task für Task auseinander.

## What
Leite aus den Entwürfen ein Design-System im gewählten Frontend-Stack ab, aufgesetzt auf dem laufenden Walking Skeleton:
- **Tokens:** Farben (z. B. `#1F2A33`, `#ECEBE3`, `#D8D6CC`, `#C8313E`, Himmel-Tinte hell/dunkel), Schriften (Archivo 900, IBM Plex Mono 400/500) und Abstände.
- **Komponenten:**
  - Kopfzeile („Der Himmel über … · Live · HH:MM“)
  - Info-Leiste mit einem Flugzeug (Route bekannt / unbekannt)
  - Info-Leiste mit zwei Flugzeugen und Nummern-Plaketten
  - schmale „Zuletzt“-Leiste
- **Choreografie:** die Übergänge aus `Screens.html` als wiederverwendbare Animationen (Flugzeug kommt / geht / wechselt, Wetter- und Tageszeit-Überblendung, je ca. 5 s).
- **Szene-Rendering:** Typklasse × Lackierung × Logo, wie in `Flugzeugmodelle.html`. Himmel als Hintergrund.
- Die Schriften müssen offline bzw. lokal verfügbar sein, damit das Tablet nicht von Google Fonts abhängt.

## Acceptance criteria
- [ ] Tokens und Komponenten existieren im Code und werden von einer Styleguide-Seite im laufenden App-Stack gerendert.
- [ ] Alle vier Info-Leisten-Zustände aus `Screens.html` sind auf der Styleguide-Seite sichtbar.
- [ ] Mindestens die Übergänge „Flugzeug kommt“, „Flugzeug wechselt“, „Wetter wechselt“ und „Tageszeit wechselt“ sind abspielbar.
- [ ] Die Styleguide-Seite läuft flüssig auf dem Ziel-Tablet. [human-eye]
- [ ] Die Styleguide-Seite sieht wie die Claude-Design-Entwürfe aus. [human-eye]
- [ ] **Gate:** Der Betreiber hat das Design-System durchgesehen und freigegeben, bevor irgendein Frontend-Feature-Task (sky-scene) nach `todo/` befördert wird. [human-eye]

## Notes
- Quellen: `Flugzeugmodelle.html`, `Himmel.html`, `Screens.html` im Repo-Root sowie `svg/`. Original-Entwürfe im Claude-Design-Projekt `da5d4e02-191f-49a3-9db0-aa8095e016b7`.
- Die Lackierungsdefinitionen weichen zwischen den Entwürfen leicht ab (z. B. `--skin-aft-sweep-1` vs. `--skin-tailband`). Bei der Ableitung eine Variante festlegen.
- `svg/business-jet.svg` enthält einen leeren Pfad (`d="M Z"`), der eine Konsolenwarnung erzeugt. Bei Gelegenheit bereinigen.
- **Gate-Regel:** Jeder Frontend-Task in jedem BC hängt per `depends_on` von diesem Task ab.
