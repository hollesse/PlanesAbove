# Himmelsszene (sky-scene) — Index (knowledge)

Catalog of ADRs, research, and concept synthesis pages scoped to this bounded context.

> Updated by: `work` (BC-scoped ADRs, concept page links), `research` (BC-scoped reports).
> Hand-edits are fine but the skills will append at the section markers below.

---

## ADRs scoped to this BC

<!-- adr-local:start -->
- [0028 — Steckbrief aus Satzbausteinen mit Baustein-Cache](../../decisions/0028-steckbrief-sentence-blocks-and-block-cache.md) — extends ADR 0012/0027: the spoken Steckbrief is composed from fixed sentence blocks cached per (adapter, voice, block text) and joined as PCM under a composed key; callsign never spoken; primary and fallback blocks never mixed; reverses the t6h2p no-text-unification decision on measured usage.
- [0027 — SpeechError bad-config/timedOut, budget charged on delivery, speech.voice required](../../decisions/0027-speech-bad-config-error-and-budget-charged-on-delivery.md) — extends ADR 0012: new `bad-config` error kind and `timedOut` flag on the port; the monthly ElevenLabs budget is charged only for delivered audio or a timeout, never for HTTP errors; `speech.voice` is required for elevenlabs.
- **0017** — Slot hold time (N Takte, default 3), stable slot positions, nearness purely horizontal — 2026-10-27 — `../../decisions/0017-slot-hold-time-stable-slots-horizontal-nearness.md`
- **0012** — German speech output behind a swappable server-side SpeechSynthesizer port (Piper default, ElevenLabs opt-in), played as audio on the iPad — 2026-10-26 — `../../decisions/0012-german-speech-output-behind-speechsynthesizer-port.md`
<!-- adr-local:end -->

## Research touching this BC

<!-- research-local:start -->
<!-- research-local:end -->

## Concepts (opt-in synthesis pages)

<!-- concepts:start -->
<!-- concepts:end -->

## Pointers

- BC README (ubiquitous language, invariants): `README.md`
- Task board (tasks by status) for this BC: `../../../board/sky-scene/INDEX.md`
