---
id: airspace-c5t9m
title: airplanes.live aus der FlightSource-Kette entfernen (feeder-only, Betreiber will keinen Feeder betreiben)
status: doing
type: chore
context: airspace
created: 2026-10-27
completed:
depends_on: [airspace-b9r4w]
blocks: []
tags: [flightsource, cleanup]
related_adrs: [0019]
related_research: [flight-position-source-alternatives-2026-10-27]
prior_art: [airspace-v6m3h]
---

## Why
airplanes.live beantwortet `point` für Nicht-Feeder mit 403 (gemessen 2026-10-27). Der Betreiber betreibt keinen eigenen Empfänger, der Adapter bleibt dauerhaft wirkungslos und kostet pro Stunde einen vergeblichen Aufruf plus eine Warnung im Log.

## What
- Adapter `adapters/airplanes-live.ts`, Fixture `tests/fixtures/airplaneslive-error-403.*`, Contract-Test und Registrierung in `app.ts`/`flight-source-names.ts` entfernen; `sources.flight.order` Enum auf `adsb-fi | adsb-lol`, Default `[adsb-fi, adsb-lol]`.
- README, config.example.yaml und Attribution bereinigen; ADR 0019 per kurzem Nachtrag (Amendment-Abschnitt, keine neue Nummer nötig) auf die Zweier-Kette anpassen und den Grund festhalten.
- Kettentests (flight-chain-wiring, flight-source-budget) auf zwei Stufen umstellen.

## Acceptance criteria
- [ ] `grep -ri "airplanes" src tests config.example.yaml README.md` ist leer (bis auf den ADR-Nachtrag unter .agentheim, den der Conductor schreibt).
- [ ] Config lehnt `airplanes-live` in `order` ab; Default-Order ist `[adsb-fi, adsb-lol]`.
- [ ] Kettentests: adsb.fi fällt aus → adsb.lol im selben Takt; Budget-Tests unverändert grün.
- [ ] `/healthz` listet genau zwei Quellen.
- [ ] `npm run typecheck`, `npm test` und `npm run e2e:chromium` grün.

## Notes
Betreiber-Entscheidung 2026-10-27: "airplanes live kann dann raus, Feeder bringt mir nichts." Ersetzt die Stufe 2 aus ADR 0019 ersatzlos.
