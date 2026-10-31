---
id: sky-scene-b7w2n
title: Steckbrief aus Satzbausteinen mit Baustein-Cache (Typ+Airline, Route, Höhe); kein Rufzeichen ohne Airline
status: todo
type: feature
context: sky-scene
created: 2026-10-31
completed:
depends_on: [sky-scene-k3f8d]
blocks: []
tags: [speech, steckbrief, cache, elevenlabs, budget]
related_adrs: [0012, 0027]
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
