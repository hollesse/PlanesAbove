---
id: airspace-b9r4w
title: adsb.lol als dritte Flugquelle mit persistiertem Tagesbudget (400 von 500 Requests) und Auswertung der Rate-Limit-Header
status: done
type: feature
context: airspace
created: 2026-10-27
completed:
depends_on: [airspace-k2d7f]
blocks: []
tags: [flightsource, adsb-lol, budget, resilience]
related_adrs: [0005]
related_research: [flight-position-source-alternatives-2026-10-27]
prior_art: [airspace-f4q9z]
---

## Why
adsb.lol begrenzt keyless auf 500 Requests je IP und Tag (gemessen 2026-10-27: `x-ratelimit-limit: 500, 4;w=1, 60;w=60, 500;w=86400`, `x-ratelimit-remaining`, `x-ratelimit-reset` in Sekunden). Als dritte Stufe darf adsb.lol das Kontingent nicht an einem Vormittag verbrauchen, sonst fehlt es als Reserve, wenn adsb.fi und airplanes.live gleichzeitig ausfallen.

## What
- Bestehenden adsb.lol-Adapter in die Kette einordnen (Stufe 3) und mit **Tagesbudget** versehen: Config `sources.flight.adsbLol.dailyRequestCap` (Default 400), Zähler persistiert in SQLite (eigene kleine Tabelle oder Wiederverwendung des Musters aus `flightaware_calls`), Tageswechsel UTC. Bei erreichtem Budget gilt die Quelle als gesperrt bis zum Tageswechsel.
- Rate-Limit-Header auswerten: `x-ratelimit-remaining` übernimmt die Rolle des Zählers, wenn vorhanden (der höhere Verbrauch gewinnt); `x-ratelimit-reset` setzt die Sperrdauer bei 429 (Kettenvertrag aus k2d7f).
- Budgetstand in `/healthz` je Quelle sichtbar (verbraucht/limit).
- Attribution bleibt "Data: adsb.lol (ODbL 1.0)".

## Acceptance criteria
- [ ] Budgettest (FakeClock, file-backed DB): nach 400 erfolgreichen Aufrufen am Tag keine weiteren bis zum UTC-Tageswechsel; Zähler überlebt Neustart; Reset um 00:00 UTC.
- [ ] Header-Test: Antwort mit `x-ratelimit-remaining: 3` setzt den Restwert auf 3, auch wenn der lokale Zähler mehr Reserve annimmt; 429 mit `x-ratelimit-reset: N` sperrt genau N Sekunden.
- [ ] Kettentest: adsb.lol wird nur gefragt, wenn Stufe 1 und 2 im selben Takt fehlschlagen; bei erschöpftem Budget wird es übersprungen.
- [ ] `/healthz` zeigt Budgetstand (Test).
- [ ] `npm run typecheck` und `npm test` grün.

## Notes
- Betreiber-Entscheidung 2026-10-27: Stufe 3 der Kette, OpenSky bewusst nicht. Gemessen 16:4x UTC: 429 mit `x-envoy-ratelimited: true`, `x-ratelimit-remaining: 0`, `x-ratelimit-reset: 25203`. adsb.lol-README: "Rate limits are dynamic", Feeder-Key nur angekündigt.

## Merge-conflict note (iteration 2)

## Merge-conflict note — resolve, same task, same worktree, new base

Task: airspace-b9r4w. Your worktree's branch was merged with the updated `main` (sibling task
airspace-v6m3h — airplanes.live als zweite Flugquelle registriert (Adapter adapters/airplanes-live.ts, eine Registrierungszeile in app.ts, README/config.example Attribution)) and a real conflict surfaced on the allow-list below. New
base: f10600d6.

**Orientation.** Inside the conflict markers, `<<<<<<< HEAD` is *your own* work; the block
after `=======` down to `>>>>>>> main` is the sibling's work, already integrated into
`main`.

**Authority.** You may not undo or weaken the sibling's change — it is already accepted. You
re-express your own intent on top of it. Both intents must survive in the resolved file.

**Scope — resolve only these paths** (the resolution allow-list), plus any test that must
change to keep both intents green:
- README.md
- config.example.yaml
- src/server/app.ts

**Sibling's change to these paths, scoped to the allow-list above:**
commit f10600d6c1671d81d487a87675c0441087e3ec53
Author: Joshua Töpfer <joshua.toepfer@innoq.com>
Date:   Tue Oct 27 18:26:27 2026 +0100

    feature(airspace): airplanes.live als zweite Flugquelle registriert; Live-Test zeigt feeder-only (403), Adapter pausiert 1 h, Kette faellt im selben Takt auf adsb.lol durch [airspace-v6m3h]

 README.md           | 4 ++--
 config.example.yaml | 2 +-
 src/server/app.ts   | 4 ++--
 3 files changed, 5 insertions(+), 5 deletions(-)


Remove every conflict marker. Run the suite. Return the ordinary strict `RESULT:` block with
the resolved files in FILE_LIST — you edit files only; the conductor stages and commits, as
always.
## Outcome

adsb.lol hat ein persistiertes Tagesbudget. `DailyRequestBudget` (`src/server/modules/airspace/flight-source-budget.ts`) zaehlt Requests je UTC-Tag in der neuen Tabelle `flight_source_calls` (Migration `0005-flight-source-calls.ts`), liest den Stand beim Start und ruft bei Erschoepfung ueber `onExhausted` `chain.blockFor('adsb-lol', msBisMitternacht, 'blocked')`. `AdsbLolFlightSource` zaehlt jede Anfrage (auch fehlgeschlagene) und uebernimmt einen niedrigeren `x-ratelimit-remaining`; der 429-Reset laeuft ueber `retryAfterMs` unveraendert exakt durch. Config `sources.flight.adsbLol.dailyRequestCap` (Default 400, positive Ganzzahl). `/healthz` ergaenzt `budget` im adsb-lol-Eintrag. Kleine Chain-Aenderung: ein Erfolg loescht `blockedUntil` nicht mehr (sonst haette der Erfolg der Cap-erreichenden Anfrage die Sperre ueberschrieben). app.ts: nur Budget-Verdrahtung. Tests: `tests/unit/server/flight-source-budget.test.ts` (FakeClock, dateibasierte DB, Restart, Header, 429, Chain, /healthz, Config). Hinweis: `x-ratelimit-remaining` bezieht sich auf das echte Limit 500, wird aber wie spezifiziert direkt mit der lokalen Restmenge (Cap - used) verglichen. Header einer 429-Antwort sind nur ueber `retryAfterMs` sichtbar (guardedFetch wirft vorher).

Iteration 2: `FlightSourceChain.recordFailure` verkuerzt eine bestehende Sperre nie (`extend()` = max); die Cap-erreichende fehlgeschlagene Anfrage (429 mit kurzem Reset oder Breaker) laesst adsb-lol bis 00:00 UTC gesperrt. Kettentests mit drei Stufen ergaenzt, Filler-Assertions entfernt.

Merge-Aufloesung (Konflikt-Leiter ADR-0072, Sprosse 4-6): Konflikte mit airspace-v6m3h in README.md, config.example.yaml und src/server/app.ts aufgeloest; beide Intents erhalten (drei Adapter registriert, adsb-lol mit Budget); Re-Verify PASS, 368 Tests gruen.
