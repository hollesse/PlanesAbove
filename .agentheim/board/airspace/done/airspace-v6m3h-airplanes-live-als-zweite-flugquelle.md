---
id: airspace-v6m3h
title: airplanes.live als zweite Flugquelle in der FlightSource-Kette
status: done
type: feature
context: airspace
created: 2026-10-27
completed:
depends_on: [airspace-k2d7f]
blocks: []
tags: [flightsource, airplanes-live, resilience]
related_adrs: [0005]
related_research: [flight-position-source-alternatives-2026-10-27]
prior_art: []
---

## Why
Eine Primärquelle allein reicht nicht (adsb.lol fiel am 2026-10-27 durch sein Tageslimit aus). airplanes.live bietet laut offiziellem API-Guide `api.airplanes.live/v2/point/{lat}/{lon}/{nm}` (bis 250 nm), 1 Request/s, nicht-kommerziell, kein SLA, derzeit ohne Feeder-Pflicht ("might change"). Die Research vom 2026-10-26 hatte airplanes.live noch als feeder-only (403) eingestuft; heute antwortet `api.airplanes.live/v2/callsign/…` mit 403, der `point`-Endpunkt ist noch nicht geprüft.

## What
- Adapter `airplanes-live` mit demselben readsb-Schema und derselben Normalisierung wie adsb.fi/adsb.lol; polite User-Agent; Rate 1 req/s wird vom 30-s-Takt nie erreicht.
- **Vorab-Verifikation** (1 keyless Aufruf, vom Betreiber freigegeben): liefert `point` ohne Feeder-Status HTTP 200? Wenn 403, bleibt der Adapter registriert, wird aber per Circuit Breaker dauerhaft übersprungen und der Task endet mit Befund "feeder-only" im Outcome.
- Einordnung in die Kette als Stufe 2 (Default-Order aus airspace-k2d7f); Attribution "airplanes.live" neben adsb.fi.
- Tests offline mit aufgezeichneter Fixture (falls 200) bzw. konstruierter 403-Fixture.

## Acceptance criteria
- [ ] Contract-Test gegen aufgezeichnete `point`-Antwort (oder konstruierte 403-Antwort, dann: Adapter meldet unavailable und die Kette geht weiter).
- [ ] Kettentest: adsb.fi gesperrt → airplanes.live liefert im selben Takt; beide gesperrt → adsb.lol.
- [ ] Fehlerfälle 429/5xx/Timeout/Parse wie im Kettenvertrag (Backoff/Breaker aus k2d7f greifen).
- [ ] Attribution in README und an der Attributionsstelle ergänzt.
- [ ] `npm run typecheck` und `npm test` grün.

## Notes
- Betreiber-Entscheidung 2026-10-27: Stufe 2 der Kette. Research: flight-position-source-alternatives-2026-10-27 (airplanes.live-Angaben nur aus Suchsynopse, Seite selbst 403 — deshalb Vorab-Verifikation).

## Verifier note (iteration 1)
**REASONS:**
- Criterion 2 only half covered: "beide gesperrt → adsb.lol" is tested (flight-chain-wiring: adsb.fi 429 + airplanes.live 403 → active adsb-lol), but no test covers "adsb.fi gesperrt → airplanes.live liefert 200 im selben Takt". The contract chain test uses only [airplanes-live, adsb-lol] with airplanes.live always 403; the generic chain test does not use the adapter. The 200 path can reuse tests/fixtures/adsbfi-v3-point-oberweyer.json.
- Not checked further (stopped at first failure); read-through looked fine: 403 → unavailable with 1 h retryAfterMs asserted, one call across three Takte, one warning, wiring test asserts no skip warning and three sources in /healthz, attribution present. The FakeClock test covers only 60 s, not the end of the 1 h pause.

**SUGGESTED_FIX:** Add a chain test in flight-chain-wiring.test.ts (real composition root): adsb.fi 429, airplanes.live 200 with the readsb fixture, adsb.lol never requested; assert flight.active === 'airplanes-live', scene not stale, no adsb.lol URL fetched. Optionally extend the FakeClock test past 1 h to show the pause ends. Then run typecheck and tests.

**ITERATION_HINT:** likely-fixable

## Outcome

airplanes.live wurde als zweite Quelle der FlightSourceChain (adsb.fi, airplanes.live, adsb.lol) angebunden: Adapter `src/server/modules/airspace/adapters/airplanes-live.ts`, Verdrahtung in `src/server/app.ts`, Config-Beispiel und README angepasst. Vertragstests in `tests/unit/server/airplanes-live.contract.test.ts`, Kettentests in `tests/unit/server/flight-chain-wiring.test.ts`.

Gemessener Befund (2026-10-27): `GET https://api.airplanes.live/v2/point/50.45/8.09/17` liefert ohne Key HTTP 403 (application/json); der Point-Endpunkt ist feeder-only. Die echte Fehlerantwort liegt als Fixture in `tests/fixtures/airplaneslive-error-403.json`. Der Adapter behandelt 403 als Quellenausfall, pausiert 1 h, und die Kette fällt im selben Takt auf adsb.lol durch. Beide Kettenpfade sind im echten Composition Root getestet: adsb.fi 429 + airplanes.live 403 -> adsb.lol, sowie adsb.fi 429 + airplanes.live 200 (readsb-Fixture) -> airplanes.live aktiv, Szene nicht stale, adsb.lol nie angefragt. Empfehlung: gelegentlich neu prüfen, ob airplanes.live den Zugriff für Nicht-Feeder öffnet.

npm test: 358 passed; npm run typecheck sauber.
