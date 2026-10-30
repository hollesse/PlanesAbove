---
id: sky-scene-t6h2p
title: ElevenLabs-Adapter (opt-in) mit Zeichenbudget und Piper-Fallback
status: todo
type: feature
context: sky-scene
created: 2026-10-27
completed:
depends_on: [infrastructure-001-walking-skeleton]
blocks: []
tags: [speech, follow-up]
related_adrs: [0012, 0007, 0008, 0001]
related_research: [free-flight-weather-tts-apis-2026-10-26]
prior_art: [sky-scene-xczgm, infrastructure-001-walking-skeleton]
---

## Why
Die Piper-Stimme `de_DE-thorsten-medium` läuft seit dem 30.10.2026 auf dem ZimaOS-Server, klingt dem Betreiber aber nicht gut genug. ADR 0012 sieht `elevenlabs` als optionalen, per `config.yaml` wählbaren Adapter vor; die Konfiguration akzeptiert bisher nur `piper|fake`. Die offene Vision-Frage „Wie klingt eine kindgerechte deutsche Vorlesestimme?“ soll durch Hören beantwortet werden, nicht durch Umbau.

Refinement 2026-10-30 (Entscheidungen des Betreibers): **Free-Tier**, kein Bezahlplan (Vision: keine Bezahl-APIs); bei erschöpftem Budget still auf Piper zurück. Der Steckbrief-Text bleibt unverändert (keine Vereinheitlichung für bessere Cache-Treffer). Stimme und Modell sind konfigurierbar, das Ticket setzt Defaults.

## What
**Adapter.** `ElevenLabsSpeechSynthesizer` (`name = 'elevenlabs'`) hinter dem bestehenden `SpeechSynthesizer`-Port in `src/server/modules/sky-scene/`, neben `piper-speech.ts`:
- `POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}?output_format={outputFormat}` mit Header `xi-api-key` und Body `{ text, model_id }`. Transport über `guardedFetch` wie beim Piper-Adapter, Timeout aus der Konfiguration.
- **Ausgabe als PCM, nicht MP3:** Default `output_format: pcm_22050` (16-bit mono; die PCM-Formate ≤ 24 kHz sind im Free-Tier erlaubt, `pcm_44100` und `mp3_44100_192` nicht). Der Adapter setzt einen WAV-Header davor (Erweiterung von `wav.ts`: `pcmToWav(bytes, sampleRate)`), damit `wavDurationMs`, der Audio-Cache (`.wav`), die `/audio/<key>.wav`-Route und der Client unverändert bleiben. Bei nicht-PCM-Format wird die Konfiguration beim Boot abgelehnt.
- Fehlerabbildung (Vorbild Piper-Adapter): 401 → `unavailable` (Boot-Warnung „Key abgelehnt“), 429 und 402 → `quota-exceeded`, 404/422 mit Voice-Bezug → `bad-voice`, 5xx/Netz/Timeout/kein WAV → `unavailable`.

**Konfiguration (zod, ADR 0007).**
```yaml
speech:
  adapter: elevenlabs            # piper | elevenlabs | fake
  voice: <voice_id>              # ElevenLabs voice_id; Default im Schema: eine deutschsprachige Bibliotheksstimme, vom Worker gegen /v1/voices geprüft
  render: lazy                   # Default für elevenlabs ist lazy, für piper eager (ADR 0012)
  fallback: piper                # Adapter, auf den bei Budget/quota-exceeded/fehlendem Key zurückgefallen wird
  elevenlabs:
    modelId: eleven_flash_v2_5   # Deutsch, halbe Credits pro Zeichen
    outputFormat: pcm_22050
    monthlyCharacterBudget: 9000 # Free-Tier 10.000 Credits; 1 Credit ≈ 1 Zeichen, Reserve für Rundung
    timeoutMs: 15000
```
- Key nur aus `ELEVENLABS_API_KEY` (Umgebung, wie `FLIGHTAWARE_API_KEY` in `app.ts`), nie aus `config.yaml`.
- `render` ohne Angabe: `lazy` wenn `adapter: elevenlabs`, sonst `eager` (heute fest `eager`).

**Budget und Fallback (AudioService).**
- Zähler `speech_usage(month TEXT PRIMARY KEY, characters INTEGER)` in SQLite (neue Migration), hochgezählt vor jedem ElevenLabs-Request um `text.length`; Monat nach `Europe/Berlin` bzw. der Dienst-Zeitzone. Überlebt Neustarts.
- Reihenfolge bei `get(key)`: Cache-Datei des Primäradapters → (Budget reicht?) Primäradapter synthetisieren → sonst oder bei `quota-exceeded`/`unavailable` den Fallback-Adapter. Fallback-Audio wird **unter dem Cache-Key des Fallback-Adapters** abgelegt (`keyFor` mit Adaptername), nie unter dem Primärschlüssel, damit nach Monatswechsel wieder ElevenLabs gerendert wird und kein Piper-Audio als ElevenLabs-Audio dauerhaft hängen bleibt. Die URL im State bleibt der Primärschlüssel.
- Erster Fallback eines Monats loggt `warn` („speech budget exhausted, falling back to piper“), weitere `info`; jede Synthese loggt wie heute `speech synthesized` mit `adapter`, `voice`, `durationMs` und zusätzlich `charactersUsedThisMonth`.
- Boot: `adapter: elevenlabs` ohne `ELEVENLABS_API_KEY` → `warn` und Betrieb mit `fallback` (Piper), kein Abbruch. `fallback: elevenlabs` ist unzulässig (Schema).

**Mock/E2E.** Mock-Modus ersetzt wie heute jeden Adapter durch `fake`; kein Szenario braucht einen Key. Ein neues Szenario oder ein Unit-Test deckt den Fallback-Pfad ab (siehe Akzeptanz).

**Doku.** README-Abschnitt Sprachausgabe: Account anlegen, Key als Umgebungsvariable im Compose (`docker-compose.zimaos.yml`: `ELEVENLABS_API_KEY` aus ZimaOS-Umgebung, nicht in die Datei schreiben), Stimme wählen, Free-Tier-Bedingungen (nicht-kommerziell, Attribution nur bei Veröffentlichung, privat nicht einschlägig; ADR 0012). `config.example.yaml` ergänzen.

## Acceptance criteria
- [ ] Ohne `ELEVENLABS_API_KEY` und mit `adapter: piper` verhalten sich Boot, Unit-Tests, Mock-Modus und E2E-Suite unverändert (CI grün ohne Secret).
- [ ] `adapter: elevenlabs` ohne Key: Boot läuft durch, Log enthält eine `warn`-Zeile mit Hinweis auf `ELEVENLABS_API_KEY`, Audio kommt vom Fallback-Adapter (Unit-Test mit Fake-Env).
- [ ] Contract-Test `ElevenLabsSpeechSynthesizer`: 200 mit PCM-Fixture → WAV mit korrekter `durationMs` (`wavDurationMs` der gewrappten Bytes = Bytes / (2 · sampleRate) · 1000); 401 → `unavailable`; 429 → `quota-exceeded`; 422 Voice-Fehler → `bad-voice`; Timeout → `unavailable`; Request trägt `xi-api-key`, `model_id` und `output_format`.
- [ ] `pcmToWav` + `wavDurationMs` Round-Trip-Test in `speech.contract.test.ts`.
- [ ] AudioService-Test: Budget 100 Zeichen, zwei Texte à 60 Zeichen → erster Text ElevenLabs, zweiter Text Fallback; Fallback-Datei liegt unter dem Fallback-Key, Primärkey bleibt ohne Datei; Zähler steht nach dem Lauf auf 60 (nicht 120).
- [ ] AudioService-Test: `quota-exceeded` vom Primäradapter → Fallback-Audio wird geliefert, HTTP-Route antwortet 200 statt 503.
- [ ] Zähler-Persistenz: nach Neustart des Dienstes (neue `AudioService`-Instanz über derselben SQLite) zählt der Monat weiter.
- [ ] Cache-Key enthält Adaptername und Voice (bestehender Test erweitert um `elevenlabs`).
- [ ] Schema: `fallback: elevenlabs`, `outputFormat: mp3_*` und unbekannter Adapter werden beim Boot mit lesbarer Fehlermeldung abgelehnt.
- [ ] `render` ohne Angabe ergibt `lazy` für `elevenlabs` und `eager` für `piper` (Schema-Test).
- [ ] README, `config.example.yaml` und `docker-compose.zimaos.yml` (Umgebungsvariable per `${ELEVENLABS_API_KEY:-}`) sind ergänzt; `docker compose config` ohne gesetzte Variable bleibt gültig.
- [ ] Die ElevenLabs-Stimme klingt auf dem iPad verständlich und kindgerecht; der Betreiber entscheidet nach Hören, ob sie Default bleibt. [human-eye]

## Notes
- Kein Orchestrator-Lauf nötig: die Architektur ist in ADR 0012 vollständig festgelegt (Port, Lazy-Rendering, Budget-Guard, Fallback, Cache-Key). Neu gegenüber dem ADR und hier entschieden: PCM-statt-MP3 (hält WAV-Pfad und Dauerberechnung), Fallback-Cache unter dem Fallback-Key, Zähler in SQLite statt im Speicher. Kein eigenes ADR, das ist eine Amendment-Notiz an ADR 0012 im README-Delta des Workers.
- Reichweite: ~100 Zeichen pro Steckbrief, Free-Tier also rund 90 neue Ansagen pro Monat; Wiederholungen (gleicher Text) kommen aus dem Cache. Der Betreiber hat bewusst gegen Text-Vereinheitlichung entschieden; falls das Budget regelmäßig vor Monatsende leer ist, ist das ein eigenes Folge-Ticket (Rundung der Höhe, Weglassen der Geschwindigkeit).
- Unverifiziert (Research 2026-10-26): ob der Free-Plan API-Zugriff hat und ob 1 Credit = 1 Zeichen gilt. Der Worker prüft beides mit dem Key des Betreibers (`GET /v1/user/subscription` liefert `character_count`/`character_limit`) und trägt das Ergebnis ins README-Delta ein. Hat der Free-Plan keinen API-Zugriff, bounct der Worker das Ticket mit dieser Feststellung zurück.
- Optional für den Worker, falls billig: `GET /v1/user/subscription` beim Boot einmal abfragen und `monthlyCharacterBudget` damit plausibilisieren (Log, kein Override).
- Mögliches Folge-Ticket (nicht Teil dieses Tasks): `/healthz` meldet den Zustand der Sprachausgabe (letzter Synthese-Fehler, Budgetstand) als `degraded`; aufgefallen am 30.10.2026, als der Piper-Sidecar im Default-Bridge-Netz unerreichbar war und nichts es anzeigte.
- Default-Stimme: Der Worker wählt aus `GET /v1/voices` eine deutsche Stimme mit `labels.language = de` (oder eine mehrsprachige Standardstimme) und dokumentiert voice_id und Namen; der Betreiber hört sich danach durch (human-eye-Kriterium).
