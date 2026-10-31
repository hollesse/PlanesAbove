---
id: sky-scene-b7w2n
title: Steckbrief aus Satzbausteinen mit Baustein-Cache (Typ+Airline, Route, Höhe); kein Rufzeichen ohne Airline
status: done
type: feature
context: sky-scene
created: 2026-10-31
completed:
depends_on: [sky-scene-k3f8d]
blocks: []
tags: [speech, steckbrief, cache, elevenlabs, budget]
related_adrs: [0012, 0027, 0028]
related_research: [free-flight-weather-tts-apis-2026-10-26]
prior_art: [sky-scene-t6h2p, sky-scene-k3f8d, sky-scene-xczgm]
---

## Why
Erster Hörtest mit ElevenLabs (Stimme Bill, 31.10.2026): ein Steckbrief mit 136 Zeichen kostet rund 70 Credits (`eleven_flash_v2_5`: 0,5 Credits je Zeichen), das Free-Kontingent von 10.000 reicht damit für etwa 140 Ansagen im Monat. Heute wird jeder Steckbrief als ganzer Text gerendert und unter (Adapter, Stimme, Text) gecacht; weil Höhe und Kombination je Flug variieren, gibt es fast nie einen Treffer. Außerdem fehlt die Route im gesprochenen Steckbrief ganz (`composeSpeech` kennt nur Airline/Rufzeichen, Typ, Höhe als Aufzählung), und ohne bekannte Airline wird das Rufzeichen buchstabiert („D L H vier E H“), was für Mona nichts bedeutet.

Betreiber-Entscheidung 31.10.2026: Der Steckbrief wird aus festen **Satzbausteinen** zusammengesetzt, die einzeln gerendert, gecacht und beim Tippen zusammengefügt werden. Das kippt bewusst die Entscheidung aus dem t6h2p-Refinement („keine Text-Vereinheitlichung für Cache-Treffer“), jetzt mit gemessenem Verbrauch begründet.

## What
**Satzbausteine** (neue Funktion `composeSpeechParts(facts): SpeechPart[]` in `steckbrief.ts`, ersetzt `composeSpeech` für die Sprachausgabe; der Text je Baustein bleibt deterministisch und so kurz wie möglich):
1. **Typ+Airline:** „Das ist ein Airbus A dreihundertzwanzig der Lufthansa.“ Ohne Airline: „Das ist ein Airbus A dreihundertzwanzig.“ (**nie** das Rufzeichen). Ohne Typ, mit Airline: „Das ist ein Flugzeug der Lufthansa.“ Ohne beides: „Das ist ein Flugzeug.“ Aussprache-Wörterbuch (`spokenType`) wie bisher.
2. **Route:** „Er fliegt von Frankfurt nach Istanbul.“ Nur Start und Ziel (erster und letzter Flughafen der Kette aus `RouteInfo.legs`/`text`), Stadtname ohne IATA-Code, Zwischenstopps werden nicht vorgelesen. Route unbekannt → Baustein entfällt.
3. **Höhe:** „Das Flugzeug fliegt in siebentausendfünfhundert Metern Höhe.“ Rundung auf 500 m (unter 1000 m auf 100 m); Höhe 0/unbekannt → Baustein entfällt.
4. **Flugphase:** „Es befindet sich gerade im Sinkflug.“ / „Es befindet sich gerade im Steigflug.“ aus `FlightPhase` (`verticalRateMs`, Schwelle wie `phaseMinRateMs` in airspace, Default 5 m/s). Bei `level` oder unbekannter Rate entfällt der Baustein (kein „Reiseflug“-Satz). Genau zwei Varianten, also nach dem ersten Tag immer im Cache.
5. **Stille:** zwischen zwei Bausteinen 250 ms Stille (konfigurierbar `speech.partGapMs`, Default 250).

**Baustein-Cache und Zusammensetzen (AudioService):**
- Jeder Baustein wird einzeln über den `SpeechSynthesizer` gerendert und unter `keyFor(adapter, voice, bausteinText)` als WAV gecacht; der heutige Cache und das Fallback-Verhalten (ADR 0027: Fallback-Audio unter dem Fallback-Key, Budget nur für gelieferte Synthese) gelten je Baustein. Bausteine des Primäradapters und des Fallbacks werden **nicht gemischt**: fehlt ein Baustein beim Primäradapter (Budget, Fehler), kommt der ganze Steckbrief vom Fallback.
- Das zusammengesetzte Audio (WAV, gleiche Abtastrate, Stille eingefügt) wird unter einem zusammengesetzten Key `(adapter, voice, hash(bausteinTexte))` abgelegt, damit `/audio/<key>.wav`, `wavDurationMs`, State-URL und Client unverändert bleiben. Zusammensetzen ist reines PCM-Aneinanderhängen (`wav.ts`: `concatWav(parts, gapMs)`), kein Re-Encoding; bei abweichender Abtastrate zwischen Bausteinen wird der Steckbrief vom Fallback geliefert und `warn` geloggt.
- Budget zählt nur neu gerenderte Bausteine (Textlänge je Baustein), nicht den Gesamttext. Logzeile `speech synthesized` zusätzlich mit `parts=<n>` und `partsRendered=<m>` (m = neu gerendert).
- Mock-Modus/`fake`-Adapter: unverändert, rendert je Baustein.

**Client:** unverändert (spielt weiter eine Audio-URL).

**Doku:** BC-README (Steckbrief-Definition: Satzform statt Aufzählung, Rufzeichen-Regel, Rundung; Sprachcache: Baustein-Key und zusammengesetzter Key), `config.example.yaml` (`partGapMs`), README-Abschnitt Sprachausgabe (Budgetreichweite neu: nach Einlaufphase fast nur Cache-Treffer).

## Acceptance criteria
- [ ] `composeSpeechParts`: Lufthansa/A320/Route FRA→IST/7480 m/Vertikalrate −8 m/s → genau vier Bausteine mit den Texten „Das ist ein Airbus A dreihundertzwanzig der Lufthansa.“, „Er fliegt von Frankfurt nach Istanbul.“, „Das Flugzeug fliegt in siebentausendfünfhundert Metern Höhe.“, „Es befindet sich gerade im Sinkflug.“
- [ ] Flugphase: Vertikalrate +8 m/s → „Es befindet sich gerade im Steigflug.“; Rate zwischen −5 und +5 m/s oder unbekannt → kein Flugphasen-Baustein.
- [ ] Ohne Airline, mit Rufzeichen DLH4EH → Baustein 1 ist „Das ist ein Airbus A dreihundertzwanzig.“ und kein Baustein enthält das Rufzeichen; ohne Typ mit Airline → „Das ist ein Flugzeug der Lufthansa.“; ohne beides → „Das ist ein Flugzeug.“
- [ ] Route mit Zwischenstopp (FRA → VIE → IST) → „Er fliegt von Frankfurt nach Istanbul.“; Route unbekannt → kein Routen-Baustein; Höhe 0 → kein Höhen-Baustein.
- [ ] Rundung: 7480 → 7500, 7240 → 7000, 850 → 900 (unter 1000 m auf 100 m).
- [ ] `concatWav`: zwei 22050-Hz-Mono-WAVs plus 250 ms Lücke → ein WAV, dessen `wavDurationMs` = Summe + 250 (±1 ms); abweichende Abtastrate → Fehler.
- [ ] AudioService-Test: zwei Flugzeuge derselben Airline/Typ mit verschiedener Höhe → beim zweiten wird nur der Höhen-Baustein neu gerendert (`partsRendered=1`), Budget steigt nur um dessen Textlänge; der Typ+Airline-Baustein kommt aus dem Cache (Synthesizer-Spy zählt Aufrufe).
- [ ] AudioService-Test: Primäradapter liefert Baustein 1, bei Baustein 2 `quota-exceeded` → der ganze Steckbrief kommt vom Fallback (kein gemischtes Audio), Datei unter dem Fallback-Key des zusammengesetzten Steckbriefs, HTTP-Route antwortet 200.
- [ ] Zusammengesetztes Audio liegt unter einem stabilen Key: derselbe Steckbrief (gleiche Bausteintexte) liefert beim zweiten Mal dieselbe URL und rendert nichts neu (`partsRendered=0`).
- [ ] Bestehende Tests zu `composeSpeech`/Steckbrief sind auf die Satzform umgestellt; E2E-Szenarien (Mock) bleiben grün, Client unverändert.
- [ ] README (BC + Root) und `config.example.yaml` ergänzt.
- [ ] Die zusammengesetzte Ansage klingt auf dem iPad flüssig; Übergänge zwischen den Bausteinen stören nicht. [human-eye]

## Notes
- Kein Orchestrator-Lauf: Port, Cache, Fallback und Budget sind in ADR 0012 und ADR 0027 festgelegt; dieser Task ändert nur Textkomposition und Cache-Granularität. Der Worker meldet die Baustein-Regel als README-Delta; ein kurzes ADR (Amendment zu 0012/0027: Baustein-Cache, Satzform, Rufzeichen-Regel, Kein-Mischen-Regel) ist erwünscht.
- Stadtnamen: `RouteInfo.legs` enthält Labels wie „Frankfurt (FRA)“; Stadtname = Label ohne Klammerteil. Fehlt das Label (Flughafen nicht in `tables/airports.json`), den Routen-Baustein weglassen statt einen ICAO-Code vorzulesen.
- Bekannte Grenze: Jeder Baustein hat seine eigene Satzmelodie; mit ganzen Sätzen je Baustein ist das hörbar, aber akzeptabel. Einzelwörter (nur „Lufthansa“) sind bewusst nicht vorgesehen.
- Alte Cache-Dateien des Volltext-Steckbriefs bleiben liegen (anderer Key) und verfallen über das bestehende Alter-Pruning.
- Betreiber-Entscheidungen 31.10.2026: Höhe auf 500 m im Satz „Das Flugzeug fliegt in … Metern Höhe.“; danach optional die Flugphase „Es befindet sich gerade im Sinkflug/Steigflug.“; Route nur Start→Ziel; ohne Typ „Das ist ein Flugzeug der <Airline>.“
- Die Flugphase steht im Modell bereits bereit (`FlightPhase` und `verticalRateMs` in `src/server/modules/airspace/model.ts`); `SkyService.identify`/`composeSpeechParts` muss sie nur durchreichen.

## Verifier note (iteration 1)
REASONS:
- Criterion "quota-exceeded at block 2 → whole Steckbrief from fallback, file under the fallback composed key, HTTP 200" is only partly asserted: the test checks no-mixing and that NO file sits under the primary composed key, but never asserts that a file DOES exist under the fallback composed key. "HTTP-Route antwortet 200" is only approximated by `expect(bytes).toBeDefined()`; nothing drives `/audio/<key>.wav`.
- Everything else passes: 597 tests, typecheck clean, all other criteria map to real assertions, README_DELTA expected strings match verbatim, ADR 0028 well-formed, no .agentheim paths.
SUGGESTED_FIX: Extend the quota-exceeded test to compute the fallback composed key (via the exposed helper or the same hash) and assert `${key}.wav` exists in cacheDir. Then either fetch `/audio/<primaryKey>.wav` through the service route and expect status 200, or state explicitly in the test name and OUTCOME that get() returning bytes is the route's 200 condition.
ITERATION_HINT: likely-fixable

## Outcome

The Steckbrief is now composed from sentence blocks. `composeSpeechParts(facts, phaseMinRateMs)` in `steckbrief.ts` replaces `composeSpeech` (removed): type+airline, route first→last city (label without IATA code; legs without a code are skipped), altitude (500 m / 100 m under 1000 m), flight phase. The callsign is never spoken. `SkyService` passes `verticalRateMs` and `info.legs` and uses `config.sources.route.plausibility.phaseMinRateMs` (default 5 m/s) for the spoken phase; `speech.text` in the state is the blocks joined with a space.

`AudioService.register` accepts a string (one block) or a block list. Blocks are cached per (adapter, voice, text), composed audio per composed key (`composedKeyFor`; equals `keyFor(text)` for one block). `wav.ts` gains `concatWav(parts, gapMs)` (throws `WavFormatError` on differing format/rate; the AudioService then logs warn and delivers the whole Steckbrief from the fallback). No mixing of primary and fallback blocks; the budget pre-check sums the uncached blocks, charging stays per delivered block. `speech synthesized` logs `parts` and `partsRendered`. New config `speech.partGapMs` (default 250), documented in `config.example.yaml` and the root README. The quota-exceeded-on-block-2 test additionally asserts that the composed fallback file exists in cacheDir under the fallback composed key (computed via `composedKeyFor` of an AudioService built on the fallback adapter/voice) and that `AudioService.get` returns RIFF/WAV bytes under the primary key, which is exactly the `/audio/<key>.wav` route's 200 condition (app.ts:157-161); the route itself is not booted. Tests: steckbrief, concatWav, AudioService block cache/no-mixing/stable key/budget, config (npm test: 597 passed, typecheck clean).

Note: the display phase (`climbOrDescent` in `sky-service.ts`) still uses +/-2.5 m/s, the spoken block uses 5 m/s (`phaseMinRateMs`); I did not change the display rule, so a plane at 3 m/s shows climb but speaks no phase. E2E suite (`npm run e2e`) was not run (needs a Storybook build); no e2e/client file references the spoken text. The [human-eye] criterion (flow on the iPad) is open for the operator. Old full-text cache files remain until the existing age pruning.
