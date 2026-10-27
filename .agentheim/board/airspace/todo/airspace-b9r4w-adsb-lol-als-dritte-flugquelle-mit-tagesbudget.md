---
id: airspace-b9r4w
title: adsb.lol als dritte Flugquelle mit persistiertem Tagesbudget (400 von 500 Requests) und Auswertung der Rate-Limit-Header
status: todo
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
