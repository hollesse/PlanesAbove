---
id: sky-scene-k3f8d
title: ElevenLabs-Fehler sichtbar machen und Budget bei Fehlern nicht belasten (402 ist kein Kontingentfehler)
status: done
type: bug
context: sky-scene
created: 2026-10-30
completed:
depends_on: [sky-scene-t6h2p]
blocks: []
tags: [speech, elevenlabs, logging, bug]
related_adrs: [0012, 0027]
related_research: []
prior_art: [sky-scene-t6h2p]
---

## Why
Erster Produktivlauf am 30.10.2026: Jede ElevenLabs-Anfrage schlug fehl, das Log zeigte nur `speech quota-exceeded, falling back to piper`. Tatsächlich antwortete ElevenLabs mit **402 `paid_plan_required`** („Free users cannot use library voices via the API“), ein Konfigurationsfehler (falsche voice_id), kein verbrauchtes Kontingent. Die Ursache war nur per Hand-Curl zu finden. Zusätzlich zählte der Budgetzähler jeden fehlgeschlagenen Request mit (`charactersUsedThisMonth` 7458 bei 0 verbrauchten Credits laut `GET /v1/user/subscription`), sodass die eigene Budgetsperre bald gegriffen hätte, obwohl nie etwas berechnet wurde.

## What
In `src/server/modules/sky-scene/elevenlabs-speech.ts` und `audio-service.ts`:
- **Fehlerklasse `bad-config`** (oder `misconfigured`) neu: HTTP 402 sowie 401/403 mit `detail.code` aus ElevenLabs (z. B. `paid_plan_required`, `missing_permissions`, `invalid_api_key`, `detected_unusual_activity`) → `bad-config`. Nur **429** bleibt `quota-exceeded`. `bad-voice` für 404/422 wie bisher.
- **Antworttext loggen:** Bei jedem Nicht-200 den HTTP-Status und, falls JSON, `detail.code` und `detail.message` (sonst die ersten 300 Zeichen des Bodys) ins Log. Bei `bad-config` und `bad-voice` als `warn` mit Hinweis, dass die Konfiguration (`speech.voice`, Key-Berechtigungen, Plan) zu prüfen ist; `quota-exceeded`/`unavailable` wie heute (erster pro Monat `warn`, dann `info`), aber ebenfalls mit Status und `detail.code`.
- **Budget nur bei Erfolg belasten:** `usage.add(text.length)` erst nach erfolgreicher Antwort (200 mit Audio). Begründung: ElevenLabs berechnet nur gelieferte Synthese; Timeout nach gesendetem Request ist der einzige Graubereich und wird als Verbrauch gezählt (bei Timeout trotzdem `add`), alle HTTP-Fehler nicht.
- Fallback-Verhalten unverändert: bei jeder Fehlerklasse liefert der Fallback-Adapter.

## Acceptance criteria
- [ ] Contract-Test: 402 mit `{"detail":{"code":"paid_plan_required","message":"..."}}` → `SpeechError` Klasse `bad-config`, Fehlermeldung enthält Status 402 und `paid_plan_required`.
- [ ] Contract-Test: 401 mit `detail.code` → `bad-config`; 429 → `quota-exceeded`; 404/422 → `bad-voice`; 5xx/Netz → `unavailable` (bestehende Tests angepasst).
- [ ] AudioService-Test: Primäradapter wirft bei 60 Zeichen Text `bad-config` → Fallback liefert Audio, Zähler bleibt 0.
- [ ] AudioService-Test: Primäradapter wirft `quota-exceeded` → Zähler bleibt 0. Erfolgreiche Synthese → Zähler +Textlänge. Timeout → Zähler +Textlänge.
- [ ] Log-Test (Logger-Spy): Bei 402 erscheint eine `warn`-Zeile mit `status=402`, `code=paid_plan_required` und der ElevenLabs-Message; bei 429 enthält die Zeile `status=429`.
- [ ] README-Abschnitt Sprachausgabe: Hinweis, dass Library-Stimmen im Free-Plan erst über „Add to My Voices“ nutzbar sind und wie die Log-Zeile bei Konfigurationsfehlern aussieht.
- [ ] `npm test` grün, bestehende Schema-Tests unverändert.

## Notes
- Befund 30.10.2026 mit dem Key des Betreibers: Free-Plan hat API-Zugriff, `character_limit` 10000, `character_count` 0 nach ~60 fehlgeschlagenen Requests. Default-Stimme „Rachel“ (`21m00Tcm4TlvDq8ikWAM`) ist eine Library-Stimme und im Free-Plan per API gesperrt; der Schema-Default sollte daher **keine** konkrete Library-ID mehr sein. Vorschlag: `voice` für elevenlabs Pflichtfeld ohne Default, Schema-Fehlermeldung verweist auf „My Voices“.
- Der Betreiber hat den Zähler per `DELETE FROM speech_usage` zurückgesetzt; keine Migration nötig.

## Verifier note (iteration 1)
REASONS:
- ADR 0012 lists the port's typed failures as exactly `unavailable`, `quota-exceeded`, `bad-voice`. The diff adds `bad-config` and a `timedOut` flag on `SpeechError` to the port without an ADR (`ADRS` block empty).
- The diff reverses a budget-accounting decision (charge only for delivered audio or timeout, instead of before every request) and makes `speech.voice` required for elevenlabs (dropping `ELEVENLABS_DEFAULT_VOICE`); nothing durable records these.
- README_DELTA: the `replace` op's `expected` text does not match the current "ElevenLabs adapter" bullet verbatim (it drops "; non-PCM formats are rejected by the config schema" and the Rachel/unverified clause); the new `body` also drops the still-true non-PCM clause.
- Everything else passed: all acceptance criteria map to tests, `npm test` 585 passed, tsc clean, scope clean, timeout handling without guardedFetch verified by hand (hanging fetch → unavailable, timedOut true). Coverage gap: no adapter-level test asserts `timedOut === true`.
SUGGESTED_FIX: Add an ADR to the ADRS block (amending/extending 0012, citing it) recording (a) the new `bad-config` SpeechErrorKind and the `timedOut` flag, (b) budget charged only for delivered audio or a timeout, (c) `speech.voice` required for elevenlabs with no default. Fix the README_DELTA `expected` to match the current bullet verbatim and keep the non-PCM clause in `body`. Bonus: adapter-level test that a hanging fetch gives `timedOut === true`.
ITERATION_HINT: likely-fixable

## Verifier note (iteration 2)
REASONS:
- README sync: README_DELTA updates only the "ElevenLabs adapter" bullet. The "Speech budget" bullet (BC README line ~30) still says the counter "is incremented by `text.length` before each ElevenLabs request" and lists only `quota-exceeded`/`unavailable` as fallback triggers. After the delta the README would contradict itself (old rule in line 30, new rule in line 32); `bad-config`/`bad-voice` are missing as fallback triggers.
- Everything else passes: all acceptance criteria map to tests, npm test 585 passed, typecheck clean, scope clean, iteration-1 points fixed (expected matches verbatim, non-PCM clause kept, ADR 0027 records all three decisions and cites 0012, adapter-level timedOut test present).
SUGGESTED_FIX: Add a second `replace` op to README_DELTA anchored on "Speech budget" with `expected` = the current bullet copied exactly; body: counter incremented by `text.length` only after delivered audio or after a timeout following a sent request, never for HTTP errors (ADR-0027); list `bad-config`/`bad-voice` among the failures that send the text to the fallback adapter. No code change needed.
ITERATION_HINT: likely-fixable

## Outcome

ElevenLabs failures are now diagnosable and no longer drain the budget. The adapter classifies 402 and 401/403 as the new `bad-config` kind (only 429 stays `quota-exceeded`, 404/422 `bad-voice`, 5xx/network/timeout `unavailable`), logs HTTP status plus `detail.code`/`detail.message` (or the first 300 characters of the body) at `warn` for `bad-config`/`bad-voice`, and sets `SpeechError.timedOut` on a timeout after sending. `AudioService` charges the monthly counter only for delivered audio or a timeout, never for HTTP errors; the fallback adapter still serves audio. `speech.voice` is required for `adapter: elevenlabs` (no default; library voices are blocked on the free plan). The README section Sprachausgabe explains "Add to My Voices" and the log line. Decisions are recorded in provisional ADR 0027-speech-bad-config-error-and-budget-charged-on-delivery.md (extends ADR 0012). Iteration 2 added that ADR, the corrected README delta, and an adapter-level test asserting a hanging fetch yields `timedOut === true`. Key files: `src/server/modules/sky-scene/elevenlabs-speech.ts`, `audio-service.ts`, `speech.ts`, `src/server/config.ts`, `tests/unit/server/speech.contract.test.ts`, `tests/unit/server/config.test.ts`. `npm test` and `npm run typecheck` green.
