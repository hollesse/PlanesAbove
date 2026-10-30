---
id: sky-scene-q7m3w
title: /healthz meldet Zustand der Sprachausgabe (Budget, letzter Fehler)
status: backlog
type: feature
context: sky-scene
created: 2026-10-30
depends_on: [sky-scene-t6h2p]
blocks: []
tags: [speech, health, follow-up]
related_adrs: [0012, 0011]
---

## Why
Am 30.10.2026 war der Piper-Sidecar im Default-Bridge-Netz unerreichbar und nichts zeigte es an. Mit ElevenLabs-Budget und stillem Fallback ist ein sichtbarer Zustand der Sprachausgabe noch wichtiger (Budget leer, Key abgelehnt).

## What
`/healthz` meldet die Sprachausgabe: letzter Synthese-Fehler (errorClass, Zeitpunkt), aktiver Adapter, `charactersUsedThisMonth` und Budget; wiederholte Fehler setzen `degraded`. Details beim Refinement.

## Acceptance criteria
- [ ] Noch zu verfeinern.