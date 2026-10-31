---
id: infrastructure-cc9gq
title: Entscheidung: Sichtungen je Airline × Typklasse und Referenzfotos über zwei lesende Endpunkte des Heimservers
status: todo
type: decision
context: infrastructure
created: 2026-10-31
completed:
depends_on: []
blocks: []
tags: [decision, foundation, read-endpoints]
related_adrs: [0031]
related_research: []
prior_art: []
---

## Why
Der Lücken-Filter des Editors braucht Sichtungen je Airline × Typklasse; die heutige Lackierungs-Statistik kennt nur die Airline, und `livery_present` ist zum Sichtungszeitpunkt eingefroren und veraltet. Das Referenzfoto braucht einen Weg zu vergangenen Sichtungen; `/api/photos/:icao24` antwortet nur für die aktuelle Auswahl. Betrifft sighting-log und airspace gemeinsam, darum global.

## What
ADR schreiben (Vorschlag: 0034, scope global) nach dem Architekten-Entwurf in den Notes. Die Umsetzung sind spätere Feature-Tasks in sighting-log und airspace.

## Acceptance criteria
- [ ] ADR committed unter `.agentheim/knowledge/decisions/`, Begründung entspricht dem Architekten-Entwurf in den Notes (oder der vom Betreiber geänderten Fassung); in die INDEX eingetragen.
- [ ] Keine Code-Änderung in diesem Task.
- [ ] Der Betreiber hat den Entwurf gelesen und die offenen Punkte in den Notes beantwortet oder bewusst offen gelassen. [human-eye]

## Notes
**Architekten-Entwurf (2026-10-31):**
- sighting-log: `GET /api/stats/sightings-by-class?days=&standort=` liefert `{prefix, airline, typklasse, count, lastSeenMs, samples≤3}`, unabhängig von `livery_present`.
- airspace: `GET /api/photos/reference?icao24=&registration=` akzeptiert nur Hexes, die in `sightings` vorkommen (kein offener Proxy). Bilder lädt der Browser direkt (ADR 0029), mit Attribution und klickbarem Link.
- Der Editor rechnet Lücken selbst: gesehene Kombinationen minus lokal vorhandene Dateien. Unbekannte Präfixe erscheinen als „Airline fehlt im Katalog“. Schwelle für „gesehen“ bleibt ein UI-Parameter (Default 90 Tage, ≥1).
- Der Editor erreicht den Server nur über Vites `server.proxy` auf `PLANESABOVE_HOME_URL`; keine CORS-Änderung, Server bleibt nur-lesend.
- Verworfen: `/api/stats/liveries` erweitern, Editor ruft Commons/Planespotters direkt, SQLite-Datei auf den Mac kopieren.
- Reale config.yaml anpassen: nein.
