---
id: airspace-v6m3h
title: airplanes.live als zweite Flugquelle in der FlightSource-Kette
status: backlog
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
