# Protocol

Chronological log of everything that happens in this project.
Newest entries on top.

---

## 2026-10-26 22:38 -- Brainstorm: PlanesAbove — Qualitätsregel TDD + E2E

**Type:** Brainstorm
**Outcome:** vision extended
**BCs identified:** unverändert
**Summary:** Entwicklung test-getrieben: Unit-Tests zuerst und Contract-Tests je Adapter gegen aufgezeichnete Fixtures. E2E mit Playwright (WebKit, weil die Zielgeräte Safari nutzen) gegen den echten Dienst im Mock-Modus mit festen Szenarien und steuerbarer Zeit. Walking Skeleton, Storybook-Task und Laufzeit-Entscheidung entsprechend ergänzt.
**ADRs written:** 0003
**Foundation tasks emitted:** keine neuen; angepasst: infrastructure-001-walking-skeleton, design-system-001-styleguide, infrastructure-pn3w4

---

## 2026-10-26 22:28 -- Research: kostenlose Flug-, Wetter- und TTS-APIs verifiziert

**Type:** Research
**Report:** knowledge/research/free-flight-weather-tts-apis-2026-10-26.md (research-reviewer: PASS)
**Summary:** adsb.lol (schlüssellos, ODbL) und Open-Meteo (CC BY, nicht-kommerziell) bestätigt. airplanes.live ist inzwischen offenbar nur noch für Feeder und fällt raus. OpenSky läuft nur mit OAuth2, 4000 Credits/Tag für registrierte Nutzer. Für Routen: VRS standing-data (CC0) als neue Offline-Quelle; adsbdb darf nicht weitergegeben werden. Piper heißt jetzt piper1-gpl (GPL-3.0, als separater Container), die Stimmen sind CC0. ElevenLabs Free bietet 10k Credits/Monat, nicht-kommerziell. Erkenntnisse in airspace-jy8hz, airspace-h76v2, weather-yttgx und sky-scene-xczgm eingearbeitet.

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

