---
id: infrastructure-q2w8h
title: Test sichert ab, dass die Mock-Endpunkte im Live-Modus nicht erreichbar sind
status: doing
type: chore
context: infrastructure
created: 2026-10-27
completed:
depends_on: [infrastructure-001]
blocks: []
tags: [security, tests, follow-up]
related_adrs: [0013]
related_research: []
prior_art: [infrastructure-001]
---

## Why
ADR 0013 begründet, dass `POST /mock/advance` und `GET /mock/sightings` keine Angriffsfläche sind, weil sie nur im Mock-Modus registriert werden. Der Code prüft das (`src/server/app.ts`, `if (mock && url.pathname.startsWith('/mock/'))`), aber kein Test sichert es ab (Hinweis des Verifiers bei infrastructure-001). Ohne Test könnte ein späterer Umbau der Routing-Kette die Bedingung still verlieren.

## What
Ein Unit-Test (Vitest, `tests/unit/server/mock-endpoints-live.test.ts`) startet den Dienst per `startService` im Modus `live` (Default von `mode`), mit `speech: { adapter: fake }`, `sources: { route: { enabled: false } }` und einem injizierten `fetch`, der jede Anfrage ablehnt — kein Netz, kein echter Adapter. Vorbild: `boot()` in `tests/unit/server/flight-chain-wiring.test.ts`.

Der Test ruft beide Mock-Pfade auf und prüft, dass keiner von der Mock-Logik bedient wird:
- `GET /mock/sightings` fällt in den statischen Fallback → **404**, Body `not found`, kein JSON-Array.
- `POST /mock/advance` mit `{"seconds": 3600}` → **405** (Nicht-GET-Anfragen ohne Route enden in `res.writeHead(405)`), kein JSON `{ now }`.
- Nebenwirkungsfreiheit: `GET /api/state` vor und nach dem POST liefert dieselbe Antwort (gleiches JSON); im Live-Modus gibt es keine FakeClock, die vorrücken könnte.

Zur Gegenprobe gehört, dass derselbe Test im `mock`-Modus (kurzes Szenario, Vorbild `tests/unit/server/staleness-wiring.test.ts`) 200 für beide Pfade sieht — damit der Test wirklich die Modus-Bedingung misst und nicht ein Tippfehler im Pfad.

Befund aus dem Refinement: ADR 0013 sagt "404 via static fallback" für beide Pfade; für den POST stimmt das nicht (405). Die Absicht — Pfade sind außerhalb von `mock` nicht erreichbar — gilt trotzdem. Der Worker ergänzt in ADR 0013 einen kurzen Amendment-Satz (GET → 404, POST → 405, beides ohne Mock-Wirkung); keine neue ADR.

## Acceptance criteria
- [ ] Neuer Vitest-Test unter `tests/unit/server/` bootet den Dienst mit `mode: live` ohne Netzzugriff (injizierter `fetch`, der ablehnt) und wird von `npm test` ausgeführt.
- [ ] Im `live`-Modus: `GET /mock/sightings` → Status 404; `POST /mock/advance` → Status 405; keine der beiden Antworten ist das JSON, das die Mock-Handler liefern.
- [ ] Im `live`-Modus ist `GET /api/state` vor und nach `POST /mock/advance {"seconds": 3600}` identisch (keine Nebenwirkung).
- [ ] Gegenprobe im selben Test: mit `mode: mock` antworten beide Pfade mit 200.
- [ ] Der Test schlägt fehl, wenn die Bedingung `mock &&` in `src/server/app.ts` entfernt wird (vom Worker einmal manuell durch Entfernen der Bedingung geprüft und im Outcome vermerkt).
- [ ] ADR 0013 trägt einen Amendment-Satz, der 404 (GET) und 405 (POST) im Live-Modus benennt.

## Notes
- Der Service nutzt `port: 0`; die URL kommt aus `svc.port`. `afterEach` muss `svc.stop()` aufrufen und das Temp-Verzeichnis löschen (siehe bestehende Wiring-Tests).
- Im Live-Modus läuft beim Start sofort ein erster Takt (`sky.tick()`), der den injizierten `fetch` trifft; ein ablehnender `fetch` führt nur zu einem stale-markierten Zustand, nicht zu einem Boot-Fehler (ADR 0011, Stale-but-serving).
- Kein E2E nötig: Playwright-Specs starten den Dienst ohnehin nur im Mock-Modus; der Unit-Test gegen `startService` deckt die Komposition ab.
