# Himmelsszene (sky-scene)

## Purpose
Was Mona sieht und hört: komponiert Himmel, bis zu zwei Flugzeuge und Info-Leiste zur Himmelsszene, spielt Übergänge ab, liest Steckbriefe vor und hält die Vorlese-Sperre.

## Classification
core — hier entsteht das Erlebnis, um das es geht.

## Actors
- **Mona** — schaut, tippt auf Flugzeug oder Text, hört den Steckbrief.
- **Erwachsene** — lesen die Info-Leiste.

## Ubiquitous language
- **Himmelsszene** — Himmel + bis zu zwei Flugzeuge + Info-Leiste, wie sie gerade angezeigt wird.
- **Übergang** — animierter Wechsel: Flugzeug kommt / geht / wechselt, Wetter wechselt, Tageszeit wechselt.
- **Steckbrief** — deutsche Ansage zu einem Flugzeug, aus festen Satzbausteinen zusammengesetzt (Typ+Airline, Route Start→Ziel nur mit Stadtnamen, Höhe auf 500 m gerundet (unter 1000 m auf 100 m), optional Flugphase Steig-/Sinkflug ab 5 m/s). Das Rufzeichen wird nie vorgelesen; ohne Airline heißt es „Das ist ein <Typ>.“ bzw. „Das ist ein Flugzeug.“. Unbekannte Teile entfallen als ganzer Baustein.
- **Vorlesen** — Ausgabe des Steckbriefs per Sprachausgabe nach Tippen.
- **Vorlese-Sperre** — solange vorgelesen wird, übernimmt die Szene keine neue Auswahl.
- **Info-Leiste** — Textzeile(n) für Erwachsene unten im Bild; eine oder zwei Zeilen mit Nummern-Plakette.
- **Zuletzt** — Hinweis im leeren Himmel auf das zuletzt gesehene Flugzeug („vor N Min“).
- **SpeechSynthesizer** — serverseitiger Port: Text + Stimme rein, Audio (mp3/wav) + Dauer raus. Adapter `piper` (Standard, lokal, kostenlos) und `elevenlabs` (optional, Schlüssel per Umgebungsvariable); Auswahl allein per `config.yaml` (ADR 0012).
- **Narrator** — clientseitiger Abspieler für das Vorlesen: spielt per `<audio>` eine Audio-URL des Servers nach Tippen und meldet das Ende (`ended`) an die Vorlese-Sperre; `speechSynthesis` ist nur ein optionaler Notfall-Adapter (ADR 0012).
- **Sprachcache** — Audio-Cache des Servers. Baustein-Key (Adapter, Stimme, Bausteintext) je Satzbaustein; zusammengesetzter Key (Adapter, Stimme, Hash der Bausteintexte) für das gefügte Steckbrief-Audio, unter dem `/audio/<key>.wav` ausgeliefert wird. Bausteine von Primäradapter und Fallback werden nie gemischt: fehlt ein Baustein beim Primäradapter, kommt der ganze Steckbrief vom Fallback (unter dessen Key). Wechsel des Adapters spielt nie veraltetes Audio ab.
- **Narrator** / **Vorlese-Sperre (Umsetzung)** — der Client spielt die Audio-URL nach Tippen per `<audio>`; die Sperre beginnt beim Abspielen, endet bei `ended` oder per Watchdog (auch bei `error`/`stalled`), eine neuere Auswahl wird bis dahin gepuffert (infrastructure-001, ADR 0012).
- **Veraltete Szene (stale)** — serverseitig berechnet, nicht pro Fehlschlag gesetzt: die Szene gilt als veraltet (Kopfzeile "Letzter Stand"), wenn der letzte erfolgreiche Abruf der Flugquelle aelter ist als flightMaxAge (`health.flightMaxAgeSeconds`, Default 3 Takte = 90 s; dieselbe Schwelle wie /healthz-degraded). Die Clientregel (`client.staleAfterMinutes`, 5 min) bleibt separat.
- **Slot** — eine der zwei stabilen Positionen der Szene (Slot 1, Slot 2); die Slot-Nummer ist die Identität in der Szene und die Spalte `slot` im Sichtungslog. Ein freigewordener Slot wird neu besetzt, belegte Slots tauschen nie die Position (ADR 0017).
- **Slot-Haltezeit** — ein Flugzeug behält seinen Slot mindestens `scene.slotHoldTakte` Takte (Default 3), auch wenn ein anderes näher ist; sie endet sofort, wenn es den Radius verlässt oder aus den Flugdaten verschwindet. Danach gilt wieder die Nächste-Regel (horizontale Distanz). Server-seitig; die Vorlese-Sperre (Client) verzögert nur die Anzeige, nicht den Haltezähler (ADR 0017).

**Umsetzung (sky-scene-n0sfy):** `pickTransition(prev, next)` (`src/client/app/transition-plan.ts`) vergleicht nur icao24 und Array-Position und liefert eine Spec-Id, 'same' oder 'cut' (Fallback immer Schnitt). Die Übergang-Sperre ist eine zweite `VorleseSperre<SceneState>`-Instanz, innerhalb der Vorlese-Sperre verkettet; ihr Watchdog (TRANSITION_MS + 300) ist der Ende-Timer. Während eines Übergangs wird nur der neueste Stand gepuffert; bei Freigabe wird er angewandt (ggf. nächster Übergang) oder der Endbildschirm gerendert. `data-planes` = angewandter Stand, `data-transition` = laufende Spec-Id (leer sonst). Tippen in der Übergangs-Bühne löst nur über `[data-side="to"]`-Ebenen auf. Erster Render und Himmel-/Stale-/Uhr-only-Änderungen bleiben harter Voll-Render.
- **Speech budget** — the monthly cap (`speech.elevenlabs.monthlyCharacterBudget`, default 9000 characters; free plan has 10000 credits, 1 credit ~ 1 character) on text sent to the metered `elevenlabs` adapter. The counter lives in SQLite (`speech_usage(month, characters)`, month in the service time zone), is incremented by `text.length` only after delivered audio or after a timeout following a sent request, never for HTTP errors (ADR-0027), and survives restarts. When a text no longer fits, or the primary fails with `quota-exceeded`, `unavailable`, `bad-config` or `bad-voice`, the fallback adapter serves it.
- **Fallback adapter** — `speech.fallback` (`piper` or `fake`, never `elevenlabs`) with `speech.fallbackVoice`. Its audio is cached under the FALLBACK adapter's cache key (adapter name + voice + text), never under the primary key; the URL handed to the client stays the primary key, so the primary renders again once the budget is back. Without `ELEVENLABS_API_KEY` the service logs a `warn` at boot and runs the fallback as its only adapter.
- **ElevenLabs adapter** — `ElevenLabsSpeechSynthesizer` (`name = 'elevenlabs'`): POST /v1/text-to-speech/{voiceId}?output_format=pcm_22050 with `xi-api-key` (from env `ELEVENLABS_API_KEY` only) and body `{text, model_id}` (default `eleven_flash_v2_5`). Output is raw PCM wrapped into a WAV by `pcmToWav`, so cache, `/audio/<key>.wav` and client stay WAV-only; non-PCM formats are rejected by the config schema. Errors: 402 and 401/403 are `bad-config` (wrong voice id, plan, key permissions; warn log with HTTP status, `detail.code` and message), 429 `quota-exceeded`, 404/422 `bad-voice`, everything else (5xx, network, timeout) `unavailable`; a timeout after the request was sent sets `SpeechError.timedOut`. `speech.voice` is required for `adapter: elevenlabs` and has no default (on the free plan only premade voices work via the API; library voices are blocked even after "Add to My Voices", HTTP 402 paid_plan_required — finding 2026-10-30). The monthly budget is charged only for delivered audio or a timeout, never for HTTP errors (ADR-0027).
- **ADR 0012 amendment (sky-scene-t6h2p, 2026-10-30)** — (1) ElevenLabs output is PCM (`pcm_22050`), not MP3, wrapped to WAV so the WAV cache/route/duration path stays unchanged; (2) fallback audio is cached under the fallback adapter's own key, never the primary key; (3) the monthly character counter is persisted in SQLite (migration 0008 `speech_usage`), not held in memory. `render` defaults to lazy for elevenlabs, eager otherwise.
- **Aussprache Boeing** — bei Boeing-Typen wird die dreistellige Baureihe ziffernweise gesprochen („Boeing sieben vier sieben“), die Variante nach dem Bindestrich als Zahlwort („… vierhundert“, „… neun“, „737 MAX 8“ → „… Max acht“); Airbus, Embraer, ATR bleiben als Zahl („A dreihundertzwanzig“). Artikel im Typ-Baustein: „Das ist eine Boeing …“, sonst „ein“.


## Aggregates
_Noch nicht modelliert — entsteht in `modeling` / bei der Arbeit an Tasks._

## Key events
_Noch offen._

## Key commands
_Noch offen._

## Frontend gate
Every frontend / UI task in this BC must `depends_on: [design-system-001-styleguide]`. **Storybook-first (ADR 0002):** this BC only composes components that exist and are approved in the design-system Storybook. A missing UI element is first built as a story in design-system, reviewed, then used here.

## Relationships with other contexts
- **Downstream of:** airspace (Auswahl je Takt), weather (aktueller Himmel), liveries (Lackierung je Airline × Typklasse).
- **Gated by:** design-system (Styleguide).
See `../../context-map.md`.

## Open questions
_Siehe `../../vision.md` → Open questions._
