---
id: sky-scene-k3f8d
title: ElevenLabs-Fehler sichtbar machen und Budget bei Fehlern nicht belasten (402 ist kein Kontingentfehler)
status: todo
type: bug
context: sky-scene
created: 2026-10-30
completed:
depends_on: [sky-scene-t6h2p]
blocks: []
tags: [speech, elevenlabs, logging, bug]
related_adrs: [0012]
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
