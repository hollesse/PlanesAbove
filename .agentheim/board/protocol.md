# Protocol

Chronological log of everything that happens in this project.
Newest entries on top.

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

