---
id: airspace-rrazj
title: Lokale Vereinsflieger per Hex-Code erfassen und den Verein statt der Airline anzeigen
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
Vereinsflugzeuge aus der Nachbarschaft tauchen regelmäßig über dem Haus auf, haben aber keine Airline und keine echte Route. Für sie wäre der Verein die interessante Information. Beispiel: D-EBEC (Hex 3d07b6, Diamond DV20) gehört zur Sportfluggruppe Elz, die einen eigenen Flugplatz bei Limburg hat und normalerweise dort startet und landet.

## What
Eine eigene kuratierte Tabelle (Hex-Code → Verein, Heimatplatz) für lokale Vereinsflieger. Steht ein Flugzeug darin, wird anstelle der Airline der Verein angezeigt, z. B. „Sportfluggruppe Elz“ für D-EBEC.

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `quick-capture` on 2026-10-30 — raw, unrefined. Needs a `modeling` refine pass before
it can be promoted. Erster Eintrag: 3d07b6 / D-EBEC / DV20 → Sportfluggruppe Elz, Flugplatz Elz. Offen: ob der Heimatplatz auch in der Sprachansage genannt wird und ob die Tabelle wie `airlines.json` unter tables/ liegt. Schwestertask: airspace-fehby (keine Route für Registrierungs-Callsigns).
