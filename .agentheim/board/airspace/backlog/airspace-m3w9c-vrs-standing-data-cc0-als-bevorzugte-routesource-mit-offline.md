---
id: airspace-m3w9c
title: VRS standing-data (CC0) als bevorzugte RouteSource mit Offline-Snapshot
status: backlog
type: feature
context: airspace
created: 2026-10-27
depends_on: [infrastructure-001-walking-skeleton]
blocks: []
tags: [routes, follow-up]
related_adrs: [0005, 0007, 0010]
related_research: []
prior_art: [infrastructure-001-walking-skeleton]
---

## Why
ADR 0005 nennt VRS standing-data als bevorzugte Routenquelle. Im Skeleton gibt es nur den adsb.lol-routeset-Adapter; ein Live-Test lieferte HTTP 201 mit leerem Body, der Routenanteil koennte also sehr niedrig sein. Die Pfade unter raw.githubusercontent.com liessen sich in der Cloud nicht erraten (`routes/schema-01/<XX>/<CALLSIGN>.csv` ergab 404): das reale Layout muss zuerst geprueft werden.

## What
- `RouteSource`-Adapter, der einen periodisch aktualisierten Snapshot in `dataDir` liest (Kette: VRS zuerst, dann routeset).
- Aufgezeichnete Fixture der echten CSV-/Datei-Struktur, Contract-Tests inkl. fehlender Felder.
- Quellenangabe (CC0, Herkunft) im README.
- Persistierter Routen-Cache (ADR 0007: Tabelle in derselben SQLite-Datei mit `fetched_at`/`expires_at`, positiv Stunden, negativ kuerzer); der Skeleton haelt den Cache nur im Speicher. Nur lizenzseitig erlaubte Quellen (VRS CC0) persistieren, adsbdb nie.

## Acceptance criteria
- [ ] Layout der VRS-Daten verifiziert und als Fixture eingecheckt.
- [ ] Contract-Tests gruen (bekannte Route, unbekanntes Callsign, kaputte Zeile).
- [ ] Konfigurierbare Reihenfolge `sources.route.order`.
- [ ] Routen-Cache ueberlebt einen Neustart (Test), adsbdb-Ergebnisse werden nie geschrieben.
## Notes
Befund aus dem Live-Test am 2026-10-27 (Oberweyer, echter Betrieb, 176 Sichtungen, 0 mit Route):
- `POST https://api.adsb.lol/api/0/routeset` antwortet aktuell fuer **jeden** Callsign mit HTTP 201 und leerem Body, auch fuer bekannte (DLH400, RYR6ZM). Request entspricht OpenAPI (`{"planes":[{"callsign","lat","lng"}]}`) und dem Quellcode (`api_routes.py`), der eine JSON-Liste liefern muesste. Der Endpunkt ist serverseitig tot; der Adapter wertet das korrekt als Route unbekannt, loggt aber nichts. Nicht erneut dagegen bauen.
- Der deprecated `GET /api/0/route/{callsign}` leitet per 302 auf einen **statischen VRS-Spiegel von adsb.lol** um, der funktioniert: `https://vrs-standing-data.adsb.lol/routes/<erste zwei Zeichen des Callsigns>/<CALLSIGN>.json`. Beispiele: `routes/RY/RYR6ZM.json` -> LEAL-EGBB (Alicante -> Birmingham), `routes/DL/DLH400.json` -> EDDF-KJFK. Felder: `callsign`, `number`, `airline_code`, `airport_codes` (ICAO, mit `-`), `_airport_codes_iata`, `_airports[]` (name, icao, iata, lat, lon, ...). Unbekannte Callsigns liefern 404 mit HTML-Body (EWG9UX, LOT1RF, CFG068 am Testtag).
- Das ist dieselbe Datenbasis (VRS standing-data, CC0) wie der Offline-Snapshot; der Spiegel taugt als Online-Fallback oder als Quelle fuer Fixtures, ersetzt den Snapshot aber nicht (Lücken bei Charter-/Nicht-Linien-Callsigns sind zu erwarten).
- Zusatz fuer diese Task oder einen eigenen Chore: leere/unerwartete Antworten der Routenquelle als `warn` loggen, damit ein toter Endpunkt nicht wochenlang unsichtbar bleibt.
