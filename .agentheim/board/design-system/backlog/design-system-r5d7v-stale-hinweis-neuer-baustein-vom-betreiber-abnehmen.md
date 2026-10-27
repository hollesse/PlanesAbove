---
id: design-system-r5d7v
title: Stale-Hinweis (neuer Baustein) vom Betreiber abnehmen
status: backlog
type: chore
context: design-system
created: 2026-10-27
depends_on: [infrastructure-001-walking-skeleton]
blocks: []
tags: [design-system, approval]
related_adrs: [0002, 0008]
related_research: []
prior_art: [design-system-001]
---

## Why
Der Walking Skeleton braucht eine dezente Stale-Markierung (ADR 0008). Nach ADR 0002 entstand sie zuerst als Story (Atoms/Stale-Hinweis: Stale-Hinweis-Atom, Story "Keine aktuellen Daten · Stand HH:MM" und "Hinweis auf hellem Himmel-Ton"; optionale `stale`-Eigenschaft der Screen-Vorlage). Sie ist noch nicht vom Betreiber abgenommen.

## What
Betreiber prueft Position (unter der Kopfzeile rechts), Wortlaut, Groesse und Tinte in Storybook; Anpassungen als Fixes.

## Acceptance criteria
- [ ] [human-eye] Story im Storybook geprueft und abgenommen oder Aenderungswuensche erfasst.