---
id: airspace-p2v6d
title: Persistierter Routen-Cache fuer Online-Quellen
status: backlog
type: feature
context: airspace
created: 2026-10-27
depends_on: [airspace-m3w9c]
blocks: []
tags: [routes, cache, follow-up]
related_adrs: [0005, 0007]
related_research: []
prior_art: [airspace-m3w9c]
---

## Why
ADR 0007 sieht einen persistierten Routen-Cache (Tabelle in derselben SQLite-Datei) vor. Mit dem lokalen VRS-Snapshot (airspace-m3w9c, ADR 0014) braucht die Standardquelle keinen Cache; er lohnt nur fuer Online-Quellen.

## What
- Persistierter Routen-Cache in SQLite mit `fetched_at`/`expires_at`, positive Treffer Stunden, negative kuerzer (ADR 0007).
- Nur lizenzseitig erlaubte Quellen persistieren; adsbdb-Ergebnisse nie (ADR 0005).

## Acceptance criteria
To be defined during refinement.

## Notes
Split from airspace-m3w9c on 2026-10-27.
