# Protocol

Chronological log of everything that happens in this project.
Newest entries on top.

---

## 2026-10-26 22:22 -- Brainstorm: PlanesAbove — Revision nach Builder-Input

**Type:** Brainstorm
**Outcome:** vision revised
**BCs identified:** unverändert
**Summary:** Heimserver ist ein Lenovo ThinkCentre mit ZimaOS, Anzeige voraussichtlich ein altes iPad (Geführter Zugriff statt Kiosk-App). Sprachausgabe hinter austauschbarem SpeechSynthesizer-Port (Piper Standard, ElevenLabs steckbar). Design-System wird eine eigene Storybook-Instanz nach Atomic Design; jedes UI-Element entsteht zuerst dort und wird abgenommen, bevor die App es nutzt — der Storybook-Task kommt deshalb vor den Walking Skeleton.
**ADRs written:** 0002
**Foundation tasks emitted:** keine neuen; angepasst: design-system-001-styleguide, infrastructure-001-walking-skeleton, infrastructure-pn3w4, infrastructure-w7qbc, sky-scene-xczgm. API-Verifikation läuft als Research.

---

## 2026-10-26 22:11 -- Brainstorm: PlanesAbove — Fenster zum Himmel im Kinderzimmer

**Type:** Brainstorm
**Outcome:** vision created
**BCs identified:** sky-scene (core), airspace (core), weather, liveries, sighting-log, infrastructure, design-system
**Summary:** Stationäres Tablet-Display für Mona (4), das die zwei nächsten echten Flugzeuge im konfigurierbaren Umkreis (Default 30 km, 30-s-Takt) in illustrierter Lackierung vor einem wetter- und tageszeitabhängigen Himmel zeigt und per Tippen einen deutschen Steckbrief vorliest (mit Vorlese-Sperre). Nur kostenlose Datenquellen, ein Haushalt, self-hosted; Sichtungen werden still protokolliert (Auswertung, Geschichten-Modus und Foto-Knopf in v2). Claude-Design-Entwürfe als Screens.html und Himmel.html ins Repo übernommen.
**ADRs written:** 0001
**Foundation tasks emitted:** infrastructure-pn3w4, infrastructure-y8epz, infrastructure-w7qbc, infrastructure-p6s30, airspace-jy8hz, airspace-h76v2, weather-yttgx, sky-scene-xczgm, infrastructure-001-walking-skeleton, design-system-001-styleguide

---

