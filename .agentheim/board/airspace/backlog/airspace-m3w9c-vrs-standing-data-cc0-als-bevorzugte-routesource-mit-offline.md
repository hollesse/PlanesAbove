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