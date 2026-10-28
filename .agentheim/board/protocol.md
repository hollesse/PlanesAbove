# Protocol

Chronological log of everything that happens in this project.
Newest entries on top.

---

## 2026-10-28 09:17 -- Batch started: [design-system-h3b7q, sky-scene-n0sfy]

**Type:** Work / Batch start
**Tasks:** design-system-h3b7q - Lange Route in der Info-Leiste: drei Alternativen als Storybook-Entwürfe, Betreiber wählt eine, sky-scene-n0sfy - Flugzeug-Übergänge (kommt / geht / wechselt) in der Live-Szene abspielen statt hart zu schneiden; Diff per icao24, Übergang-Sperre puffert den neuesten Stand
**Parallel:** yes (2 workers + airspace-w1q3x still in iteration 3 = 3 live; airspace-cn6t7 held: shares route-service.ts with w1q3x; infrastructure-d3v7k held by cap 3, next wave)

---

## 2026-10-28 09:17 -- Verification failed: airspace-w1q3x - hexdb und VRS immer beide fragen

**Type:** Work / Verification failure
**Task:** airspace-w1q3x - hexdb und VRS immer beide fragen; VRS-Mehrleg-Route gewinnt bei passendem Endstück
**Iteration:** 2 of 3
**Reasons:** README-Delta ergänzt nur einen neuen Eintrag; der bestehende Eintrag Routenquelle (erste plausible Route gewinnt) widerspricht dem neuen Verhalten; Code und Tests in Ordnung (484 Tests)
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-28 09:14 -- Task verified and completed: infrastructure-agdax - Continuous Deployment: GitHub Action testet und baut Images nach GHCR bei jedem Push auf main; Watchtower auf ZimaOS zieht sie, das iPad lädt sich über die buildId selbst neu

**Type:** Work / Task completion
**Task:** infrastructure-agdax - Continuous Deployment: GitHub Action testet und baut Images nach GHCR bei jedem Push auf main; Watchtower auf ZimaOS zieht sie, das iPad lädt sich über die buildId selbst neu
**Summary:** Added the deploy workflow (a test job gates a publish job that pushes to GHCR), switched the compose file to GHCR images plus a label-filtered Watchtower, and updated the README operations section. Iteration 2 bases the Piper rebuild decision on the whole push range and pins it in a unit test.
**Duration:** 22m
**Verification:** PASS (iteration 2)
**Files changed:** 4
**Tests added:** 6
**ADRs written:** 0022-ci-built-images-watchtower-pull.md

---

## 2026-10-28 09:13 -- Task verified and completed: design-system-z9rzp - Flugphase als Pfeil vor der Höhe statt als Wort; in der Zwei-Flugzeuge-Ansicht Höhe und Geschwindigkeit je auf eigener Zeile, damit lange Routen mehr Platz haben

**Type:** Work / Task completion
**Task:** design-system-z9rzp - Flugphase als Pfeil vor der Höhe statt als Wort; in der Zwei-Flugzeuge-Ansicht Höhe und Geschwindigkeit je auf eigener Zeile, damit lange Routen mehr Platz haben
**Summary:** Flight phase is now a Unicode arrow (↗ ↘ →) before the altitude, with the phase word only in aria-label/title; the two-plane row stacks altitude and speed on two lines. Unit tests, typecheck, build and 10 of 11 Storybook/e2e chromium tests pass; one skeleton e2e fails on an unrelated livery assertion.
**Duration:** 7m50s
**Verification:** PASS (iteration 1)
**Files changed:** 10
**Tests added:** 1
**ADRs written:** none

---

## 2026-10-28 09:10 -- Verification failed: airspace-w1q3x - hexdb und VRS immer beide fragen

**Type:** Work / Verification failure
**Task:** airspace-w1q3x - hexdb und VRS immer beide fragen; VRS-Mehrleg-Route gewinnt bei passendem Endstück
**Iteration:** 1 of 3
**Reasons:** Paar-Logik greift nur nach einem Treffer: bei hexdb unknown fragt die Kette adsbdb vor VRS (Default-Reihenfolge); Test versteckt das mit Reihenfolge [hexdb, vrs]; kein Test über route_lookups/stats:routes; Anzeigenamen/Sinkflug im UPS1-Test nicht wie im Kriterium
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-28 09:10 -- Verification failed: infrastructure-agdax - Continuous Deployment per GitHub Action, GHCR und Watchtower

**Type:** Work / Verification failure
**Task:** infrastructure-agdax - Continuous Deployment: GitHub Action testet und baut Images nach GHCR; Watchtower auf ZimaOS zieht sie
**Iteration:** 1 of 3
**Reasons:** Piper-Änderungserkennung prüft nur den letzten Commit des Pushes (fetch-depth 2, HEAD^..HEAD) statt der ganzen Push-Range; kein Test für die TTS-Bedingung
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-28 09:04 -- Batch started: [infrastructure-agdax, airspace-w1q3x, design-system-z9rzp]

**Type:** Work / Batch start
**Tasks:** infrastructure-agdax - Continuous Deployment: GitHub Action testet und baut Images nach GHCR bei jedem Push auf main; Watchtower auf ZimaOS zieht sie, das iPad lädt sich über die buildId selbst neu, airspace-w1q3x - hexdb und VRS immer beide fragen; eine VRS-Mehrleg-Route, deren Endstück zur hexdb-Route passt, gewinnt (Startflughafen bei Zwischenlandungen), design-system-z9rzp - Flugphase als Pfeil vor der Höhe statt als Wort; in der Zwei-Flugzeuge-Ansicht Höhe und Geschwindigkeit je auf eigener Zeile, damit lange Routen mehr Platz haben
**Parallel:** yes (3 workers — airspace-cn6t7 held to next wave: shares route-service.ts with w1q3x and flight.ts with z9rzp; sky-scene-n0sfy held by cap 3)
**Planning advisory:** whats-next 2026-10-27 12:49 (stale — background): refine airspace-h9x4p / sky-scene-g3r8w; both since done

---

## 2026-10-28 09:03 -- Modeling / Refined: infrastructure-agdax - Continuous Deployment vor die Geräteabnahme gezogen

**Type:** Modeling / Refine
**BC:** infrastructure
**Status after:** todo
**Summary:** Betreiber will keinen manuellen Erstlauf: agdax hängt nicht mehr an d3v7k, sondern umgekehrt — d3v7k nimmt über den automatischen Deploy-Pfad (GHCR + Watchtower) ab. Betreiber-Hälfte und Compose-Kriterium in d3v7k entsprechend umformuliert; Worker-Hälfte von d3v7k unverändert.
**Split into:** none
**ADRs written:** none

---

## 2026-10-28 08:21 -- Modeling / Captured: infrastructure-agdax - Continuous Deployment: GitHub Action testet und baut Images nach GHCR bei jedem Push auf main; Watchtower auf ZimaOS zieht sie, das iPad lädt sich über die buildId selbst neu

**Type:** Modeling / Capture
**BC:** infrastructure
**Filed to:** todo
**Summary:** Continuous Deployment: GitHub Action testet, baut und pusht Dienst- und Piper-Image nach GHCR bei jedem Push auf main; Watchtower auf ZimaOS zieht die Images, das iPad lädt sich über die buildId neu. Betreiber-Entscheidung für CI-gebaute Images statt Build auf dem Server. Abhängig von d3v7k, direkt nach todo.

---

## 2026-10-27 23:17 -- Modeling / Promoted: airspace-cn6t7 - Routenanzeige bei langen Flughafennamen: ganze Route bleibt sichtbar; Playwright-Test mit den zwei längsten Namen

**Type:** Modeling / Promote
**BC:** airspace
**From → To:** backlog → todo

---

## 2026-10-27 23:17 -- Modeling / Refined: airspace-cn6t7 - Routenanzeige bei langen Flughafennamen (Aufteilung)

**Type:** Modeling / Refine
**BC:** airspace
**Status after:** todo
**Summary:** Aufteilung ausgeführt: cn6t7 behält den Datenteil (Start → Ende, Zwischenstopp in der Eyebrow); Layout-Entscheidung als Storybook-Spike, Umsetzung plus Playwright-Test als Folgetask.
**Split into:** design-system-h3b7q, design-system-grp94

---

## 2026-10-27 23:14 -- Modeling / Captured: design-system-grp94 - Lange Route: gewählte Variante in der Info-Leiste umsetzen; Playwright-Test (WebKit) mit den zwei längsten Flughafennamen

**Type:** Modeling / Capture
**BC:** design-system
**Filed to:** backlog
**Summary:** Umsetzung der im Spike h3b7q gewählten Variante plus Playwright-WebKit-Test mit den zwei längsten Flughafennamen der Tabelle; backlog bis die Variante feststeht.

---

## 2026-10-27 23:14 -- Modeling / Captured: design-system-h3b7q - Lange Route in der Info-Leiste: drei Alternativen als Storybook-Entwürfe, Betreiber wählt eine

**Type:** Modeling / Capture
**BC:** design-system
**Filed to:** todo
**Summary:** Spike aus airspace-cn6t7: drei Storybook-Entwürfe für überlange Routen (erst kleiner dann umbrechen / Umbruch plus Stufe / nur Verkleinerung), Komponenten unverändert, Betreiber wählt.

---

## 2026-10-27 22:08 -- Modeling / Refined: airspace-cn6t7 - Routenanzeige bei langen Flughafennamen

**Type:** Modeling / Refine
**BC:** airspace
**Status after:** backlog
**Summary:** Zwei Betreiber-Entscheidungen festgehalten: Mehrleg-Routen zeigen nur Start → Ende, Zwischenstopp klein in der Eyebrow (RouteInfo liefert Legs, sky-scene bildet route/via); Layout bei langen Namen wird Storybook-first mit drei Alternativ-Stories entschieden. Aufteilung in design-system-Spike plus Umsetzungstask geplant, noch nicht erzeugt (Sitzung durch Usage-Limit beendet).

---

## 2026-10-27 21:57 -- Modeling / Captured: design-system-z9rzp - Flugphase als Pfeil vor der Höhe statt als Wort; in der Zwei-Flugzeuge-Ansicht Höhe und Geschwindigkeit je auf eigener Zeile, damit lange Routen mehr Platz haben

**Type:** Modeling / Capture
**BC:** design-system
**Filed to:** todo
**Summary:** Flugphase in der Info-Leiste als Pfeil (↗ ↘ →) vor der Höhe statt als Wort; in der Zwei-Flugzeuge-Ansicht Höhe und Geschwindigkeit je auf eigener Zeile, damit lange Routen Platz bekommen. Betreiber-Idee, Storybook-first, direkt nach todo.

---

## 2026-10-27 21:53 -- Capture / Captured: airspace-cn6t7 - Routenanzeige bei langen Flughafennamen: ganze Route bleibt sichtbar; Playwright-Test mit den zwei längsten Namen

**Type:** Capture
**BC:** airspace
**Filed to:** backlog
**Summary:** Routenanzeige kann länger sein als der Platz; Umgang offen (Umbruch, Verkleinerung, Kürzung). Playwright-Test mit den zwei längsten Flughafennamen, ganze Route muss sichtbar sein.

---

## 2026-10-27 21:50 -- Modeling / Captured: airspace-w1q3x - hexdb und VRS immer beide fragen; eine VRS-Mehrleg-Route, deren Endstück zur hexdb-Route passt, gewinnt (Startflughafen bei Zwischenlandungen)

**Type:** Modeling / Capture
**BC:** airspace
**Filed to:** todo
**Summary:** Befund UPS1: hexdb kennt nur das letzte Leg (Sharjah → Köln), VRS die ganze Kette ab Hongkong. hexdb und VRS künftig immer beide fragen (VRS ist lokal, kein Request); passt die hexdb-Route als Endstück zur VRS-Mehrleg-Route, gewinnt VRS, bei echtem Konflikt bleibt hexdb vorn. Direkt nach todo, Regel und Testfälle sind mit dem Betreiber abgestimmt.

---

## 2026-10-27 21:37 -- Work session ended

**Type:** Work / Session end
**Duration:** 11m (21:26–21:37)
**Completed:** 1 (first-try PASS: 0, re-dispatched: 1, skipped: 0) — airspace-b7kx2
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Lost-result re-dispatches:** 1 (iteration 1 sidecar header-mismatch: trailing FILE_LIST abgekürzt; gleicher Worker schrieb den Sidecar neu)
**Lost-result escalations:** 0
**Dispatches:** airspace-b7kx2: 2
**Commits:** 2 (batch start, integration)
**Vision-conformance:** none — batch aligns with vision
**Batch mix:** 100% product-facing / 0% harness / 0% bookkeeping (1 task)
**Carry-over:** none — working tree clean (.agentheim/); left behind (user WIP, 3 files: .agentheim/.dashboard/, config.yaml, data/)
**Scoped run:** airspace-b7kx2 — integrated (Verifier FAIL it.1: LRTR fehlte nach neuer Sichtung WMT448; PASS it.2 mit festem Seed-Cutoff 2026-10-27T20:40Z)
**Note:** 3 stranded RESULT sidecars removed (b7kx2 iter-1/2, v4kqz iter-1).

---

## 2026-10-27 21:36 -- Task verified and completed: airspace-b7kx2 - Eigene Flughafenliste, damit Routen unabhängig vom Anbieter gleich aussehen

**Type:** Work / Task completion
**Task:** airspace-b7kx2 - Eigene Flughafenliste, damit Routen unabhängig vom Anbieter gleich aussehen
**Summary:** Eigene Flughafentabelle tables/airports.json (209 Flughäfen, VRS-Seed bis Cutoff 2026-10-27T20:40Z): Routen heißen quellenunabhängig Stadt (IATA), Fallback Anbietername mit einmaliger Warnung je ICAO; Verifier PASS it.2 (476 Tests)
**Duration:** 9m
**Verification:** PASS (iteration 2)
**Files changed:** 12
**Tests added:** 11
**ADRs written:** 0021

---

## 2026-10-27 21:33 -- Verification failed: airspace-b7kx2 - Eigene Flughafenliste, damit Routen unabhängig vom Anbieter gleich aussehen

**Type:** Work / Verification failure
**Task:** airspace-b7kx2 - Eigene Flughafenliste, damit Routen unabhängig vom Anbieter gleich aussehen
**Iteration:** 1 of 3
**Reasons:** Seed-Coverage-Test gegen die Live-DB rot (LRTR fehlt, Sichtung WMT448 kam nach dem Seed-Lauf), sonst alles grün (475 Tests, typecheck)
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-27 21:32 -- Modeling / Promoted: infrastructure-d3v7k - Geräteabnahme des Walking Skeletons auf ZimaOS-Heimserver und echtem iPad

**Type:** Modeling / Promote
**BC:** infrastructure
**From → To:** backlog → todo

---

## 2026-10-27 21:32 -- Modeling / Refined: infrastructure-d3v7k - Geräteabnahme des Walking Skeletons auf ZimaOS-Heimserver und echtem iPad

**Type:** Modeling / Refine
**BC:** infrastructure
**Status after:** todo
**Summary:** Dritter Durchgang: alle drei Abhängigkeiten sind done, Kriterien und Aufteilung Worker/Betreiber bestätigt; Notes ergänzt (README-Betriebsabschnitt als einzig veralteter Teil, stats:routes --standort, docker=Podman-Alias lokal). Task bereit.
**Split into:** none
**ADRs written:** none

---

## 2026-10-27 21:28 -- Modeling / Promoted: sky-scene-n0sfy - Flugzeug-Übergänge (kommt / geht / wechselt) in der Live-Szene abspielen statt hart zu schneiden; Diff per icao24, Übergang-Sperre puffert den neuesten Stand

**Type:** Modeling / Promote
**BC:** sky-scene
**From → To:** backlog → todo

---

## 2026-10-27 21:27 -- Modeling / Refined: sky-scene-n0sfy - Flugzeug-Übergänge in der Live-Szene abspielen

**Type:** Modeling / Refine
**BC:** sky-scene
**Status after:** todo
**Summary:** Dritter Durchgang: Blocker design-system-kcpnw ist integriert; TRANSITION_MS, renderTransitionStage/playTransition, data-side und VorleseSperre.whenFree im Code gegengeprüft. Notes ergänzt, Task bereit.
**Split into:** none
**ADRs written:** none

---

## 2026-10-27 21:26 -- Batch started: [airspace-b7kx2]

**Type:** Work / Batch start
**Tasks:** airspace-b7kx2 - Eigene Flughafenliste, damit Routen unabhängig vom Anbieter gleich aussehen
**Parallel:** scoped — builder named airspace-b7kx2; 0 other ready tasks

---

## 2026-10-27 21:23 -- Modeling / Refined: airspace-b7kx2 - Anzeigeformat Stadt (IATA)

**Type:** Modeling / Refine
**BC:** airspace
**Status after:** todo
**Summary:** Anzeigeformat auf Stadt (IATA) festgelegt, z. B. Frankfurt (FRA) → Lissabon (LIS); IATA kommt aus der Tabelle, Quellen liefern ihn (adsbdb iata_code, hexdb iata, VRS IATA). Ohne IATA nur Stadt. Acceptance Criteria ergänzt.
**Split into:** none
**ADRs written:** none

---

## 2026-10-27 21:22 -- Work session ended

**Type:** Work
**Scoped run:** airspace-v4kqz — integrated (Verifier PASS it.1).
**Note:** tests/e2e/skeleton.spec.ts:19 (data-livery def vs lh) ist auf main seit der Lackierungs-Arbeit rot, unabhaengig von diesem Task.

---

## 2026-10-27 21:22 -- Task verified and completed: airspace-v4kqz - Gesperrte Lufträume in der Plausibilitätsprüfung: schneidet der Großkreis einen gesperrten Luftraum, entfällt die Korridorprüfung und die erlaubte Kursabweichung steigt (Befund KAL908 London–Seoul)

**Type:** Work / Task completion
**Task:** airspace-v4kqz - Gesperrte Lufträume in der Plausibilitätsprüfung: schneidet der Großkreis einen gesperrten Luftraum, entfällt die Korridorprüfung und die erlaubte Kursabweichung steigt (Befund KAL908 London–Seoul)
**Summary:** Gesperrte Luftraeume (12 grobe Polygone, konfigurierbar) in der Plausibilitaetspruefung: umgeleitete Legs korridorfrei mit Kurstoleranz 90 Grad; KAL908 London-Seoul plausibel; Verifier PASS it.1 (464 Tests)
**Duration:** (unknown)
**Verification:** PASS (iteration 1)
**Files changed:** 0
**Tests added:** 0
**ADRs written:** none

---

## 2026-10-27 21:18 -- Modeling / Promoted: airspace-b7kx2 - Eigene Flughafenliste, damit Routen unabhängig vom Anbieter gleich aussehen

**Type:** Modeling / Promote
**BC:** airspace
**From → To:** backlog → todo

---

## 2026-10-27 21:18 -- Modeling / Refined: airspace-b7kx2 - Eigene Flughafenliste, damit Routen unabhängig vom Anbieter gleich aussehen

**Type:** Modeling / Refine
**BC:** airspace
**Status after:** todo
**Summary:** Offene Fragen mit Defaults entschieden (Stadtname statt Flughafenname, Sprache wie VRS-Snapshot, Pflege per Commit). Umfang: icao im Airport-Modell und in allen vier Adaptern, statische Tabelle tables/airports.json, formatRoute nutzt die Tabelle, Fallback mit einmaliger Warnung. Gespeicherte Altdaten bleiben unverändert. Acceptance Criteria definiert.
**Split into:** none
**ADRs written:** none

---

## 2026-10-27 21:16 -- Capture / Captured: airspace-b7kx2 - Eigene Flughafenliste, damit Routen unabhängig vom Anbieter gleich aussehen

**Type:** Capture
**BC:** airspace
**Filed to:** backlog
**Summary:** Eigene kuratierte Flughafenliste (ICAO → Stadt), damit Routen unabhängig vom Anbieter gleich aussehen

---

## 2026-10-27 21:10 -- Batch started: [airspace-v4kqz]

**Type:** Work / Batch start
**Tasks:** airspace-v4kqz - Gesperrte Lufträume in der Plausibilitätsprüfung: schneidet der Großkreis einen gesperrten Luftraum, entfällt die Korridorprüfung und die erlaubte Kursabweichung steigt (Befund KAL908 London–Seoul)
**Parallel:** no (1 worker)

---

## 2026-10-27 21:05 -- Modeling / Promoted: airspace-v4kqz - Gesperrte Lufträume in der Plausibilitätsprüfung: schneidet der Großkreis einen gesperrten Luftraum, entfällt die Korridorprüfung und die erlaubte Kursabweichung steigt (Befund KAL908 London–Seoul)

**Type:** Modeling / Promote
**BC:** airspace
**From → To:** backlog → todo

---

## 2026-10-27 21:05 -- Modeling / Captured: airspace-v4kqz - Gesperrte Lufträume in der Plausibilitätsprüfung: schneidet der Großkreis einen gesperrten Luftraum, entfällt die Korridorprüfung und die erlaubte Kursabweichung steigt (Befund KAL908 London–Seoul)

**Type:** Modeling / Capture
**BC:** airspace
**Filed to:** backlog
**Summary:** Gesperrte Luftraeume als grobe Polygone in der Plausibilitaetspruefung: Korridor aus und Kursabweichung 90 Grad bei umgeleiteten Routen (Befund KAL908 London-Seoul)

---

## 2026-10-27 19:55 -- Work session ended

**Type:** Work / Session end
**Duration:** 34m (19:26–20:00, 4 waves)
**Completed:** 8 (first-try PASS: 5, re-dispatched: 3, skipped: 0) — airspace-n8c4t, airspace-prwpv, sighting-log-k4m7q, infrastructure-q2w8h, airspace-hw8f9, design-system-kcpnw, airspace-f9cjz, sighting-log-t8tfb
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Lost-result re-dispatches:** 0
**Lost-result escalations:** 0
**Dispatches:** airspace-n8c4t: 2, airspace-prwpv: 2, sighting-log-k4m7q: 1, infrastructure-q2w8h: 1, airspace-hw8f9: 1, design-system-kcpnw: 2, airspace-f9cjz: 1, sighting-log-t8tfb: 1
**Commits:** 12 (4 batch-start, 8 integrating) + this entry
**Vision-conformance:** none — batch aligns with vision
**Batch mix:** 75% product-facing / 25% harness / 0% bookkeeping (8 tasks)
**Carry-over:** .agentheim/.dashboard/: left behind (owner: dashboard runtime, untracked before this session); left behind (user WIP, 2 files: config.yaml, data/)

---

## 2026-10-27 19:54 -- Task verified and completed: sighting-log-t8tfb - Lackierungs-Statistik „npm run stats:liveries“: welche Airlines wie oft mit der Standard-Lackierung gezeigt wurden, weil kein Design oder keine Zuordnung vorlag

**Type:** Work / Task completion
**Task:** sighting-log-t8tfb - Lackierungs-Statistik „npm run stats:liveries“: welche Airlines wie oft mit der Standard-Lackierung gezeigt wurden, weil kein Design oder keine Zuordnung vorlag
**Summary:** Lackierungs-Statistik npm run stats:liveries (Airlines mit Standard-Lackierung je Typklasse, unmapped Präfixe, ohne Airline, Anteil vorhanden; --standort wie stats:routes)
**Duration:** 5m10s
**Verification:** PASS (iteration 1)
**Files changed:** 5
**Tests added:** 7
**ADRs written:** none

---

## 2026-10-27 19:54 -- Task verified and completed: airspace-f9cjz - Airline-Lackierungszuordnung für alle Katalog-Lackierungen vervollständigen (Emirates, Qatar, United, Jet2, KLM Cityhopper …) und Lackierungen standardmäßig einschalten

**Type:** Work / Task completion
**Task:** airspace-f9cjz - Airline-Lackierungszuordnung für alle Katalog-Lackierungen vervollständigen (Emirates, Qatar, United, Jet2, KLM Cityhopper …) und Lackierungen standardmäßig einschalten
**Summary:** Lackierungszuordnung vervollständigt (alle Katalog-Lackierungen außer def referenziert, 7 Airlines nachgetragen, GEC/CAO/HOP bewusst ohne); liveries.enabled Default true
**Duration:** 5m30s
**Verification:** PASS (iteration 1)
**Files changed:** 6
**Tests added:** 4
**ADRs written:** none

---

## 2026-10-27 19:50 -- Batch started: [airspace-f9cjz, sighting-log-t8tfb]

**Type:** Work / Batch start
**Tasks:** airspace-f9cjz - Airline-Lackierungszuordnung für alle Katalog-Lackierungen vervollständigen (Emirates, Qatar, United, Jet2, KLM Cityhopper …) und Lackierungen standardmäßig einschalten, sighting-log-t8tfb - Lackierungs-Statistik „npm run stats:liveries“: welche Airlines wie oft mit der Standard-Lackierung gezeigt wurden, weil kein Design oder keine Zuordnung vorlag
**Parallel:** yes (2 workers — wave 4; both promoted mid-run, no file overlap)

---

## 2026-10-27 19:50 -- Task verified and completed: design-system-kcpnw - Übergangs-Player und -Katalog datengetrieben machen (Slot-Referenzen statt Beispiel-Keys), Storybook-Bilder bleiben identisch

**Type:** Work / Task completion
**Task:** design-system-kcpnw - Übergangs-Player und -Katalog datengetrieben machen (Slot-Referenzen statt Beispiel-Keys), Storybook-Bilder bleiben identisch
**Summary:** Übergangs-Player und -Katalog datengetrieben (TransitionData, PlaneRef, sampleTransitionData, TRANSITION_MS, data-side); alle 22 Bühnen snapshot-identisch
**Duration:** 12m20s
**Verification:** PASS (iteration 2)
**Files changed:** 7
**Tests added:** 12
**ADRs written:** none

---

## 2026-10-27 19:47 -- Verification failed: design-system-kcpnw - Übergangs-Player datengetrieben

**Type:** Work / Verification failure
**Task:** design-system-kcpnw - Übergangs-Player und -Katalog datengetrieben machen (Slot-Referenzen statt Beispiel-Keys), Storybook-Bilder bleiben identisch
**Iteration:** 1 of 3
**Reasons:** Kriterium 7 nur für one-to-two geprüft statt je Spec (data-side="to"-Zählung für alle 11 Flugzeug-Specs fehlt); abweichende Zählung 2+2+1 statt 1+1+1 nicht im Outcome begründet
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-27 19:46 -- Modeling / Refined: design-system-t6wz4 - Neue Lackierungen und Logos für Airlines ohne eigenes Design zeichnen

**Type:** Modeling / Refine
**BC:** design-system
**Status after:** backlog
**Summary:** Der Capture hatte drei Teile. Befund aus Code und Sichtungslog: 41 Lackierungen im Katalog, aber nur 24 Präfix-Zuordnungen und liveries.enabled per Default aus; 15 Logos vorhanden. Zuordnungs-Fix und Statistik abgespalten (beide direkt in todo). t6wz4 bleibt Zeichenarbeit (erste Runde: SunExpress, Cathay Pacific, AJet, Corendon, Aegean, Virgin Atlantic + Logos für 10 häufige Airlines), hängt an airspace-f9cjz und bleibt im Backlog, bis der Betreiber entscheidet, woher die Logo-Bilder kommen.
**Split into:** airspace-f9cjz, sighting-log-t8tfb
**ADRs written:** none

---

## 2026-10-27 19:46 -- Modeling / Captured: sighting-log-t8tfb - Lackierungs-Statistik „npm run stats:liveries“: welche Airlines wie oft mit der Standard-Lackierung gezeigt wurden, weil kein Design oder keine Zuordnung vorlag

**Type:** Modeling / Capture
**BC:** sighting-log
**Filed to:** todo
**Summary:** Abgespalten aus design-system-t6wz4: neue Auswertung npm run stats:liveries zeigt je Airline, wie oft die Standard-Lackierung gezeigt wurde, plus unmapped Präfixe.

---

## 2026-10-27 19:46 -- Modeling / Captured: airspace-f9cjz - Airline-Lackierungszuordnung für alle Katalog-Lackierungen vervollständigen (Emirates, Qatar, United, Jet2, KLM Cityhopper …) und Lackierungen standardmäßig einschalten

**Type:** Modeling / Capture
**BC:** airspace
**Filed to:** todo
**Summary:** Abgespalten aus design-system-t6wz4: 17 Katalog-Lackierungen sind keinem Airline-Präfix zugeordnet (Emirates, Qatar, United, Jet2, KLM Cityhopper …) und liveries.enabled ist per Default aus. Zuordnung vervollständigen, Test dafür, Default auf true.

---

## 2026-10-27 19:43 -- Modeling / Refined: sky-scene-n0sfy - Flugzeug-Übergänge in der Live-Szene abspielen; Diff per icao24, Übergang-Sperre

**Type:** Modeling / Refine
**BC:** sky-scene
**Status after:** todo
**Summary:** Zweiter Durchgang: Voraussetzungen gegengeprüft (ADR 0020 vorhanden, 11 Spec-Ids im Katalog, Kompaktierung des planes-Arrays bestätigt), Dateipfad-Verweis auf sky-service.ts korrigiert. Akzeptanzkriterien und Abhängigkeiten unverändert; Task klärt die Readiness-Schwelle und wird promotet.

---

## 2026-10-27 19:41 -- Batch started: [design-system-kcpnw]

**Type:** Work / Batch start
**Tasks:** design-system-kcpnw - Übergangs-Player und -Katalog datengetrieben machen (Slot-Referenzen statt Beispiel-Keys), Storybook-Bilder bleiben identisch
**Parallel:** no (1 worker — wave 3; task promoted mid-run, only ready task)

---

## 2026-10-27 19:40 -- Task verified and completed: airspace-hw8f9 - Flugphasen-Prüfung nur unterhalb der Reiseflughöhe, ab 5 m/s und erst 400 km vom Flughafen; Steigprofil nahe dem Abflughafen lockern (Abflugrouten sind länger als die Luftlinie)

**Type:** Work / Task completion
**Task:** airspace-hw8f9 - Flugphasen-Prüfung nur unterhalb der Reiseflughöhe, ab 5 m/s und erst 400 km vom Flughafen; Steigprofil nahe dem Abflughafen lockern (Abflugrouten sind länger als die Luftlinie)
**Summary:** Flugphasen-Prüfung nur unter 8000 m, ab 5 m/s und erst 400 km vom Flughafen; Steigprofil 150 m/km + 1500 m Slack (LZB407 und KLC24J plausibel, EWG9YV weiter abgelehnt)
**Duration:** 5m40s
**Verification:** PASS (iteration 1)
**Files changed:** 5
**Tests added:** 3
**ADRs written:** none

---

## 2026-10-27 19:40 -- Capture / Captured: design-system-t6wz4 - Flugzeuge je Airline in eigener Lackierung zeichnen, fehlende Airline-Designs in der Statistik ausweisen

**Type:** Capture
**BC:** design-system
**Filed to:** backlog
**Summary:** Flugzeuge je Airline in eigener Lackierung zeichnen; in der Statistik ausweisen, für welche Airline kein Design vorhanden war und die Standard-Lackierung genommen wurde

---

## 2026-10-27 19:39 -- Task verified and completed: infrastructure-q2w8h - Test sichert ab, dass die Mock-Endpunkte im Live-Modus nicht erreichbar sind

**Type:** Work / Task completion
**Task:** infrastructure-q2w8h - Test sichert ab, dass die Mock-Endpunkte im Live-Modus nicht erreichbar sind
**Summary:** Test sichert ab, dass die Mock-Endpunkte im Live-Modus nicht erreichbar sind (GET 404, POST 405, kein Mock-Effekt); ADR 0013 amendiert
**Duration:** 4m10s
**Verification:** PASS (iteration 1)
**Files changed:** 1
**Tests added:** 3
**ADRs written:** 0013 (amendment)

---

## 2026-10-27 19:36 -- Modeling / Promoted: design-system-kcpnw - Übergangs-Player und -Katalog datengetrieben machen (Slot-Referenzen statt Beispiel-Keys), Storybook-Bilder bleiben identisch

**Type:** Modeling / Promote
**BC:** design-system
**From → To:** backlog → todo

---

## 2026-10-27 19:36 -- Modeling / Refined: sky-scene-bvnnx - Animationen für den Wechsel der Flugzeuge wie in Design-Prototyp und Storybook umsetzen

**Type:** Modeling / Refine
**BC:** sky-scene
**Status after:** todo (Kinder), Parent dismissed
**Summary:** Umfang auf die 11 Flugzeug-Übergänge begrenzt (Himmel-Crossfades Folge-Task). Regeln: laufender Übergang wird nie unterbrochen, neuester Stand nach Ende (zweite VorleseSperre-Instanz, verkettet); Ende per festem Timer statt animationend; Diff per icao24 auf dem kompaktierten planes[] mit vollständiger Entscheidungstabelle, Fallback Schnitt; Tippen ab Frame 0. Befund: planes[] ist kompaktiert, Überlebender kann Index 1 sein (Spiegelfall 1→2 ohne Spec → Schnitt). Parent per Split ersetzt und dismissed.
**Split into:** design-system-kcpnw (Player datengetrieben), sky-scene-n0sfy (Live-Abspielen, depends_on kcpnw)
**ADRs written:** 0020

---

## 2026-10-27 19:36 -- Modeling / Dismissed: sky-scene-bvnnx

**Type:** Modeling / Dismiss
**Dismissed:**
- sky-scene-bvnnx - Animationen für den Wechsel der Flugzeuge wie in Design-Prototyp und Storybook umsetzen (sky-scene)

---

## 2026-10-27 19:36 -- Batch started: [infrastructure-q2w8h, airspace-hw8f9]

**Type:** Work / Batch start
**Tasks:** infrastructure-q2w8h - Test sichert ab, dass die Mock-Endpunkte im Live-Modus nicht erreichbar sind, airspace-hw8f9 - Flugphasen-Prüfung nur unterhalb der Reiseflughöhe, ab 5 m/s und erst 400 km vom Flughafen; Steigprofil nahe dem Abflughafen lockern (Abflugrouten sind länger als die Luftlinie)
**Parallel:** yes (2 workers — wave 2; q2w8h held from wave 1 by cap, hw8f9 promoted mid-run and unblocked by prwpv)

---

## 2026-10-27 19:36 -- Modeling / Captured: sky-scene-n0sfy - Flugzeug-Übergänge (kommt / geht / wechselt) in der Live-Szene abspielen statt hart zu schneiden; Diff per icao24, Übergang-Sperre puffert den neuesten Stand

**Type:** Modeling / Capture
**BC:** sky-scene
**Filed to:** backlog
**Summary:** Die 11 Flugzeug-Übergänge live abspielen: pickTransition per icao24 auf kompaktiertem planes[] (Entscheidungstabelle, Fallback Schnitt), zweite VorleseSperre-Instanz als Übergang-Sperre (nie unterbrechen, neuester Stand nach Ende), Tippen ab Frame 0, E2E-Szenario. Kind von sky-scene-bvnnx.

---

## 2026-10-27 19:36 -- Modeling / Captured: design-system-kcpnw - Übergangs-Player und -Katalog datengetrieben machen (Slot-Referenzen statt Beispiel-Keys), Storybook-Bilder bleiben identisch

**Type:** Modeling / Capture
**BC:** design-system
**Filed to:** backlog
**Summary:** Übergangs-Player/Katalog datengetrieben (PlaneRef side+index statt Sample-Keys, TransitionData, TRANSITION_MS, data-side=to); Storybook-Bilder per Snapshot identisch. Kind von sky-scene-bvnnx.

---

## 2026-10-27 19:35 -- Task verified and completed: airspace-prwpv - Abgelehnte Routen je Takt gegen die aktuelle Position neu prüfen statt 10 Minuten negativ zu cachen; Korridor auf 50 km + 8 % lockern

**Type:** Work / Task completion
**Task:** airspace-prwpv - Abgelehnte Routen je Takt gegen die aktuelle Position neu prüfen statt 10 Minuten negativ zu cachen; Korridor auf 50 km + 8 % lockern
**Summary:** Abgelehnte Routen werden gemerkt und je Takt gegen die aktuelle Position neu bewertet (ohne erneute Quellabfrage); Negativ-Cache nur bei all-unknown; Korridor 50 km + 8 % mit Deckel 150 km
**Duration:** 11m30s
**Verification:** PASS (iteration 2)
**Files changed:** 5
**Tests added:** 7
**ADRs written:** none

---

## 2026-10-27 19:34 -- Task verified and completed: sighting-log-k4m7q - Beobachtungsstandort je Sichtung mitloggen (Tabelle observation_points, Standortwechsel beendet den Besuch, Statistik je Standort)

**Type:** Work / Task completion
**Task:** sighting-log-k4m7q - Beobachtungsstandort je Sichtung mitloggen (Tabelle observation_points, Standortwechsel beendet den Besuch, Statistik je Standort)
**Summary:** Beobachtungsstandort je Sichtung (Tabelle observation_points, Migration 0006); Standortwechsel beendet den Besuch; stats:routes filtert je Standort (--standort)
**Duration:** 6m50s
**Verification:** PASS (iteration 1)
**Files changed:** 15
**Tests added:** 8
**ADRs written:** none

---

## 2026-10-27 19:33 -- Task verified and completed: airspace-n8c4t - Unmapped Keys aus dem Live-Betrieb kuratieren: 30 Airline-Präfixe und 13 Typcodes in die Tabellen aufnehmen, ZZZZ als "kein Typcode" behandeln

**Type:** Work / Task completion
**Task:** airspace-n8c4t - Unmapped Keys aus dem Live-Betrieb kuratieren: 30 Airline-Präfixe und 13 Typcodes in die Tabellen aufnehmen, ZZZZ als "kein Typcode" behandeln
**Summary:** 26 Airline-Präfixe und 11 Typcodes aus dem Live-Betrieb kuratiert; ZZZZ gilt als kein Typcode (kein unmapped-Report); OCN, MGH, NGN, SRR, JUNR unbelegt weggelassen
**Duration:** 9m45s
**Verification:** PASS (iteration 2)
**Files changed:** 5
**Tests added:** 4
**ADRs written:** none

---

## 2026-10-27 19:31 -- Verification failed: airspace-prwpv - Abgelehnte Routen je Takt neu prüfen; Korridor lockern

**Type:** Work / Verification failure
**Task:** airspace-prwpv - Abgelehnte Routen je Takt gegen die aktuelle Position neu prüfen statt 10 Minuten negativ zu cachen; Korridor auf 50 km + 8 % lockern
**Iteration:** 1 of 3
**Reasons:** Kriterium 4 / BC-README-Sync — Plausibilitaetspruefung-Bullet nennt noch 5 % ohne Deckel, README_DELTA leer; Playwright chromium in frischem Worktree ohne storybook-static (Umgebung, kein FAIL-Grund)
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-27 19:31 -- Verification failed: airspace-n8c4t - Unmapped Keys aus dem Live-Betrieb kuratieren

**Type:** Work / Verification failure
**Task:** airspace-n8c4t - Unmapped Keys aus dem Live-Betrieb kuratieren: 30 Airline-Präfixe und 13 Typcodes in die Tabellen aufnehmen, ZZZZ als "kein Typcode" behandeln
**Iteration:** 1 of 3
**Reasons:** BC README sync — ZZZZ-als-kein-Typcode-Regel fehlt im airspace README (README_DELTA leer)
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-27 19:29 -- Modeling / Captured: airspace-hw8f9 - Flugphasen-Prüfung nur unterhalb der Reiseflughöhe, ab 5 m/s und erst 400 km vom Flughafen; Turbulenz und Stufen-Sinkflug nicht als Anflug werten

**Type:** Modeling / Capture
**BC:** airspace
**Filed to:** todo
**Summary:** Flugphasen-Prüfung nur unter 8000 m, ab 5 m/s, erst 400 km vom Flughafen — Befund LZB407 (Sinkflug in FL314 280 km vor Brüssel abgelehnt)

---

## 2026-10-27 19:24 -- Batch started: [airspace-n8c4t, airspace-prwpv, sighting-log-k4m7q]

**Type:** Work / Batch start
**Tasks:** airspace-n8c4t - Unmapped Keys aus dem Live-Betrieb kuratieren: 30 Airline-Präfixe und 13 Typcodes in die Tabellen aufnehmen, ZZZZ als "kein Typcode" behandeln, airspace-prwpv - Abgelehnte Routen je Takt gegen die aktuelle Position neu prüfen statt 10 Minuten negativ zu cachen; Korridor auf 50 km + 8 % lockern, sighting-log-k4m7q - Beobachtungsstandort je Sichtung mitloggen (Tabelle observation_points, Standortwechsel beendet den Besuch, Statistik je Standort)
**Parallel:** yes (3 workers — infrastructure-q2w8h held to next wave by MAX_PARALLEL=3; ready set was 4)
**Planning advisory:** whats-next (2026-10-27 12:49, stale — older than last Work entry) ranked live-test captures first, q2w8h second

---

## 2026-10-27 19:22 -- Modeling / Captured: airspace-prwpv - Abgelehnte Routen je Takt gegen die aktuelle Position neu prüfen statt 10 Minuten negativ zu cachen; Korridor auf 50 km + 8 % lockern

**Type:** Modeling / Capture
**BC:** airspace
**Filed to:** todo
**Summary:** Abgelehnte Routen je Takt gegen die aktuelle Position neu prüfen statt 10 min negativ zu cachen; Korridor 50 km + 8 % (ggf. Deckel 150 km) — Befund CTN4456

---

## 2026-10-27 19:17 -- Modeling / Refined: infrastructure-d3v7k - Geräteabnahme des Walking Skeletons auf ZimaOS-Heimserver und echtem iPad

**Type:** Modeling / Refine
**BC:** infrastructure
**Status after:** todo
**Summary:** In Worker-Hälfte (Podman: Piper-Sidecar gegen echten Server verifizieren und Fixture ersetzen, Dienst-Image live starten, Playwright WebKit grün, README-Betriebsabschnitt auf aktuelle Quellketten und stats:routes) und Betreiber-Hälfte (fünf [human-eye]-Kriterien: Compose auf ZimaOS, iPad, Gegenprüfung, Hörprobe, Befunde a-c) geteilt; neue depends_on airspace-w3k8d und sighting-log-k4m7q; Stichprobe 1 h per stats:routes. Kein Split.
**ADRs written:** none

---

## 2026-10-27 19:17 -- Work session ended

**Type:** Work / Session end
**Duration:** ~12m (scoped run airspace-w3k8d)
**Completed:** 1 — airspace-w3k8d (PASS it. 1)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Lost-result re-dispatches:** 0
**Lost-result escalations:** 0
**Dispatches:** 1 worker, 1 verifier
**Commits:** batch start 4727254, integrating 6298b16
**Vision-conformance:** in scope (Routenquellen)
**Batch mix:** 1 airspace task
**Carry-over:** none

---

## 2026-10-27 19:16 -- Task verified and completed: airspace-w3k8d - hexdb.io als Routenquelle, vorerst an erster Stelle vor adsbdb und VRS; Konfliktregel: erste plausible Route gewinnt

**Type:** Work / Task completion
**Task:** airspace-w3k8d - hexdb.io als Routenquelle, vorerst an erster Stelle vor adsbdb und VRS; Konfliktregel: erste plausible Route gewinnt
**Summary:** hexdb.io als erste Routenquelle (Default-Kette hexdb → adsbdb → vrs), erste plausible Route gewinnt, hexdb-Text nie persistiert; ADR 0016 amendiert
**Duration:** 8m
**Verification:** PASS (iteration 1)
**Files changed:** 15
**Tests added:** 17 (hexdb-route-source.test.ts)
**ADRs written:** 0016 (amendment)

---

## 2026-10-27 19:15 -- Modeling / Dismissed: airspace-p2v6d

**Type:** Modeling / Dismiss
**Dismissed:**
- airspace-p2v6d - Persistierter Routen-Cache fuer Online-Quellen (airspace)

---

## 2026-10-27 19:14 -- Capture / Captured: sky-scene-bvnnx - Animationen für den Wechsel der Flugzeuge wie in Design-Prototyp und Storybook umsetzen

**Type:** Capture
**BC:** sky-scene
**Filed to:** backlog
**Summary:** Animationen für den Wechsel der Flugzeuge wie in Design-Prototyp und Storybook umsetzen

---

## 2026-10-27 19:10 -- Batch started: [airspace-w3k8d]

**Type:** Work / Batch start
**Tasks:** airspace-w3k8d - hexdb.io als Routenquelle, vorerst an erster Stelle vor adsbdb und VRS; Konfliktregel: erste plausible Route gewinnt
**Parallel:** no (1 worker)

---

## 2026-10-27 19:06 -- Modeling / Promoted: sighting-log-k4m7q - Beobachtungsstandort je Sichtung mitloggen (Tabelle observation_points, Standortwechsel beendet den Besuch, Statistik je Standort)

**Type:** Modeling / Promote
**BC:** sighting-log
**From → To:** backlog → todo

---

## 2026-10-27 19:05 -- Modeling / Refined: sighting-log-k4m7q - Beobachtungsstandort je Sichtung mitloggen

**Type:** Modeling / Refine
**BC:** sighting-log
**Status after:** todo
**Summary:** Standort-Identitaet = Koordinaten (4 Nachkommastellen) + radiusKm, place nur Label; eigene Tabelle observation_points (Migration 0006), sightings.observation_point_id nullable, Altzeilen bleiben NULL (Gruppe unbekannt); Standortwechsel beendet den Besuch (Hydrate/UPDATE nur auf aktuellen Standort); stats:routes filtert auf Standort der neuesten Sichtung, Flag --standort (id, unbekannt, alle). Neun machine-checkable Kriterien. Kein Split.
**ADRs written:** none

---

## 2026-10-27 19:05 -- Modeling / Promoted: airspace-w3k8d - hexdb.io als Routenquelle, vorerst an erster Stelle vor adsbdb und VRS; Konfliktregel: erste plausible Route gewinnt

**Type:** Modeling / Promote
**BC:** airspace
**From → To:** backlog → todo

---

## 2026-10-27 19:03 -- Work session ended

**Type:** Work / Session end
**Duration:** ~45m (batch airspace-c5t9m + airspace-p8w2k)
**Completed:** 2 — airspace-c5t9m (PASS it. 1), airspace-p8w2k (PASS it. 2)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Lost-result re-dispatches:** 0
**Lost-result escalations:** 0
**Dispatches:** 3 worker iterations, 3 verifier runs
**Commits:** 2 integrating commits (510b04c, 00b39de) + batch start
**Vision-conformance:** both tasks within scope (Routenquellen/Plausibilität); vision open question on routes unchanged
**Batch mix:** 2 airspace tasks
**Carry-over:** none from work; a concurrent modeling session has airspace-n8c4t promote (backlog→todo) in flight on the working tree — left untouched

---

## 2026-10-27 19:03 -- Task verified and completed: airspace-p8w2k - Plausibilitätsprüfung schärfen: Kurs und Flugphase gegen die Route prüfen, nur fern von Start- und Zielflughafen; engerer Korridor per Querabstand

**Type:** Work / Task completion
**Task:** airspace-p8w2k - Plausibilitätsprüfung schärfen: Kurs und Flugphase gegen die Route prüfen, nur fern von Start- und Zielflughafen; engerer Korridor per Querabstand
**Summary:** Plausibilitätsprüfung geschärft: Querabstand-Korridor, Höhenprofil, Flugphase und Kurs außerhalb der Flughafenzonen; Schwellen konfigurierbar unter sources.route.plausibility
**Duration:** 41m
**Verification:** PASS (iteration 2)
**Files changed:** 11
**Tests added:** 20 (route-plausibility.test.ts)
**ADRs written:** none

---

## 2026-10-27 19:03 -- Modeling / Promoted: airspace-n8c4t - Unmapped Keys aus dem Live-Betrieb kuratieren: 30 Airline-Präfixe und 13 Typcodes in die Tabellen aufnehmen, ZZZZ als "kein Typcode" behandeln

**Type:** Modeling / Promote
**BC:** airspace
**From → To:** backlog → todo

---

## 2026-10-27 19:03 -- Modeling / Refined: airspace-n8c4t - Unmapped Keys aus dem Live-Betrieb kuratieren

**Type:** Modeling / Refine
**BC:** airspace
**Status after:** todo
**Summary:** Umfang auf den aktuellen Zählstand erweitert (30 Airline-Präfixe mit ≥ 2 Sichtungen, 13 Typcodes inkl. A124, T6); ZZZZ wird als kein Typcode behandelt und nicht mehr als unmapped gemeldet; K35R = narrowbody/Langstrecke; offene Frage Bereinigung von unmapped_keys entschieden: keine Bereinigung, weder Migration noch Start-up-Prune. Kriterien auf Tabellen- und Unit-Tests konkretisiert.
**Split into:** —
**ADRs written:** —

---

## 2026-10-27 19:00 -- Modeling / Promoted: infrastructure-q2w8h - Test sichert ab, dass die Mock-Endpunkte im Live-Modus nicht erreichbar sind

**Type:** Modeling / Promote
**BC:** infrastructure
**From → To:** backlog → todo

---

## 2026-10-27 19:00 -- Modeling / Refined: infrastructure-q2w8h - Test sichert ab, dass die Mock-Endpunkte im Live-Modus nicht erreichbar sind

**Type:** Modeling / Refine
**BC:** infrastructure
**Status after:** todo
**Summary:** Testort und Boot-Muster festgelegt (Vitest gegen startService im live-Modus, ablehnender fetch, kein Netz). Code-Befund: GET /mock/sightings → 404 (statischer Fallback), POST /mock/advance → 405 (nicht 404 wie ADR 0013 sagt); Kriterien entsprechend geschärft, plus Nebenwirkungsfreiheit von /api/state, Gegenprobe im mock-Modus, manuelle Mutationsprobe und ein Amendment-Satz in ADR 0013.

---

## 2026-10-27 18:59 -- Verification failed (iteration 1): airspace-p8w2k

**Type:** Work
**Task:** airspace-p8w2k
**Verdict:** FAIL — Positivfälle LHX1979 Köln–München und AUA166D Düsseldorf–Wien nicht getestet; EWG9YV-Test beweist nicht die Ablehnung wegen Richtung (Höhenprofil lehnt bereits ab). Code selbst korrekt; alle Suiten grün nach npm run assets.
**Next:** Re-Dispatch Iteration 2 mit Verifier-Hinweis.

---

## 2026-10-27 18:54 -- Task verified and completed: airspace-c5t9m - airplanes.live aus der FlightSource-Kette entfernen (feeder-only, Betreiber will keinen Feeder betreiben)

**Type:** Work / Task completion
**Task:** airspace-c5t9m - airplanes.live aus der FlightSource-Kette entfernen (feeder-only, Betreiber will keinen Feeder betreiben)
**Summary:** airplanes.live aus der FlightSource-Kette entfernt; Kette ist jetzt adsb.fi → adsb.lol; ADR 0019 amendiert
**Duration:** 18m
**Verification:** PASS (iteration 1)
**Files changed:** 12
**Tests added:** flight-source-chain.test.ts (config rejects removed source); budget and wiring tests rewritten to two stages
**ADRs written:** 0019 (amendment)

---

## 2026-10-27 18:47 -- Batch started: [airspace-c5t9m, airspace-p8w2k]

**Type:** Work / Batch start
**Tasks:** airspace-c5t9m - airplanes.live aus der FlightSource-Kette entfernen (feeder-only, Betreiber will keinen Feeder betreiben), airspace-p8w2k - Plausibilitätsprüfung schärfen: Kurs und Flugphase gegen die Route prüfen, nur fern von Start- und Zielflughafen; engerer Korridor per Querabstand
**Parallel:** yes (2 workers) — merge order c5t9m then p8w2k; disjoint files (chain/app.ts vs route-service/plausibility)

---

## 2026-10-27 18:47 -- Modeling / Promoted: airspace-p8w2k - Plausibilitätsprüfung schärfen: Kurs und Flugphase gegen die Route prüfen, nur fern von Start- und Zielflughafen; engerer Korridor per Querabstand

**Type:** Modeling / Promote
**BC:** airspace
**From → To:** backlog → todo

---

## 2026-10-27 18:47 -- Modeling / Promoted: airspace-c5t9m - airplanes.live aus der FlightSource-Kette entfernen (feeder-only, Betreiber will keinen Feeder betreiben)

**Type:** Modeling / Promote
**BC:** airspace
**From → To:** backlog → todo

---

## 2026-10-27 18:39 -- Modeling / Captured: airspace-c5t9m - airplanes.live aus der FlightSource-Kette entfernen (feeder-only, Betreiber will keinen Feeder betreiben)

**Type:** Modeling / Capture
**BC:** airspace
**Filed to:** backlog
**Summary:** airplanes.live-Adapter entfernen (feeder-only, kein eigener Feeder geplant); Kette wird adsb-fi -> adsb-lol; ADR 0019 Nachtrag.

---

## 2026-10-27 18:34 -- Modeling / Captured: airspace-p8w2k - Plausibilitätsprüfung schärfen: Kurs und Flugphase gegen die Route prüfen, nur fern von Start- und Zielflughafen; engerer Korridor per Querabstand

**Type:** Modeling / Capture
**BC:** airspace
**Filed to:** backlog
**Summary:** Plausibilitaet schaerfen: Kurs- und Flugphasenpruefung gegen die Route (nur ausserhalb einer 50-km-Zone um Start- und Zielflughafen), Querabstand statt Ellipse. Ausloeser: EWG16Y und EWG9YV am 2026-10-27 mit falschen, aber durchgelassenen Routen.

---

## 2026-10-27 18:33 -- Work session ended

**Type:** Work / Session end
**Duration:** 1h55m
**Completed:** 3 (first-try PASS: 1, re-dispatched: 2, skipped: 0)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Lost-result re-dispatches:** 1
**Lost-result escalations:** 0
**Dispatches:** airspace-k2d7f: 1, airspace-v6m3h: 2, airspace-b9r4w: 3 (incl. 1 merge-conflict resolve dispatch, ADR-0072 ladder rungs 1-6)
**Commits:** 7
**Vision-conformance:** none — batch aligns with vision
**Batch mix:** 100% product-facing / 0% harness / 0% bookkeeping (3 tasks)
**Carry-over:** left behind (user WIP, 2 files: config.yaml, data/); salvage patch .agentheim/salvage/airspace-b9r4w-merge-conflict.patch kept (gitignored)

---

## 2026-10-27 18:33 -- Task verified and completed: airspace-b9r4w - adsb.lol als dritte Flugquelle mit persistiertem Tagesbudget (400 von 500 Requests) und Auswertung der Rate-Limit-Header

**Type:** Work / Task completion
**Task:** airspace-b9r4w - adsb.lol als dritte Flugquelle mit persistiertem Tagesbudget (400 von 500 Requests) und Auswertung der Rate-Limit-Header
**Summary:** adsb.lol als dritte Flugquelle mit persistiertem UTC-Tagesbudget (400 von 500), Auswertung von x-ratelimit-remaining/-reset, Sperre bis Mitternacht, Budget in /healthz
**Duration:** 62m
**Verification:** PASS (iteration 2, post-conflict re-verify)
**Files changed:** 11
**Tests added:** 11
**ADRs written:** none

---

## 2026-10-27 18:26 -- Task verified and completed: airspace-v6m3h - airplanes.live als zweite Flugquelle in der FlightSource-Kette

**Type:** Work / Task completion
**Task:** airspace-v6m3h - airplanes.live als zweite Flugquelle in der FlightSource-Kette
**Summary:** airplanes.live als zweite Flugquelle registriert; Live-Test zeigt feeder-only (403), Adapter pausiert 1 h, Kette faellt im selben Takt auf adsb.lol durch
**Duration:** 28m
**Verification:** PASS (iteration 2)
**Files changed:** 8
**Tests added:** 7
**ADRs written:** none

---

## 2026-10-27 18:24 -- Verification failed: airspace-v6m3h - airplanes.live als zweite Flugquelle

**Type:** Work / Verification failure
**Task:** airspace-v6m3h - airplanes.live als zweite Flugquelle
**Iteration:** 1 of 3
**Reasons:** criterion 2 half-covered — no test for adsb.fi blocked + airplanes.live 200 serving the same Takt
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-27 18:19 -- Batch started: [airspace-v6m3h, airspace-b9r4w]

**Type:** Work / Batch start
**Tasks:** airspace-v6m3h - airplanes.live als zweite Flugquelle in der FlightSource-Kette, airspace-b9r4w - adsb.lol als dritte Flugquelle mit persistiertem Tagesbudget (400 von 500 Requests) und Auswertung der Rate-Limit-Header
**Parallel:** yes (2 workers) — merge order v6m3h then b9r4w (both register in app.ts / flight-source-names.ts)

---

## 2026-10-27 18:19 -- Modeling / Promoted: airspace-b9r4w - adsb.lol als dritte Flugquelle mit persistiertem Tagesbudget (400 von 500 Requests) und Auswertung der Rate-Limit-Header

**Type:** Modeling / Promote
**BC:** airspace
**From → To:** backlog → todo

---

## 2026-10-27 18:19 -- Modeling / Promoted: airspace-v6m3h - airplanes.live als zweite Flugquelle in der FlightSource-Kette

**Type:** Modeling / Promote
**BC:** airspace
**From → To:** backlog → todo

---

## 2026-10-27 18:19 -- Task verified and completed: airspace-k2d7f - adsb.fi als primäre Flugquelle; FlightSource-Kette mit Failover, Backoff nach Rate-Limit-Headern und Circuit Breaker

**Type:** Work / Task completion
**Task:** airspace-k2d7f - adsb.fi als primäre Flugquelle; FlightSource-Kette mit Failover, Backoff nach Rate-Limit-Headern und Circuit Breaker
**Summary:** adsb.fi als primaere Flugquelle; FlightSourceChain mit Failover im selben Takt, Backoff nach Retry-After/x-ratelimit-reset, Circuit Breaker, Quellenzustand in /healthz
**Duration:** 13m
**Verification:** PASS (iteration 1)
**Files changed:** 15
**Tests added:** 30
**ADRs written:** 0019

---

## 2026-10-27 18:10 -- Batch started: [airspace-k2d7f]

**Type:** Work / Batch start
**Tasks:** airspace-k2d7f - adsb.fi als primäre Flugquelle; FlightSource-Kette mit Failover, Backoff nach Rate-Limit-Headern und Circuit Breaker
**Parallel:** no (1 worker) — airspace-v6m3h and airspace-b9r4w in todo are blocked on airspace-k2d7f and will be dispatched after it integrates

---

## 2026-10-27 18:10 -- Modeling / Promoted: airspace-k2d7f - adsb.fi als primäre Flugquelle; FlightSource-Kette mit Failover, Backoff nach Rate-Limit-Headern und Circuit Breaker

**Type:** Modeling / Promote
**BC:** airspace
**From → To:** backlog → todo

---

## 2026-10-27 18:10 -- Modeling / Captured: airspace-b9r4w - adsb.lol als dritte Flugquelle mit persistiertem Tagesbudget (400 von 500 Requests) und Auswertung der Rate-Limit-Header

**Type:** Modeling / Capture
**BC:** airspace
**Filed to:** backlog
**Summary:** adsb.lol als Stufe 3 mit persistiertem Tagesbudget 400/500 und Auswertung von x-ratelimit-remaining/-reset.

---

## 2026-10-27 18:10 -- Modeling / Captured: airspace-v6m3h - airplanes.live als zweite Flugquelle in der FlightSource-Kette

**Type:** Modeling / Capture
**BC:** airspace
**Filed to:** backlog
**Summary:** airplanes.live als Stufe 2 der FlightSource-Kette; Vorab-Verifikation ob point ohne Feeder-Status antwortet.

---

## 2026-10-27 18:10 -- Modeling / Captured: airspace-k2d7f - adsb.fi als primäre Flugquelle; FlightSource-Kette mit Failover, Backoff nach Rate-Limit-Headern und Circuit Breaker

**Type:** Modeling / Capture
**BC:** airspace
**Filed to:** backlog
**Summary:** adsb.fi als primaere Flugquelle plus FlightSource-Kette mit Failover im selben Takt, Backoff nach Rate-Limit-Headern, Circuit Breaker, Attribution; ADR-Ergaenzung zu 0005. Ausloeser: adsb.lol Tageslimit 500/IP.

---

## 2026-10-27 18:04 -- Research: Alternativen zu adsb.lol als Positionsquelle

**Type:** Research
**Requested by:** user
**Report:** knowledge/research/flight-position-source-alternatives-2026-10-27.md
**Review:** PASS (iteration 1)
**Summary:** adsb.lol keyless ist auf 500 Requests/Tag je IP begrenzt (gemessen: 4/s, 60/min, 500/Tag), der 30-s-Takt braucht 2880. adsb.fi v3 liefert dasselbe readsb-Schema (gemessen), 1 req/s, nicht-kommerziell mit Quellenangabe: Drop-in-Primaerquelle. airplanes.live derzeit offen (1 req/s), adsb.one archiviert, OpenSky 4000 Credits/Tag als letzter Fallback. Empfehlung: Kette adsb.fi -> airplanes.live -> adsb.lol (Tagesbudget) -> OpenSky, Backoff nach Rate-Limit-Headern, Circuit Breaker; Eigenempfaenger (RTL-SDR, 40-70 EUR) mittelfristig als Stufe 0.

---

## 2026-10-27 17:21 -- Work session ended

**Type:** Work / Session end
**Duration:** 25m
**Completed:** 1 (first-try PASS: 1, re-dispatched: 0, skipped: 0)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Lost-result re-dispatches:** 1
**Lost-result escalations:** 0
**Dispatches:** airspace-f4q9z: 1
**Commits:** 2
**Vision-conformance:** airspace-f4q9z: diverges from non-goal/constraint "nur kostenlose, vertragsfreie Quellen" (ADR 0001) — deliberate, builder-decided, budgeted exception recorded in ADR 0018; opt-in only
**Batch mix:** 100% product-facing / 0% harness / 0% bookkeeping (1 task)
**Carry-over:** left behind (user WIP, 2 files: config.yaml, data/)

---

## 2026-10-27 17:21 -- Task verified and completed: airspace-f4q9z - FlightAware AeroAPI als budgetierte Notfall-Routenquelle (Opt-in, letzte Stufe, hartes Monatslimit, Usage-Sync)

**Type:** Work / Task completion
**Task:** airspace-f4q9z - FlightAware AeroAPI als budgetierte Notfall-Routenquelle (Opt-in, letzte Stufe, hartes Monatslimit, Usage-Sync)
**Summary:** FlightAware AeroAPI als optionale, budgetierte letzte Routenquelle: Filter narrowbody+ mit bekannter Airline, ereignisbasiertes Budget (flightaware_calls), Usage-Sync beim Start und alle <=30 Minuten, Key nur aus Env
**Duration:** 22m
**Verification:** PASS (iteration 1)
**Files changed:** 14
**Tests added:** 47
**ADRs written:** none

---

## 2026-10-27 17:12 -- Batch started: [airspace-f4q9z]

**Type:** Work / Batch start
**Tasks:** airspace-f4q9z - FlightAware AeroAPI als budgetierte Notfall-Routenquelle (Opt-in, letzte Stufe, hartes Monatslimit, Usage-Sync)
**Parallel:** no (1 worker) — single ready task

---

## 2026-10-27 17:10 -- Modeling / Promoted: airspace-f4q9z - FlightAware AeroAPI als budgetierte Notfall-Routenquelle (Opt-in, letzte Stufe, hartes Monatslimit, Usage-Sync)

**Type:** Modeling / Promote
**BC:** airspace
**From → To:** backlog → todo

---

## 2026-10-27 17:10 -- Modeling / Refined: airspace-f4q9z - FlightAware AeroAPI als budgetierte Notfall-Routenquelle

**Type:** Modeling / Refine
**BC:** airspace
**Status after:** todo
**Summary:** Live-Test mit 4 freigegebenen Aufrufen loeste LHX1HL, TKJ9GC und LAV8091 korrekt auf (Fixtures eingecheckt). Builder-Entscheidungen: letzte Stufe, Filter narrowbody+ mit bekannter Airline, ereignisbasiertes Budget (flightaware_calls, 15-Minuten-Lag-Fenster, 4,50 $/900 Saetze), Usage-Sync beim Start und alle <=30 Minuten, Key nur aus Env, Ergebnisse persistierbar. 14 Kriterien.
**ADRs written:** 0018

---

## 2026-10-27 16:34 -- Modeling / Captured: airspace-f4q9z - FlightAware AeroAPI als budgetierte Notfall-Routenquelle (Opt-in, letzte Stufe, hartes Monatslimit, Usage-Sync beim Start und alle 30 Minuten)

**Type:** Modeling / Capture
**BC:** airspace
**Filed to:** backlog
**Summary:** FlightAware AeroAPI Personal als Opt-in-Notfallquelle: nur wenn freie Quellen versagen, nur narrowbody+ mit bekannter Airline, hartes Budget 4,50 $/900 Requests je Periode, Usage-Sync beim Start und alle 30 Minuten, Key nur aus Env. Abweichung von ADR 0001 per neuem ADR.

---

## 2026-10-27 15:34 -- Research: Routenabdeckung steigern — Quellen, Heuristiken, Lizenzen

**Type:** Research
**Requested by:** user
**Report:** knowledge/research/route-coverage-sources-2026-10-27.md
**Review:** PASS (iteration 1)
**Summary:** Keine kostenlose Quelle und kein eigener Empfaenger kennt den tatsaechlich geflogenen Flug (ADS-B traegt kein Ziel). hexdb.io bringt ~8 Punkte, wie adsbdb nur im Speicher. FlightAware AeroAPI Personal ist die einzige realistische Last-Resort-Option ($5/Monat frei, $0.005/Abfrage, Speichern fuer private Zwecke erlaubt, ohne Ziel bei Fluegen ohne Flugplan); FR24 ohne Free-Tier. Konflikte zwischen Quellen per eigener Beobachtung (Kurs, Flugphase) schiedsen.

---

## 2026-10-27 15:32 -- Modeling / Captured: airspace-n8c4t - Unmapped Keys aus dem Live-Betrieb kuratieren: 26 Airline-Präfixe und 10 Typcodes in die Tabellen aufnehmen

**Type:** Modeling / Capture
**BC:** airspace
**Filed to:** backlog
**Summary:** 26 Airline-Praefixe (EXS, KLC, LHX, OCN, TKJ, ...) und 10 Typcodes aus unmapped_keys nach einem Tag Live-Betrieb in die Tabellen kuratieren; kuratierte Schluessel aus unmapped_keys bereinigen.

---

## 2026-10-27 15:22 -- Work session ended

**Type:** Work / Session end
**Duration:** 35m
**Completed:** 1 (first-try PASS: 0, re-dispatched: 1, skipped: 0)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Lost-result re-dispatches:** 0
**Lost-result escalations:** 0
**Dispatches:** sighting-log-m7p2v: 3
**Commits:** 2
**Vision-conformance:** none — batch aligns with vision
**Batch mix:** 100% product-facing / 0% harness / 0% bookkeeping (1 task)
**Carry-over:** left behind (user WIP, 2 files: config.yaml, data/)

---

## 2026-10-27 15:22 -- Task verified and completed: sighting-log-m7p2v - Routen-Statistik per CLI je Tag und Quelle, Liste der Unbekannten, Konflikte (nur Befunde, nie Routentext)

**Type:** Work / Task completion
**Task:** sighting-log-m7p2v - Routen-Statistik per CLI je Tag und Quelle, Liste der Unbekannten, Konflikte (nur Befunde, nie Routentext)
**Summary:** Routen-Befunde je Quelle in route_lookups (nur Befunde, nie Routentext), Opt-in compareAll fuer Konflikte, npm run stats:routes mit Tages-, Quellen-, Unbekannt-, Airline- und Konflikt-Auswertung
**Duration:** 31m
**Verification:** PASS (iteration 3)
**Files changed:** 13
**Tests added:** 17
**ADRs written:** none

---

## 2026-10-27 15:19 -- Verification failed: sighting-log-m7p2v - Routen-Statistik per CLI je Tag und Quelle, Liste der Unbekannten, Konflikte

**Type:** Work / Verification failure
**Task:** sighting-log-m7p2v - Routen-Statistik per CLI je Tag und Quelle, Liste der Unbekannten, Konflikte
**Iteration:** 2 of 3
**Reasons:** root README lacks the section on npm run stats:routes usage, JSON keys, the route_lookups licence rule and the compareAll switch; all iteration-1 findings fixed, tests 275 green
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-27 15:16 -- Verification failed: sighting-log-m7p2v - Routen-Statistik per CLI je Tag und Quelle, Liste der Unbekannten, Konflikte

**Type:** Work / Verification failure
**Task:** sighting-log-m7p2v - Routen-Statistik per CLI je Tag und Quelle, Liste der Unbekannten, Konflikte
**Iteration:** 1 of 3
**Reasons:** missing tests for migration on a 0002-level DB, PRAGMA schema whitelist, live SkyService path with all four outcomes + conflict, licence scan too narrow, second airline prefix unasserted, looked_up_at index missing
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-27 15:09 -- Batch started: [sighting-log-m7p2v]

**Type:** Work / Batch start
**Tasks:** sighting-log-m7p2v - Routen-Statistik per CLI je Tag und Quelle, Liste der Unbekannten, Konflikte (nur Befunde, nie Routentext)
**Parallel:** no (1 worker) — single ready task

---

## 2026-10-27 14:45 -- Modeling / Promoted: sighting-log-m7p2v - Routen-Statistik per CLI je Tag und Quelle, Liste der Unbekannten, Konflikte (nur Befunde, nie Routentext)

**Type:** Modeling / Promote
**BC:** sighting-log
**From → To:** backlog → todo

---

## 2026-10-27 14:45 -- Modeling / Refined: sighting-log-m7p2v - Routen-Statistik je Quelle, Liste der Unbekannten, Konflikte

**Type:** Modeling / Refine
**BC:** sighting-log
**Status after:** todo
**Summary:** Builder-Entscheidungen: nur Quellen-Befunde (hit/unknown/unavailable/rejected + Konflikt-Flag) persistieren, keine Flughafen-Codes von adsbdb/hexdb; Zugang per CLI npm run stats:routes ueber die SQLite-Datei, kein Endpunkt. Neue Tabelle route_lookups (Migration 0003), RouteInfo.attempts aus airspace. 12 maschinell pruefbare Kriterien inkl. Lizenz- und Schema-Test.
**ADRs written:** none

---

## 2026-10-27 14:18 -- Modeling / Captured: sighting-log-m7p2v - Routen-Statistik: je Tag und Quelle zählen, Liste der Flüge mit Route unbekannt, Konflikte zwischen Quellen

**Type:** Modeling / Capture
**BC:** sighting-log
**Filed to:** backlog
**Summary:** Routen-Statistik je Tag und Quelle, Liste der Sichtungen mit Route unbekannt, Konflikt-Protokollierung zwischen Quellen, per /api/stats/routes oder npm-Skript.

---

## 2026-10-27 14:18 -- Modeling / Captured: airspace-w3k8d - hexdb.io als zweite Routenquelle zwischen adsbdb und VRS, mit Konfliktregel bei widersprüchlichen Online-Antworten

**Type:** Modeling / Capture
**BC:** airspace
**Filed to:** backlog
**Summary:** hexdb.io als zweite Routenquelle zwischen adsbdb und VRS (Messung: schliesst ca. jede fuenfte Luecke), nie persistiert, Konfliktregel beim Refinen zu entscheiden.

---

## 2026-10-27 14:08 -- Work session ended

**Type:** Work / Session end
**Duration:** 12m
**Completed:** 1 (first-try PASS: 1, re-dispatched: 0, skipped: 0)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Lost-result re-dispatches:** 0
**Lost-result escalations:** 0
**Dispatches:** sky-scene-g3r8w: 1
**Commits:** 2
**Vision-conformance:** none — batch aligns with vision (v1 wording already amended by ADR 0017)
**Batch mix:** 100% product-facing / 0% harness / 0% bookkeeping (1 task)
**Carry-over:** left behind (user WIP, 4 files: package.json, package-lock.json, config.yaml, data/)

---

## 2026-10-27 14:08 -- Task verified and completed: sky-scene-g3r8w - Mindesthaltezeit pro Slot gegen Flackern beim Flugzeugwechsel

**Type:** Work / Task completion
**Task:** sky-scene-g3r8w - Mindesthaltezeit pro Slot gegen Flackern beim Flugzeugwechsel
**Summary:** Slots mit Mindesthaltezeit (scene.slotHoldTakte, Default 3): Halter behalten ihren Slot bis sie Radius oder Daten verlassen, Slot-Nummern tauschen nie
**Duration:** 9m
**Verification:** PASS (iteration 1)
**Files changed:** 10
**Tests added:** 24
**ADRs written:** none

---

## 2026-10-27 14:01 -- Batch started: [sky-scene-g3r8w]

**Type:** Work / Batch start
**Tasks:** sky-scene-g3r8w - Mindesthaltezeit pro Slot gegen Flackern beim Flugzeugwechsel
**Parallel:** no (1 worker) — single ready task

---

## 2026-10-27 13:58 -- Modeling / Promoted: sky-scene-g3r8w - Mindesthaltezeit pro Slot gegen Flackern beim Flugzeugwechsel

**Type:** Modeling / Promote
**BC:** sky-scene
**From → To:** backlog → todo

---

## 2026-10-27 13:58 -- Modeling / Refined: sky-scene-g3r8w - Mindesthaltezeit pro Slot gegen Flackern beim Flugzeugwechsel

**Type:** Modeling / Refine
**BC:** sky-scene
**Status after:** todo
**Summary:** Builder-Entscheidungen: reine Haltezeit ohne Hysterese (scene.slotHoldTakte, Default 3), sofortige Neubesetzung bei Verlassen des Radius, keine Slot-Tausche, Naehe bleibt reiner Bodenabstand (airspace-h9x4p deshalb dismissed). Vision v1-Satz angepasst. 12 maschinell pruefbare Kriterien inkl. E2E-Szenario slot-hold.
**ADRs written:** 0017

---

## 2026-10-27 13:58 -- Modeling / Dismissed: airspace-h9x4p

**Type:** Modeling / Dismiss
**Dismissed:**
- airspace-h9x4p - Nähe nach Sichtbarkeit gewichten statt rein horizontaler Distanz (airspace)

---

## 2026-10-27 13:47 -- Work session ended

**Type:** Work / Session end
**Duration:** 16m
**Completed:** 1 (first-try PASS: 0, re-dispatched: 1, skipped: 0)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Lost-result re-dispatches:** 0
**Lost-result escalations:** 0
**Dispatches:** airspace-r5n3k: 2
**Commits:** 2
**Vision-conformance:** none — batch aligns with vision
**Batch mix:** 100% product-facing / 0% harness / 0% bookkeeping (1 task)
**Carry-over:** left behind (user WIP, 4 files: package.json, package-lock.json, config.yaml, data/)

---

## 2026-10-27 13:47 -- Task verified and completed: airspace-r5n3k - adsbdb als erste Routenquelle vor VRS (nie persistiert, 429-Backoff) und Negativ-Cache-Fix bei nicht verfuegbaren Quellen

**Type:** Work / Task completion
**Task:** airspace-r5n3k - adsbdb als erste Routenquelle vor VRS (nie persistiert, 429-Backoff) und Negativ-Cache-Fix bei nicht verfuegbaren Quellen
**Summary:** adsbdb ist erste Routenquelle vor dem VRS-Snapshot, Treffer nie persistiert (route_source), 429-Backoff, kein Negativ-Cache bei nicht verfuegbaren Quellen
**Duration:** 14m
**Verification:** PASS (iteration 2)
**Files changed:** 17
**Tests added:** 21
**ADRs written:** none

---

## 2026-10-27 13:43 -- Verification failed: airspace-r5n3k - adsbdb als erste Routenquelle vor VRS, Nicht-Persistenz und Negativ-Cache-Fix

**Type:** Work / Verification failure
**Task:** airspace-r5n3k - adsbdb als erste Routenquelle vor VRS, Nicht-Persistenz und Negativ-Cache-Fix
**Iteration:** 1 of 3
**Reasons:** licence boundary untested on the live SkyService -> sighting-log path (repository fallback would persist unlabelled adsbdb text), 429 backoff test does not show VRS answering during the window, COALESCE leaves route/route_source inconsistent
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-27 13:36 -- Batch started: [airspace-r5n3k]

**Type:** Work / Batch start
**Tasks:** airspace-r5n3k - adsbdb als erste Routenquelle vor VRS (nie persistiert, 429-Backoff) und Negativ-Cache-Fix bei nicht verfuegbaren Quellen
**Parallel:** no (1 worker) — single ready task

---

## 2026-10-27 13:34 -- Modeling / Promoted: airspace-r5n3k - adsbdb als erste Routenquelle vor VRS (nie persistiert, 429-Backoff) und Negativ-Cache-Fix bei nicht verfuegbaren Quellen

**Type:** Modeling / Promote
**BC:** airspace
**From → To:** backlog → todo

---

## 2026-10-27 13:34 -- Modeling / Refined: airspace-r5n3k - adsbdb als erste Routenquelle vor VRS, Nicht-Persistenz und Negativ-Cache-Fix

**Type:** Modeling / Refine
**BC:** airspace
**Status after:** todo
**Summary:** Builder-Entscheidung nach Live-Stichprobe (QTR56H Doha-London statt VRS Doha-Dubai): Kette adsbdb -> VRS, Korridor-Check auf jeder Quelle, adsbdb nie in SQLite (route_source-Spalte), 429-Backoff 512/min, kein Negativ-Cache bei nicht verfuegbarer Quelle. 14 maschinell pruefbare Kriterien.
**ADRs written:** 0016

---

## 2026-10-27 13:34 -- Modeling / Captured: airspace-r5n3k - adsbdb als erste Routenquelle vor VRS (nie persistiert, 429-Backoff) und Negativ-Cache-Fix bei nicht verfuegbaren Quellen

**Type:** Modeling / Capture
**BC:** airspace
**Filed to:** backlog
**Summary:** adsbdb wird erste Routenquelle vor dem VRS-Snapshot (Live-Test: 9 falsche VRS-Routen, adsbdb alle korrekt), nie persistiert (route_source-Spalte), 429-Backoff, kein Negativ-Cache bei nicht verfuegbarer Quelle. ADR 0016.

---

## 2026-10-27 12:38 -- Work session ended

**Type:** Work / Session end
**Duration:** 52m
**Completed:** 2 (first-try PASS: 1, re-dispatched: 1, skipped: 0)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Lost-result re-dispatches:** 0
**Lost-result escalations:** 0
**Dispatches:** airspace-f7k2m: 1, airspace-m3w9c: 2
**Commits:** 3
**Vision-conformance:** none — batch aligns with vision
**Batch mix:** 100% product-facing / 0% harness / 0% bookkeeping (2 tasks)
**Carry-over:** left behind (user WIP, 4 files: package.json, package-lock.json, config.yaml, data/)

---

## 2026-10-27 12:37 -- Task verified and completed: airspace-m3w9c - VRS standing-data (CC0) als einzige Standard-RouteSource mit Offline-Snapshot, routeset entfernen

**Type:** Work / Task completion
**Task:** airspace-m3w9c - VRS standing-data (CC0) als einzige Standard-RouteSource mit Offline-Snapshot, routeset entfernen
**Summary:** VRS standing-data (CC0) Offline-Snapshot ist die einzige Standard-RouteSource (atomarer Tausch, Index im Speicher, Clock-Refresh, mehrlegige Routen); toter adsb.lol-routeset-Adapter entfernt
**Duration:** 38m
**Verification:** PASS (iteration 2)
**Files changed:** 16
**Tests added:** 17
**ADRs written:** none

---

## 2026-10-27 12:34 -- Verification failed: airspace-m3w9c - VRS standing-data (CC0) als einzige Standard-RouteSource mit Offline-Snapshot, routeset entfernen

**Type:** Work / Verification failure
**Task:** airspace-m3w9c - VRS standing-data (CC0) als einzige Standard-RouteSource mit Offline-Snapshot, routeset entfernen
**Iteration:** 1 of 3
**Reasons:** FakeClock refresh test cannot fail (direct refresh() call masks the scheduler), BC README RouteSource bullet still names routeset (missing replace op), stray parenthesis in root README
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-27 12:30 -- Task verified and completed: airspace-f7k2m - Unbekannte Typcodes und B-Emitterkategorien als light-aircraft statt narrowbody darstellen, Typtabelle ergänzen (Ikarus C42 D-MMDP)

**Type:** Work / Task completion
**Task:** airspace-f7k2m - Unbekannte Typcodes und B-Emitterkategorien als light-aircraft statt narrowbody darstellen, Typtabelle ergänzen (Ikarus C42 D-MMDP)
**Summary:** Unbekannte Flugzeuge fallen auf light-aircraft/unbekannt statt narrowbody; B1/B4 gemappt, B2/B3/B6/B7 und C* aus der Auswahl ausgeschlossen, 17 Typcodes (u. a. C42) kuratiert
**Duration:** 4m10s
**Verification:** PASS (iteration 1)
**Files changed:** 6
**Tests added:** 6
**ADRs written:** none

---

## 2026-10-27 12:26 -- Batch started: [airspace-m3w9c, airspace-f7k2m]

**Type:** Work / Batch start
**Tasks:** airspace-m3w9c - VRS standing-data (CC0) als einzige Standard-RouteSource mit Offline-Snapshot, routeset entfernen, airspace-f7k2m - Unbekannte Typcodes und B-Emitterkategorien als light-aircraft statt narrowbody darstellen, Typtabelle ergänzen (Ikarus C42 D-MMDP)
**Parallel:** yes (2 workers) — merge order m3w9c then f7k2m (both touch tests/ and README.md; otherwise disjoint source files)

---

## 2026-10-27 12:24 -- Modeling / Promoted: airspace-f7k2m - Unbekannte Typcodes und B-Emitterkategorien als light-aircraft statt narrowbody darstellen, Typtabelle ergänzen (Ikarus C42 D-MMDP)

**Type:** Modeling / Promote
**BC:** airspace
**From → To:** backlog → todo

---

## 2026-10-27 12:24 -- Modeling / Refined: airspace-f7k2m - Unbekannte Typcodes und B-Emitterkategorien als light-aircraft statt narrowbody darstellen, Typtabelle ergaenzen

**Type:** Modeling / Refine
**BC:** airspace
**Status after:** todo
**Summary:** Builder-Entscheidungen: Endfallback light-aircraft statt narrowbody, B1 -> glider, B4 -> light-aircraft, B2/B3/B6/B7/C* aus der Auswahl ausgeschlossen, 13 heute gesehene Typcodes plus CTSW/EV97/AAT3/DA62 kuratieren. 12 maschinell pruefbare Kriterien inkl. Regressionstest fuer D-MMDP.
**ADRs written:** 0015

---

## 2026-10-27 12:16 -- Modeling / Promoted: airspace-m3w9c - VRS standing-data (CC0) als einzige Standard-RouteSource mit Offline-Snapshot, routeset entfernen

**Type:** Modeling / Promote
**BC:** airspace
**From → To:** backlog → todo

---

## 2026-10-27 12:15 -- Modeling / Refined: airspace-m3w9c - VRS standing-data (CC0) als einzige Standard-RouteSource mit Offline-Snapshot, routeset entfernen

**Type:** Modeling / Refine
**BC:** airspace
**Status after:** todo
**Summary:** Live-Test belegt toten adsb.lol-routeset-Endpunkt (201, leerer Body). Builder-Entscheidungen: Offline-Snapshot der VRS standing-data (CC0, Layout verifiziert: routes/schema-01/<L>/<Airline>-all.csv bzw. -1..-9, airports/schema-01/<L>/<LL>.csv), routeset-Adapter entfernen, persistierter Cache abgespalten. 12 maschinell pruefbare Akzeptanzkriterien.
**Split into:** airspace-p2v6d
**ADRs written:** 0014

---

## 2026-10-27 12:15 -- Modeling / Captured: airspace-p2v6d - Persistierter Routen-Cache fuer Online-Quellen

**Type:** Modeling / Capture
**BC:** airspace
**Filed to:** backlog
**Summary:** Aus airspace-m3w9c abgespalten: persistierter SQLite-Routen-Cache nur fuer Online-Quellen (ADR 0007), nach ADR 0014 nicht mehr Teil des VRS-Snapshot-Tasks.

---

## 2026-10-27 12:00 -- Capture / Captured: sighting-log-k4m7q - Beobachtungsstandort je Sichtung mitloggen

**Type:** Capture
**BC:** sighting-log
**Filed to:** backlog
**Summary:** Jede Sichtung haelt den Beobachtungsstandort (place, Koordinaten) fest, damit Statistiken nach Standortwechsel trennbar bleiben

---

## 2026-10-27 11:56 -- Capture / Captured: sky-scene-g3r8w - Mindesthaltezeit pro Slot gegen Flackern beim Flugzeugwechsel

**Type:** Capture
**BC:** sky-scene
**Filed to:** backlog
**Summary:** Mindesthaltezeit von 2-3 Takten pro Slot, damit die Szene nicht jeden Takt flackert

---

## 2026-10-27 11:56 -- Capture / Captured: airspace-h9x4p - Nähe nach Sichtbarkeit gewichten statt rein horizontaler Distanz

**Type:** Capture
**BC:** airspace
**Filed to:** backlog
**Summary:** selectNearest soll Hoehe einbeziehen (Schraegdistanz oder Hoehenmalus), damit sichtbare tiefe Flieger hohe Airliner schlagen

---

## 2026-10-27 11:56 -- Capture / Captured: airspace-f7k2m - Ultraleicht und unbekannte Typcodes werden als narrowbody gezeichnet (Ikarus C42 D-MMDP)

**Type:** Capture
**BC:** airspace
**Filed to:** backlog
**Summary:** Ikarus C42 D-MMDP (B4, Typcode C42) wird mangels Tabelleneintrag und B-Kategorie-Fallback als narrowbody gezeichnet

---

## 2026-10-27 07:41 -- Task verified and completed: sky-scene-w9n4f - Szene gilt erst als veraltet, wenn der letzte erfolgreiche Abruf älter als 3 Takte (90 s) ist

**Type:** Work / Task completion
**Task:** sky-scene-w9n4f - Szene gilt erst als veraltet, wenn der letzte erfolgreiche Abruf älter als 3 Takte (90 s) ist
**Summary:** scene becomes stale only after 3 Takte without a successful fetch, one shared threshold with /healthz
**Duration:** ~15m
**Verification:** PASS (iteration 2)
**Result source:** sidecar · layout both+sentinel · sidecar present
**Files changed:** 12
**Tests added:** 7
**ADRs written:** none

---

## 2026-10-27 07:37 -- Verification failed: sky-scene-w9n4f - Stale-Schwelle 3 Takte

**Type:** Work / Verification failure
**Task:** sky-scene-w9n4f - Szene gilt erst als veraltet, wenn der letzte erfolgreiche Abruf älter als 3 Takte (90 s) ist
**Iteration:** 1 of 3
**Reasons:** /healthz half of the shared-threshold criterion untested; health.ts keeps a second default fallback
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-27 07:31 -- Batch started: [sky-scene-w9n4f]

**Type:** Work / Batch start
**Tasks:** sky-scene-w9n4f - Szene gilt erst als veraltet, wenn der letzte erfolgreiche Abruf älter als 3 Takte (90 s) ist
**Parallel:** no (1 worker) — operator-approved stale threshold change

---

## 2026-10-27 07:31 -- Modeling / Promoted: sky-scene-w9n4f - Szene gilt erst als veraltet, wenn der letzte erfolgreiche Abruf älter als 3 Takte (90 s) ist

**Type:** Modeling / Promote
**BC:** sky-scene
**From → To:** backlog → todo

---

## 2026-10-27 07:19 -- Task verified and completed: design-system-r5d7v - Veralteter Stand in der Kopfzeile statt eigenem Stale-Hinweis („Letzter Stand · HH:MM“ statt „Live · HH:MM“)

**Type:** Work / Task completion
**Task:** design-system-r5d7v - Veralteter Stand in der Kopfzeile statt eigenem Stale-Hinweis („Letzter Stand · HH:MM“ statt „Live · HH:MM“)
**Summary:** stale state shown in the header as Letzter Stand with the last good time, separate stale notice removed
**Duration:** ~6m
**Verification:** PASS (iteration 1)
**Result source:** sidecar · layout both+sentinel · sidecar present
**Files changed:** 14
**Tests added:** 1
**ADRs written:** none

---

## 2026-10-27 07:14 -- Batch started: [design-system-r5d7v]

**Type:** Work / Batch start
**Tasks:** design-system-r5d7v - Veralteter Stand in der Kopfzeile statt eigenem Stale-Hinweis („Letzter Stand · HH:MM“ statt „Live · HH:MM“)
**Parallel:** no (1 worker) — operator rejected the separate stale notice

---

## 2026-10-27 07:14 -- Modeling / Promoted: design-system-r5d7v - Veralteter Stand in der Kopfzeile statt eigenem Stale-Hinweis („Letzter Stand · HH:MM“ statt „Live · HH:MM“)

**Type:** Modeling / Promote
**BC:** design-system
**From → To:** backlog → todo

---

## 2026-10-27 01:09 -- Work session ended

**Type:** Work / Session end
**Duration:** ~2h (continued session after the 2026-10-26 23:08 session end)
**Completed:** 6 (first-try PASS: 2 — design-system-k7h2q, design-system-v8q3n; skipped: 0; re-dispatched: 4 — design-system-c4v3r (3), design-system-g7w4m (2), design-system-q7m3k (2), infrastructure-001 (2))
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Lost-result re-dispatches:** 1 (design-system-c4v3r iteration 3: malformed RESULT rewritten by the same worker)
**Lost-result escalations:** 0
**Dispatches:** design-system-c4v3r: 3, design-system-k7h2q: 1, design-system-g7w4m: 2, design-system-v8q3n: 1, design-system-q7m3k: 2, infrastructure-001: 2
**Commits:** ~45
**Vision-conformance:** none — batch aligns with vision (design-system legibility/asset fixes driven by the operator's review; walking skeleton serves 'Schnell sichtbar')
**Batch mix:** 67% product-facing / 33% harness / 0% bookkeeping (6 tasks)
**Gate:** Operator signed off the design system (design-system-001).
**Carry-over:** none — working tree clean (salvage patch .agentheim/salvage/design-system-001-merge-conflict.patch kept, gitignored)
**Next:** operator device acceptance infrastructure-d3v7k; approve Stale-Hinweis (design-system-r5d7v); backlog follow-ups infrastructure-b4k8n, infrastructure-q2w8h, airspace-m3w9c, sky-scene-t6h2p.

---

## 2026-10-27 01:08 -- Task verified and completed: infrastructure-001 - Walking skeleton — echte Flugzeuge über dem Haus erscheinen auf dem iPad, Tippen spricht eine Zeile, eine Sichtung wird gespeichert

**Type:** Work / Task completion
**Task:** infrastructure-001 - Walking skeleton — echte Flugzeuge über dem Haus erscheinen auf dem iPad, Tippen spricht eine Zeile, eine Sichtung wird gespeichert
**Summary:** walking skeleton built end to end in mock mode and E2E, device acceptance split out
**Duration:** ~25m
**Verification:** PASS (iteration 2)
**Result source:** sidecar · layout both+sentinel · sidecar present
**Files changed:** 82
**Tests added:** 142
**ADRs written:** 0013

---

## 2026-10-27 01:03 -- Verification failed: infrastructure-001 - Walking skeleton

**Type:** Work / Verification failure
**Task:** infrastructure-001 - Walking skeleton
**Iteration:** 1 of 3
**Reasons:** README_DELTA duplicates the Mock-Modus term (must be replace); three unrecorded ADR departures (sightings Auswahl-slot column, route cache in memory, storybook compose profile)
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-27 00:41 -- Batch started: [infrastructure-001]

**Type:** Work / Batch start
**Tasks:** infrastructure-001 - Walking skeleton — echte Flugzeuge über dem Haus erscheinen auf dem iPad, Tippen spricht eine Zeile, eine Sichtung wird gespeichert
**Parallel:** no (1 worker) — the last ready task; device acceptance split out into infrastructure-d3v7k

---

## 2026-10-27 00:39 -- Design-System abgenommen

**Type:** Work / Gate
**Task:** design-system-001 - Storybook-Instanz nach Atomic Design (inkl. Folgearbeiten design-system-c4v3r, design-system-k7h2q, design-system-g7w4m, design-system-v8q3n, design-system-q7m3k)
**Gate:** Der Betreiber hat das Design-System in Storybook durchgesehen und freigegeben (ADR 0002). Die [human-eye]-Kriterien der Design-System-Tasks gelten damit als erfüllt.
**Offen:** Playwright-Lauf unter WebKit auf dem Rechner des Betreibers (in der Cloud-Umgebung nur Chromium).
**Next:** infrastructure-001-walking-skeleton darf starten.

---

## 2026-10-27 00:32 -- Task verified and completed: design-system-q7m3k - Fehlende Logo-PNGs ergänzen, Logo-Beschnitt beheben und fehlende Logo-Dateien per Test verhindern

**Type:** Work / Task completion
**Task:** design-system-q7m3k - Fehlende Logo-PNGs ergänzen, Logo-Beschnitt beheben und fehlende Logo-Dateien per Test verhindern
**Summary:** add missing logo PNGs from Claude Design, fix logo clipping, guard against missing logo files
**Duration:** ~12m
**Verification:** PASS (iteration 2)
**Result source:** sidecar · layout both+sentinel · sidecar present
**Files changed:** 27
**Tests added:** 4
**ADRs written:** none

---

## 2026-10-27 00:29 -- Verification failed: design-system-q7m3k - Fehlende Logo-PNGs, Logo-Beschnitt

**Type:** Work / Verification failure
**Task:** design-system-q7m3k - Fehlende Logo-PNGs ergänzen, Logo-Beschnitt beheben und fehlende Logo-Dateien per Test verhindern
**Iteration:** 1 of 3
**Reasons:** no test for logo clipping on painted planes; logo-tail-lead fin clip (easyjet, pegasus) unsettled
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker

---

## 2026-10-27 00:23 -- Batch started: [design-system-q7m3k]

**Type:** Work / Batch start
**Tasks:** design-system-q7m3k - Fehlende Logo-PNGs ergänzen, Logo-Beschnitt beheben und fehlende Logo-Dateien per Test verhindern
**Parallel:** no (1 worker) — builder review found missing and clipped logos; PNGs fetched from Claude Design

---

## 2026-10-27 00:23 -- Modeling / Promoted: design-system-q7m3k - Fehlende Logo-PNGs ergänzen, Logo-Beschnitt beheben und fehlende Logo-Dateien per Test verhindern

**Type:** Modeling / Promote
**BC:** design-system
**From → To:** backlog → todo

---

## 2026-10-27 00:18 -- Task verified and completed: design-system-v8q3n - Schein hinter der Kopfzeile verstärken (Variante E) und Kopfzeile in Plex Mono 500

**Type:** Work / Task completion
**Task:** design-system-v8q3n - Schein hinter der Kopfzeile verstärken (Variante E) und Kopfzeile in Plex Mono 500
**Summary:** stronger three-layer header glow (variant E) and header in Plex Mono 500
**Duration:** ~5m
**Verification:** PASS (iteration 1)
**Result source:** sidecar · layout both+sentinel · sidecar present
**Files changed:** 6
**Tests added:** 1
**ADRs written:** none

---

## 2026-10-27 00:14 -- Batch started: [design-system-v8q3n]

**Type:** Work / Batch start
**Tasks:** design-system-v8q3n - Schein hinter der Kopfzeile verstärken (Variante E) und Kopfzeile in Plex Mono 500
**Parallel:** no (1 worker) — builder chose variant E after side-by-side comparison

---

## 2026-10-27 00:14 -- Modeling / Promoted: design-system-v8q3n - Schein hinter der Kopfzeile verstärken (Variante E) und Kopfzeile in Plex Mono 500

**Type:** Modeling / Promote
**BC:** design-system
**From → To:** backlog → todo

---

## 2026-10-27 00:02 -- Task verified and completed: design-system-g7w4m - Breiter weicher Schein statt dünner Kontur hinter Text auf dem Himmel (helle Schrift mit schwarzem Schein ca. 40 %)

**Type:** Work / Task completion
**Task:** design-system-g7w4m - Breiter weicher Schein statt dünner Kontur hinter Text auf dem Himmel (helle Schrift mit schwarzem Schein ca. 40 %)
**Summary:** wide soft glow replaces the thin outline behind text on the sky
**Duration:** ~12m
**Verification:** PASS (iteration 2)
**Result source:** sidecar · layout both+sentinel · sidecar present
**Files changed:** 8
**Tests added:** 2
**ADRs written:** none

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

