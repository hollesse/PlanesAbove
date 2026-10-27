---
id: airspace-k2d7f
title: adsb.fi als primäre Flugquelle; FlightSource-Kette mit Failover, Backoff nach Rate-Limit-Headern und Circuit Breaker
status: backlog
type: feature
context: airspace
created: 2026-10-27
completed:
depends_on: []
blocks: [airspace-v6m3h, airspace-b9r4w]
tags: [flightsource, adsb-fi, resilience, live-test]
related_adrs: [0001, 0005, 0011]
related_research: [flight-position-source-alternatives-2026-10-27]
prior_art: [infrastructure-001-walking-skeleton, airspace-r5n3k]
---

## Why
Am 2026-10-27 lief adsb.lol gegen sein keyless Tageslimit (gemessen: `x-ratelimit-limit: 500, 4;w=1, 60;w=60, 500;w=86400`, also 500 Requests je IP und Tag). Der 30-s-Takt braucht 2880. Ab 16:20 UTC antwortete adsb.lol nur noch mit 429, das Display stand auf "Letzter Stand". Heute gibt es genau eine Flugquelle ohne Fallback. Research flight-position-source-alternatives-2026-10-27: adsb.fi liefert keyless dasselbe readsb-Schema (gemessen, alle 13 vom Adapter genutzten Felder vorhanden), 1 Request/s, kein Tageslimit genannt.

## What
- **Adapter `adsb-fi`**: `GET https://opendata.adsb.fi/api/v3/lat/{lat}/lon/{lon}/dist/{nm}` (v2-Pfad ist deprecated), gleiche Normalisierung wie adsb.lol (`ac[]`, Felder hex, flight, t, r, category, lat, lon, alt_baro, alt_geom, gs, baro_rate, geom_rate, track), polite User-Agent. Terms: nur persönlich/nicht-kommerziell, **Quellenangabe "adsb.fi" mit Link** in README und Info-Leiste/Impressumsstelle, wo adsb.lol heute genannt wird. Besonderheit: 400/401/403/404/429 zählen bei adsb.fi zur temporären IP-Sperre, deshalb bei jedem 4xx die Quelle mindestens 60 s pausieren.
- **FlightSource-Kette** (neue Klasse, z. B. `FlightSourceChain`, implementiert `FlightSource`): Config `sources.flight.order` (Enum `adsb-fi | airplanes-live | adsb-lol`, Default `[adsb-fi, airplanes-live, adsb-lol]`; Adapter, die in diesem Task noch nicht existieren, werden beim Start mit Warnung übersprungen). Pro Takt wird die erste **verfügbare** Quelle gefragt; bei Fehler (Timeout 5 s, 5xx, 429, Netz) sofort die nächste im selben Takt. Erst wenn alle fehlschlagen, gilt der Takt als fehlgeschlagen (bestehendes Stale-Verhalten bleibt).
- **Backoff je Quelle**: bei 429 Sperre bis `Retry-After` bzw. `x-ratelimit-reset` (Sekunden), sonst Circuit Breaker: nach 3 aufeinanderfolgenden Fehlern 30 s Pause, verdoppelnd bis 5 min, mit Jitter; ein Erfolg setzt zurück. Zustand im Speicher (Neustart = frisch), Log `info` bei Wechsel der aktiven Quelle, `warn` bei Sperre.
- **Health**: `/healthz` nennt die aktive Quelle und je Quelle den Zustand (ok / backoff bis / gesperrt bis).
- **ADR-Ergänzung zu 0005**: neuer ADR (nächste Nummer) mit gemessenem adsb.lol-Limit, Kettenreihenfolge adsb.fi → airplanes.live → adsb.lol, Backoff-Regeln, Attribution; OpenSky und Eigenempfänger bewusst nicht gewählt (Betreiber-Entscheidung 2026-10-27).
- Tests offline mit aufgezeichneter adsb.fi-Fixture (eine echte Antwort vom 2026-10-27 aufzeichnen, 1 Aufruf, keyless) und konstruierten Fehlerfällen; E2E unverändert (Mock-Quelle bleibt).

## Acceptance criteria
- [ ] Contract-Test adsb.fi: aufgezeichnete Antwort wird zu `Flugzeug[]` normalisiert, identisch zum adsb.lol-Adapter bei gleichem Input; fehlende Felder (category, geom_rate) toleriert.
- [ ] Fehlerfälle adsb.fi: 400/401/403/404/429 → Quelle für ≥ 60 s gesperrt (FakeClock), 5xx/Timeout/Parse → SourceError ohne Sperre, aber Breaker-Zähler.
- [ ] Kettentest: Quelle 1 fehlschlagend, Quelle 2 liefert → Takt erfolgreich, `/api/state` nicht stale, Log nennt den Wechsel; alle Quellen fehlschlagend → Takt fehlgeschlagen, Stale-Regel wie heute.
- [ ] Backoff-Test: 429 mit `Retry-After: 120` sperrt genau 120 s; 429 mit `x-ratelimit-reset: 25203` sperrt bis dahin; 3 Fehler → 30 s, dann 60 s, 120 s, max 300 s; Erfolg setzt zurück (FakeClock).
- [ ] Reihenfolge-Test: Default-Order `[adsb-fi, airplanes-live, adsb-lol]`; nicht registrierte Adapter werden beim Start mit Warnung übersprungen; Config lehnt unbekannte Namen ab.
- [ ] `/healthz` zeigt aktive Quelle und Zustand je Quelle (Test).
- [ ] Attribution: README und die Stelle, an der heute "Data: adsb.lol" steht, nennen adsb.fi mit Link; Test prüft den Text im Client-Bundle oder in der Konfiguration, je nachdem wo die Attribution lebt.
- [ ] Mock-Modus unverändert: E2E grün; `npm run typecheck` und `npm test` grün.
- [ ] Neuer ADR vorhanden, in airspace INDEX eingetragen (Conductor), Vision/README-Formulierung "adsb.lol primär" angepasst.

## Notes
- Betreiber-Entscheidung 2026-10-27: Reihenfolge adsb.fi → airplanes.live → adsb.lol; OpenSky und eigener Empfänger nicht. airplanes.live-Adapter: airspace-v6m3h; adsb.lol-Tagesbudget: airspace-b9r4w.
- Gemessen 2026-10-27 16:5x UTC: `GET opendata.adsb.fi/api/v3/lat/50.45/lon/8.09/dist/17` → HTTP 200, `{ac,msg,now,total,ctime,ptime}`, 3 Flugzeuge, Felder wie readsb inkl. `dst`, `dir`, `seen_pos`. Kein Ratelimit-Header gesehen.
- adsb.fi README (github.com/adsbfi/opendata): 1 req/s öffentlich, "personal, non-commercial use only", "You must cite adsb.fi and include a link to our home page", 4xx zählen zur IP-Restriktion.
