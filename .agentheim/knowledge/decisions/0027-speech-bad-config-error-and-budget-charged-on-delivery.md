---
id: ADR-0027
title: SpeechError gains bad-config and timedOut; budget charged only on delivery or timeout; speech.voice required for ElevenLabs
scope: sky-scene
status: accepted
date: 2026-10-30
supersedes: []
superseded_by: []
related_tasks: [sky-scene-k3f8d]
related_adrs: [0012]
related_research: []
---

# ADR-0027: SpeechError gains bad-config and timedOut; budget charged only on delivery or timeout; speech.voice required for ElevenLabs

Extends ADR 0012 (German speech output behind the SpeechSynthesizer port), whose port contract lists exactly three typed failures: `unavailable`, `quota-exceeded`, `bad-voice`.

## Context

The first production run on 2026-10-30 failed on every ElevenLabs request. The log only said `speech quota-exceeded, falling back to piper`. The real answer was HTTP 402 `paid_plan_required` ("Free users cannot use library voices via the API"): a configuration error (wrong voice id), not an exhausted quota. It could only be found by hand with curl. Worse, the budget counter counted every request before it was sent: about 60 failed 402 requests left `charactersUsedThisMonth` at 7458 while ElevenLabs reported `character_count` 0 (`GET /v1/user/subscription`). The own budget lock would soon have blocked a plan that had never been billed. The previous schema default voice `21m00Tcm4TlvDq8ikWAM` ("Rachel") is itself a library voice and therefore the cause of the 402 on a free plan.

## Decision

1. **Port contract.** `SpeechErrorKind` is now `unavailable | quota-exceeded | bad-voice | bad-config`. `bad-config` means the operator must fix configuration (voice id, key permissions, plan); retrying will not help. In the ElevenLabs adapter: HTTP 402, and 401/403 (also with `detail.code` such as `paid_plan_required`, `missing_permissions`, `invalid_api_key`, `detected_unusual_activity`) map to `bad-config`; only 429 stays `quota-exceeded`; 404/422 stay `bad-voice`; 5xx, network errors and timeouts stay `unavailable`. `SpeechError` carries a boolean `timedOut`, true when the request was sent and the adapter gave up on the timeout. Every non-200 is logged with HTTP status and `detail.code`/`detail.message` (or the first 300 characters of a non-JSON body); `bad-config` and `bad-voice` log at `warn` with a hint to check `speech.voice`, key permissions and plan. The fallback adapter still serves audio for every error kind.
2. **Budget accounting (reverses "count before the request").** `AudioService` adds the text length to the monthly counter only after a delivered synthesis, or after a timeout (`timedOut`), where the provider may already have rendered and billed. HTTP errors (`bad-config`, `quota-exceeded`, `bad-voice`, other `unavailable`) never charge. Reason: ElevenLabs bills only delivered synthesis, and the production evidence above showed the old rule drained the own budget with zero real usage.
3. **`speech.voice` required for `adapter: elevenlabs`, no default.** The config schema rejects an elevenlabs setup without `speech.voice` and points at "My Voices" in its message. `ELEVENLABS_DEFAULT_VOICE` is removed. A hard-coded library voice cannot work on the free plan, and a silent default turned a configuration mistake into an opaque runtime failure. Piper's voice handling is unchanged.

## Consequences

- Operators see the real cause (status, code, message) in the log at the first failure instead of a misleading "quota-exceeded".
- A timeout can still over- or under-count slightly; it is the only grey area and is deliberately counted as consumption (conservative towards the budget).
- Existing elevenlabs configs without `speech.voice` fail at start with a clear schema error; they must name a voice from "My Voices".
- Any new `SpeechSynthesizer` adapter must map its provider's configuration errors to `bad-config` and set `timedOut` only for a sent-then-timed-out request.