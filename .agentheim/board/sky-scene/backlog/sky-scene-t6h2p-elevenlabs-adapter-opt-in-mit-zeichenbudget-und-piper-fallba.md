---
id: sky-scene-t6h2p
title: ElevenLabs-Adapter (opt-in) mit Zeichenbudget und Piper-Fallback
status: backlog
type: feature
context: sky-scene
created: 2026-10-27
depends_on: [infrastructure-001-walking-skeleton]
blocks: []
tags: [speech, follow-up]
related_adrs: [0012, 0007, 0001]
related_research: []
prior_art: [infrastructure-001-walking-skeleton]
---

## Why
ADR 0012 sieht `elevenlabs` als optionalen Adapter vor. Der Skeleton akzeptiert in der Konfiguration nur `piper|fake`.

## What
- `ElevenLabsSpeechSynthesizer` hinter dem `SpeechSynthesizer`-Port; Key nur ueber `ELEVENLABS_API_KEY`; `render: lazy` als Default.
- `monthlyCharacterBudget` und `quota-exceeded` fallen auf `speech.fallback` (Default piper) zurueck und loggen eine Warnung.
- Contract-Tests mit aufgezeichneten/konstruierten Fixtures (200, 401, 429, Timeout).

## Acceptance criteria
- [ ] Ohne Key bleibt alles funktionsfaehig (Boot, Tests, Mock, E2E).
- [ ] Fehlender Key bei konfiguriertem Adapter wird beim Boot gemeldet, Fallback Piper.
- [ ] Cache-Key enthaelt Adapter und Voice.