---
id: sky-scene-xczgm
title: Decide German speech output: server-rendered Piper audio played via audio element, Web Speech as fallback
status: todo
type: decision
context: sky-scene
created: 2026-10-26
completed:
depends_on: []
blocks: [infrastructure-001-walking-skeleton]
tags: [foundation, tts, narration]
related_adrs: [0001]
related_research: []
prior_art: []
---

## Why
Mona taps a plane and hears a German Steckbrief; the old tablet's TTS voices and `speechSynthesis` support are unknown, and the Vorlese-Sperre needs a reliable end-of-speech signal.

## What
Record the architecture decision as an ADR (scope: `sky-scene`), based on the architect's draft below (or the builder's amended version).

## Acceptance criteria
- [ ] ADR committed under `.agentheim/knowledge/decisions/`, status `accepted`, scope `sky-scene`.
- [ ] Justification matches the architect's draft (or the user-amended version); deviations are named in the ADR.
- [ ] The walking skeleton's finding on the real tablet (server audio and `speechSynthesis`) is reflected in the ADR.
- [ ] No code change required.

## Notes
**Load-bearing for walking skeleton:** yes


### Architect's ADR draft

---
id: TBD
title: Server-rendered German speech (Piper) played as audio; Web Speech as fallback
scope: sky-scene
status: proposed
date: 2026-10-26
---

## Context
The device is an old tablet whose installed TTS voices and `speechSynthesis` support vary by OS/WebView (old Android WebViews often lack it or a German voice; iOS has gesture/cut-off quirks). The Vorlese-Sperre needs a reliable "finished" signal. Free and offline required.

## Decision
- The service composes the German Steckbrief and synthesises it with Piper (open-source, offline, German voice, e.g. Thorsten). Audio cached by text hash and pre-rendered when a selection is committed.
- Client plays it via `<audio>` on tap (user gesture satisfies autoplay policy). Vorlese-Sperre starts on play, ends on `ended`, with a watchdog (e.g. 60 s).
- A client `Narrator` port allows a `speechSynthesis` fallback; the spike checks its viability on the real tablet.
- Text uses short sentences, spelled-out numbers/units and an aviation pronunciation dictionary ("A380" → "A dreihundertachtzig").

## Consequences
### Positive
- Same voice on any tablet; offline; reliable end signal; voice improvable centrally.
### Negative
- Home server needs Piper binary + voice model (small on a Pi 4-class machine).
- Synthetic voice is less child-warm than a human one.
### Neutral
- Audio cache needs pruning by age.

## Alternatives considered
- **Web Speech API only** — zero infrastructure, but uncertain on old devices, unreliable `onend`.
- **Cloud TTS (Google/Azure)** — keys, billing, contracts; violates ADR 0001.
- **Fully Kiosk native TTS bridge** — Android-only, couples client to one kiosk app.
- **Pre-recorded human voice** — not feasible for composed sentences.
