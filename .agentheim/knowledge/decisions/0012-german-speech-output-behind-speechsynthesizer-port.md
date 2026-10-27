---
id: 0012
title: German speech output behind a swappable server-side SpeechSynthesizer port (Piper default, ElevenLabs opt-in), played as audio on the iPad
scope: sky-scene
status: accepted
date: 2026-10-26
supersedes: []
superseded_by: []
related_tasks: [sky-scene-xczgm, infrastructure-001-walking-skeleton]
related_research: [free-flight-weather-tts-apis-2026-10-26]
---

# ADR 0012: German speech output behind a swappable server-side SpeechSynthesizer port

## Context
Mona taps a plane and hears the German Steckbrief. The display is an old iPad (iPadOS 16 baseline, ADR 0004). Research (2026-10-26) reports that `speechSynthesis` on iOS 16-18 offers few usable German voices and an unreliable end event, and that audio only starts from a user gesture and is locked again after every reload (ADR 0008). The Vorlese-Sperre (ADR 0004) needs a reliable end-of-speech signal. Sources must be free and self-hostable (ADR 0001). Secrets only come from env vars and the synthesizer is chosen in `config.yaml` (ADR 0007). ADR 0008 already foresees an optional `tts` sidecar container. The builder wants speech easy to swap (e.g. to ElevenLabs if it sounds better) and the vision question "how does a child-friendly German voice sound on the old iPad" is still open, so it must be answerable by listening, not by rebuilding.

Research facts used: Piper's original repo was archived 2025-10-06; the successor `OHF-Voice/piper1-gpl` is **GPL-3.0** with a built-in HTTP server; voices `de_DE-thorsten` and `kerstin` are **CC0**. ElevenLabs free tier: 10,000 credits per month, non-commercial, personal account, API access on the free plan unverified, attribution when publishing.

## Decision

### The port (server side, in the sky-scene module)
- `SpeechSynthesizer.synthesize(text, voice) -> { audio: mp3|wav bytes, mimeType, durationMs }`. Text in, audio out. Nothing else leaks through it: no adapter type, quota or credential appears in domain or client code.
- Failures are typed (`unavailable`, `quota-exceeded`, `bad-voice`) so the caller can degrade without knowing the adapter.
- The service composes the Steckbrief text (short sentences, spelled-out numbers and units, an aviation pronunciation dictionary such as "A380" -> "A dreihundertachtzig"). The text is adapter-independent; per-adapter pronunciation tweaks belong inside the adapter.
- Adapters:
  - **`piper` (default).** An HTTP adapter to Piper running as the **separate `tts` container** of ADR 0008 (`piper1-gpl`, GPL-3.0). The GPL stays in that container and reaches our code only through HTTP; our code stays free of it. Default voice `de_DE-thorsten` (CC0); `kerstin` as alternative.
  - **`elevenlabs` (optional).** HTTP adapter to the ElevenLabs API. Key from env var only (`ELEVENLABS_API_KEY`, ADR 0007); never in `config.yaml`.
  - **Later:** any other adapter (an OS voice, another engine) by implementing the port; no change elsewhere.
  - **`fake`** for mock mode and tests (ADR 0004): returns a fixed short audio and a scenario-controlled duration or failure.
- **Selection by configuration only.** `config.yaml` holds `speech.adapter` (`piper | elevenlabs | fake`), `speech.voice`, and adapter options (endpoint, model, `render: eager | lazy`). Switching the adapter is a config edit plus container restart (ADR 0007: no hot reload), touching no domain or client code. Boot validation (zod) rejects an unknown adapter, and an adapter whose required env credential is missing is reported at boot, with fallback to Piper (below).

### Render policy and cache
- **Cache key `(adapter, voice, text)`** (hashed) in `dataDir`, so switching adapters or voices never serves stale audio. Cached audio is disposable and pruned by age (ADR 0007: caches are deletable).
- **Per-adapter render policy.** Local free adapters (`piper`) render **eagerly** when a selection is committed, so the tap answers instantly. Quota-limited adapters (`elevenlabs`) render **lazily on first tap** and are then cached; the default for `elevenlabs` is `lazy`. Rationale: 10k credits per month is only enough when each Steckbrief is synthesized on demand, not for every selection.
- **Quota guard.** A keyed adapter may carry a `monthlyCharacterBudget`; once exhausted (or on `quota-exceeded`) the service falls back to the `speech.fallback` adapter (default `piper`) for that request and logs a warning.

### Delivery and client
- The state document (`GET /api/state`, ADR 0004) carries, per selection, an `audioUrl` and, when already known, `durationMs`. A lazy adapter's URL synthesizes on first request, so the client never knows or cares which adapter is active.
- The client `Narrator` plays the URL with an `<audio>` element. The tap handler creates/primes the element and calls `play()` synchronously inside the gesture (iPadOS requirement; re-armed by the next tap after each reload, ADR 0008), then lets it buffer, so lazy synthesis latency does not break the gesture rule.
- **Vorlese-Sperre** starts on play and ends on `ended`, with a watchdog (default 60 s, or `durationMs` plus margin when known) that also releases the lock on `error`/`stalled`. A failure never leaves the lock held; narration is optional, the scene is not blocked by it.
- **Fallback when no audio can be produced** (adapter and fallback both failed): the Steckbrief text stays visible and the lock is released immediately. The client-side `speechSynthesis` `Narrator` adapter is an **optional, off-by-default** emergency path (`speech.clientFallback: true`); it is only enabled if the real-iPad check below shows a usable German voice. Its `onend` is never trusted without the watchdog.

### Relationship to ADR 0001 (free, no contracts)
The default is Piper: free, offline, no account, no key, no quota. **ElevenLabs is opt-in only and never required.** The system is complete and fully functional without any key or account, and nothing in boot, tests, mock mode or the e2e suite needs one. Choosing ElevenLabs is a conscious builder action (create an account, accept the non-commercial free-tier terms, supply the key through env), consistent with ADR 0001's "free sources, no contracts" for the default path. Paid plans are likewise conscious opt-in and are not assumed. If ElevenLabs content is ever published, its attribution terms apply; this is a private household display, so not applicable today.

### Walking-skeleton verification on the real iPad
The research is secondary evidence; the walking skeleton (`infrastructure-001-walking-skeleton`) must confirm on the actual device(s) and record the findings by amending this ADR (or a follow-up ADR):
1. Server audio via `<audio>` after a tap plays on iPadOS 16 / Safari 16, with a trustworthy `ended`.
2. Whether `speechSynthesis` has any usable German voice (decides `clientFallback`).
3. Piper CPU latency per Steckbrief on the ThinkCentre (confirms eager rendering is fine).
4. How Thorsten / Kerstin (and ElevenLabs, if tried) sound to the builder and Mona; the swap by config exists precisely to make this a listening test.
Until measured, the decision stands as written: server audio is the default, `speechSynthesis` is off.

## Deviations from the architect's draft
- The draft pre-rendered every committed selection for all adapters; this ADR makes it a **per-adapter render policy** (eager for Piper, lazy for quota-limited ElevenLabs), because the research shows the ElevenLabs free tier cannot afford eager rendering.
- Adds the `fallback` adapter plus quota guard, the optional `ElevenLabs` adapter relation to ADR 0001, typed failures, `durationMs`, and makes the client `speechSynthesis` Narrator off by default (draft: "spike checks its viability").
- Piper is concretely the GPL `piper1-gpl` successor, isolated as a separate container (ADR 0008's `tts` sidecar) instead of a binary in the service.
- The walking-skeleton real-iPad finding is not yet available; it is specified as a verification gate with recorded expectations rather than reported as a result.

## Consequences
### Positive
- Same voice on any tablet; offline by default; reliable end signal; voice improvable centrally.
- Swapping or auditioning synthesizers is a config change; the iPad client never changes.
- GPL isolated; the free default never depends on a key.
### Negative
- Home server needs the Piper container and a voice model; CPU load on the ThinkCentre to be measured.
- Synthetic voice is less child-warm than a human one; ElevenLabs may sound better but is quota-limited and keyed.
- Lazy rendering adds first-tap latency for quota-limited adapters.
### Neutral
- Audio cache needs pruning by age.
- Client `speechSynthesis` code path may stay disabled and unused.

## Alternatives considered
- **Web Speech API only** — zero infrastructure, but voices and `onend` unreliable on old iPadOS.
- **Cloud TTS as default (Google/Azure/ElevenLabs)** — keys, billing or quota, contracts; violates ADR 0001 as a default (kept as opt-in adapter only).
- **Fully Kiosk native TTS bridge** — Android-only, couples the client to one kiosk app; the device is an iPad.
- **Piper embedded in the service** — would bring GPL-3.0 into our process and code; rejected for the separate container.
- **Pre-recorded human voice** — not feasible for composed sentences.
- **Eager rendering for all adapters** — exhausts the ElevenLabs free quota.

## References
- `0001-single-household-self-hosted-free-data-only.md`
- `0004-home-server-service-thin-vanilla-js-client.md`
- `0007-sqlite-single-file-and-validated-yaml-config.md`
- `0008-compose-on-zimaos-and-self-recovering-ipad-kiosk.md`
- `../research/free-flight-weather-tts-apis-2026-10-26.md`

## Note on ADR numbering

Minted provisionally as ADR-0010 in its worker worktree. A sibling task's ADR already claimed that number (or the guess overshot the true count) by the time this task's conductor finalized numbering at squash-merge integration (`lib/adr-allocation.mjs`'s `finalizeAdrNumbering`, ADR-0058) — this ADR was renumbered to **ADR-0012**, the true next-free number on `main` at that moment. No content besides this identity changed.
