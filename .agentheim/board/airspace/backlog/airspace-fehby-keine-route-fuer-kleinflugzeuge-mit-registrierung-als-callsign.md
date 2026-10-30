---
id: airspace-fehby
title: Keine Route für Kleinflugzeuge, deren Callsign die Registrierung ist (D-Exxx u. ä.)
status: backlog
type: feature
context: airspace
created: 2026-10-30
completed:
depends_on: []
blocks: []
tags: [captured]
related_adrs: []
related_research: []
prior_art: []
---

## Why
Für Kleinflugzeuge, die als Callsign nur ihre Registrierung senden, liefert adsbdb manchmal eine alte, zufällige Route aus einem früheren Flug. Beispiel DEBEC (D-EBEC, DV20): adsbdb sagt Gelnhausen → Limburg an der Lahn, tatsächlich fliegt die Maschine Platzrunden und Rundflüge ab Flugplatz Elz. Die Plausibilitätsprüfung nimmt die Route an, weil der Flieger beim Anflug zufällig auf der Linie liegt.

## What
Flugzeuge, deren Callsign dem Muster einer Registrierung folgt (D-Exxx, D-Mxxx und vergleichbare Kennzeichen-Muster), bekommen keine Route aus adsbdb, hexdb oder VRS, sondern den regulären Zustand „Route unbekannt“.

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `quick-capture` on 2026-10-30 — raw, unrefined. Needs a `modeling` refine pass before
it can be promoted. Offene Punkte für die Refinement-Runde: Welche Registrierungs-Muster zählen (nur deutsche D-Exxx/D-Mxxx oder generisch), ob die Regel an die Typklasse light-aircraft gekoppelt wird, und ob statt „Route unbekannt“ ein eigener Text wie „Rundflug“ sinnvoll ist. Schwestertask: airspace-rrazj (Vereinsflieger-Tabelle).
