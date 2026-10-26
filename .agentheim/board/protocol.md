# Protocol

Chronological log of everything that happens in this project.
Newest entries on top.

---

## 2026-10-26 23:58 -- Verification failed: design-system-g7w4m - Breiter weicher Schein statt dünner Kontur

**Type:** Work / Verification failure
**Task:** design-system-g7w4m - Breiter weicher Schein statt dünner Kontur hinter Text auf dem Himmel
**Iteration:** 1 of 3
**Reasons:** glow blur token not shown in Token story, no test for it; TESTS_ADDED miscounted
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-26 23:53 -- Batch started: [design-system-g7w4m]

**Type:** Work / Batch start
**Tasks:** design-system-g7w4m - Breiter weicher Schein statt dünner Kontur hinter Text auf dem Himmel (helle Schrift mit schwarzem Schein ca. 40 %)
**Parallel:** no (1 worker) — builder rejected the thin outline; wants a wide soft glow

---

## 2026-10-26 23:53 -- Modeling / Promoted: design-system-g7w4m - Breiter weicher Schein statt dünner Kontur hinter Text auf dem Himmel (helle Schrift mit schwarzem Schein ca. 40 %)

**Type:** Modeling / Promote
**BC:** design-system
**From → To:** backlog → todo

---

## 2026-10-26 23:48 -- Task verified and completed: design-system-k7h2q - Text direkt auf dem Himmel bekommt eine Kontur in der Gegenfarbe (dunkle Schrift hell umrandet, helle Schrift dunkel umrandet)

**Type:** Work / Task completion
**Task:** design-system-k7h2q - Text direkt auf dem Himmel bekommt eine Kontur in der Gegenfarbe (dunkle Schrift hell umrandet, helle Schrift dunkel umrandet)
**Summary:** text on the sky gets an outline in the counter colour of its ink
**Duration:** ~5m
**Verification:** PASS (iteration 1)
**Result source:** sidecar · layout both+sentinel · sidecar present
**Files changed:** 7
**Tests added:** 3
**ADRs written:** none

---

## 2026-10-26 23:43 -- Batch started: [design-system-k7h2q]

**Type:** Work / Batch start
**Tasks:** design-system-k7h2q - Text direkt auf dem Himmel bekommt eine Kontur in der Gegenfarbe (dunkle Schrift hell umrandet, helle Schrift dunkel umrandet)
**Parallel:** no (1 worker) — builder-requested legibility fix after Storybook review

---

## 2026-10-26 23:43 -- Modeling / Promoted: design-system-k7h2q - Text direkt auf dem Himmel bekommt eine Kontur in der Gegenfarbe (dunkle Schrift hell umrandet, helle Schrift dunkel umrandet)

**Type:** Modeling / Promote
**BC:** design-system
**From → To:** backlog → todo

---

## 2026-10-26 23:38 -- Task verified and completed: design-system-c4v3r - Himmel füllt den Bildschirm im 4:3-Format lückenlos (Cover-Beschnitt statt weißer Streifen unten)

**Type:** Work / Task completion
**Task:** design-system-c4v3r - Himmel füllt den Bildschirm im 4:3-Format lückenlos (Cover-Beschnitt statt weißer Streifen unten)
**Summary:** sky fills the 4:3 and 5:3 stage as cover crop instead of leaving a paper strip
**Duration:** ~15m
**Verification:** PASS (iteration 3)
**Result source:** re-dispatch · layout both+sentinel · sidecar present (iteration 3 RESULT was malformed once and rewritten by the same worker without code changes)
**Files changed:** 7
**Tests added:** 4
**ADRs written:** none

---

## 2026-10-26 23:33 -- Verification failed: design-system-c4v3r - Himmel füllt den Bildschirm im 4:3-Format lückenlos

**Type:** Work / Verification failure
**Task:** design-system-c4v3r - Himmel füllt den Bildschirm im 4:3-Format lückenlos (Cover-Beschnitt statt weißer Streifen unten)
**Iteration:** 2 of 3
**Reasons:** empty/two at 5:3 still unmeasured, e2e cover test skips non-cover skies and cannot fail
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-26 23:31 -- Verification failed: design-system-c4v3r - Himmel füllt den Bildschirm im 4:3-Format lückenlos

**Type:** Work / Verification failure
**Task:** design-system-c4v3r - Himmel füllt den Bildschirm im 4:3-Format lückenlos (Cover-Beschnitt statt weißer Streifen unten)
**Iteration:** 1 of 3
**Reasons:** transition-story criterion untested, 5:3 empty/two states untested, TESTS_ADDED miscounted
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-26 23:27 -- Batch started: [design-system-c4v3r]

**Type:** Work / Batch start
**Tasks:** design-system-c4v3r - Himmel füllt den Bildschirm im 4:3-Format lückenlos (Cover-Beschnitt statt weißer Streifen unten)
**Parallel:** no (1 worker) — builder-requested fix after Storybook review: sky must fill the 4:3 stage

---

## 2026-10-26 23:27 -- Modeling / Promoted: design-system-c4v3r - Himmel füllt den Bildschirm im 4:3-Format lückenlos (Cover-Beschnitt statt weißer Streifen unten)

**Type:** Modeling / Promote
**BC:** design-system
**From → To:** backlog → todo

---

## 2026-10-26 23:08 -- Work session ended

**Type:** Work / Session end
**Duration:** ~35m
**Completed:** 9 (first-try PASS: 1, re-dispatched: 0, skipped: 8)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Lost-result re-dispatches:** 0
**Lost-result escalations:** 0
**Dispatches:** infrastructure-pn3w4: 1, airspace-jy8hz: 1, weather-yttgx: 1, design-system-001: 2 (1 + merge-conflict resolve dispatch, .gitignore add/add), infrastructure-y8epz: 1, infrastructure-w7qbc: 1, infrastructure-p6s30: 1, airspace-h76v2: 1, sky-scene-xczgm: 1
**Commits:** 16
**Vision-conformance:** none — batch aligns with vision
**Batch mix:** 100% product-facing / 0% harness / 0% bookkeeping (9 tasks)
**Carry-over:** none — working tree clean (salvage patch .agentheim/salvage/design-system-001-merge-conflict.patch kept, gitignored)
**Next:** builder reviews and approves the Storybook design system (design-system-001 [human-eye] gate, plus a WebKit e2e run) before infrastructure-001-walking-skeleton is dispatched.

---

## 2026-10-26 23:04 -- Task completed (verification skipped): sky-scene-xczgm - Decide German speech output behind a swappable synthesizer port (Piper default, ElevenLabs etc. pluggable), played as audio on the iPad

**Type:** Work / Task completion
**Task:** sky-scene-xczgm - Decide German speech output behind a swappable synthesizer port (Piper default, ElevenLabs etc. pluggable), played as audio on the iPad
**Summary:** decide German speech output behind a swappable SpeechSynthesizer port
**Duration:** ~1m
**Verification:** SKIPPED — decision-only task
**Result source:** sidecar · layout both+sentinel · sidecar present
**Files changed:** 0

---

## 2026-10-26 23:04 -- Task completed (verification skipped): infrastructure-p6s30 - Decide observability: health endpoint, dead-man's-switch heartbeat and structured logs

**Type:** Work / Task completion
**Task:** infrastructure-p6s30 - Decide observability: health endpoint, dead-man's-switch heartbeat and structured logs
**Summary:** decide health endpoint, dead-man heartbeat and structured logs
**Duration:** ~1m
**Verification:** SKIPPED — decision-only task
**Result source:** sidecar · layout both+sentinel · sidecar present
**Files changed:** 0

---

## 2026-10-26 23:03 -- Task completed (verification skipped): airspace-h76v2 - Decide Typklasse, Kategorie and airline derivation from static curated tables

**Type:** Work / Task completion
**Task:** airspace-h76v2 - Decide Typklasse, Kategorie and airline derivation from static curated tables
**Summary:** decide Typklasse, Kategorie and airline derivation from static curated tables
**Duration:** ~1m
**Verification:** SKIPPED — decision-only task
**Result source:** sidecar · layout both+sentinel · sidecar present
**Files changed:** 0

---

## 2026-10-26 23:02 -- Batch started: [infrastructure-p6s30, airspace-h76v2, sky-scene-xczgm]

**Type:** Work / Batch start
**Tasks:** infrastructure-p6s30 - Decide observability: health endpoint, dead-man's-switch heartbeat and structured logs, airspace-h76v2 - Decide Typklasse, Kategorie and airline derivation from static curated tables, sky-scene-xczgm - Decide German speech output behind a swappable synthesizer port (Piper default, ElevenLabs etc. pluggable), played as audio on the iPad
**Parallel:** yes (3 workers, cap 3) — the last 3 ready decisions; infrastructure-001-walking-skeleton stays blocked on these.

---

## 2026-10-26 23:01 -- Task verified and completed: design-system-001 - Storybook-Instanz nach Atomic Design mit allen vorhandenen Assets aufbauen und vom Betreiber abnehmen lassen

**Type:** Work / Task completion
**Task:** design-system-001 - Storybook-Instanz nach Atomic Design mit allen vorhandenen Assets aufbauen und vom Betreiber abnehmen lassen
**Summary:** Storybook design system (Atomic Design) with all draft assets, local fonts, 4:3 templates
**Duration:** ~17m
**Verification:** PASS (iteration 1)
**Result source:** sidecar · layout both+sentinel · sidecar present (resolve dispatch after .gitignore merge-back conflict, re-verified PASS)
**Files changed:** 119
**Tests added:** 44
**ADRs written:** 0009

---

## 2026-10-26 22:46 -- Task completed (verification skipped): infrastructure-w7qbc - Decide deployment topology and kiosk operation: Docker Compose app on ZimaOS, self-recovering iPad client via Guided Access

**Type:** Work / Task completion
**Task:** infrastructure-w7qbc - Decide deployment topology and kiosk operation: Docker Compose app on ZimaOS, self-recovering iPad client via Guided Access
**Summary:** decide Docker Compose app on ZimaOS and self-recovering iPad kiosk client
**Duration:** ~1m
**Verification:** SKIPPED — decision-only task
**Result source:** sidecar · layout both+sentinel · sidecar present
**Files changed:** 0

---

## 2026-10-26 22:45 -- Task completed (verification skipped): infrastructure-y8epz - Decide persistence and configuration: SQLite single file plus validated config file

**Type:** Work / Task completion
**Task:** infrastructure-y8epz - Decide persistence and configuration: SQLite single file plus validated config file
**Summary:** decide SQLite single-file storage and validated YAML configuration
**Duration:** ~1m
**Verification:** SKIPPED — decision-only task
**Result source:** sidecar · layout both+sentinel · sidecar present
**Files changed:** 0

---

## 2026-10-26 22:44 -- Batch started: [design-system-001, infrastructure-y8epz, infrastructure-w7qbc]

**Type:** Work / Batch start
**Tasks:** design-system-001 - Storybook-Instanz nach Atomic Design mit allen vorhandenen Assets aufbauen und vom Betreiber abnehmen lassen, infrastructure-y8epz - Decide persistence and configuration: SQLite single file plus validated config file, infrastructure-w7qbc - Decide deployment topology and kiosk operation: Docker Compose app on ZimaOS, self-recovering iPad client via Guided Access
**Parallel:** yes (3 workers, cap 3) — 6 ready; held to next wave: infrastructure-p6s30, airspace-h76v2, sky-scene-xczgm. design-system-001 dispatched early because it is the longest task and gates the walking skeleton.

---

## 2026-10-26 22:43 -- Task completed (verification skipped): weather-yttgx - Decide weather and sun position: Open-Meteo for Wetterlage, locally computed sun for Tageszeit

**Type:** Work / Task completion
**Task:** weather-yttgx - Decide weather and sun position: Open-Meteo for Wetterlage, locally computed sun for Tageszeit
**Summary:** decide Open-Meteo for Wetterlage and locally computed sun position for Tageszeit
**Duration:** ~45s
**Verification:** SKIPPED — decision-only task
**Result source:** sidecar · layout both+sentinel · sidecar present
**Files changed:** 0

---

## 2026-10-26 22:43 -- Task completed (verification skipped): airspace-jy8hz - Decide free ADS-B position and route sources behind a replaceable port (adsb.lol / airplanes.live / adsbdb)

**Type:** Work / Task completion
**Task:** airspace-jy8hz - Decide free ADS-B position and route sources behind a replaceable port (adsb.lol / airplanes.live / adsbdb)
**Summary:** decide free ADS-B position and route sources behind replaceable ports
**Duration:** ~45s
**Verification:** SKIPPED — decision-only task
**Result source:** sidecar · layout both+sentinel · sidecar present
**Files changed:** 0

---

## 2026-10-26 22:43 -- Task completed (verification skipped): infrastructure-pn3w4 - Decide runtime split and stack: home-server service computes state, tablet is a thin vanilla-JS client

**Type:** Work / Task completion
**Task:** infrastructure-pn3w4 - Decide runtime split and stack: home-server service computes state, tablet is a thin vanilla-JS client
**Summary:** decide runtime split and stack (home-server service, thin vanilla-JS iPad client)
**Duration:** ~45s
**Verification:** SKIPPED — decision-only task
**Result source:** sidecar · layout both+sentinel · sidecar present
**Files changed:** 0

---

## 2026-10-26 22:40 -- Batch started: [infrastructure-pn3w4, airspace-jy8hz, weather-yttgx]

**Type:** Work / Batch start
**Tasks:** infrastructure-pn3w4 - Decide runtime split and stack: home-server service computes state, tablet is a thin vanilla-JS client, airspace-jy8hz - Decide free ADS-B position and route sources behind a replaceable port (adsb.lol / airplanes.live / adsbdb), weather-yttgx - Decide weather and sun position: Open-Meteo for Wetterlage, locally computed sun for Tageszeit
**Parallel:** yes (3 workers, cap 3) — 7 decision tasks ready; held to next wave: infrastructure-y8epz, infrastructure-w7qbc, infrastructure-p6s30, airspace-h76v2, sky-scene-xczgm. pn3w4 first because it unblocks design-system-001 and the other infra decisions build on its stack choice.

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

