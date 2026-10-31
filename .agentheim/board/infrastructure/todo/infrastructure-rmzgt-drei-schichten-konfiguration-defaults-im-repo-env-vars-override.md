---
id: infrastructure-rmzgt
title: Drei-Schichten-Konfiguration: Defaults als config.yaml im Repo, Pflichtwerte und Secrets per Umgebungsvariable, optionale Override-Datei; README beschreibt alles
status: todo
type: decision
context: infrastructure
created: 2026-10-31
completed:
depends_on: []
blocks: []
tags: [config, env, deployment, zimaos, readme]
related_adrs: [0007, 0025, 0030]
related_research: []
prior_art: [infrastructure-z7kq4]
---

## Why
Die reale `config.yaml` liegt außerhalb von git, in zwei Kopien (lokal und auf dem Heimserver). Jede Code-Änderung mit neuem Schlüssel oder Default muss der Betreiber von Hand nachziehen, auf dem Server per Dateien-App und Neustart. Der Assistent darf die Datei nicht bearbeiten, weil sie Prod-Zustand ist. Die Datei enthält aber keine Geheimnisse, nur den Standort ist persönlich. ADR 0030 (Brainstorm 2026-10-31) legt deshalb drei Schichten fest: Defaults im Repo, Pflichtwerte und Secrets per Umgebungsvariable, optionale Override-Datei.

## What
ADR 0030 ist bereits geschrieben und akzeptiert. Dieser Task setzt sie um; er ist ein Decision-Task mit Code, weil die Entscheidung erst mit dem Loader und der README wirkt.

- **Loader** (`src/server/config.ts`): Reihenfolge Repo-`config.yaml` (im Image, Pfad per `CONFIG_PATH`, Default `./config.yaml`) → Umgebungsvariablen `PLANESABOVE_*` → Override-Datei aus `PLANESABOVE_CONFIG_OVERRIDE` (optional, tiefes Merge auf Schlüsselebene; Listen werden ersetzt, nicht vereinigt). Danach dieselbe Schema-Validierung wie heute, fail fast mit lesbarer Meldung.
- **Variablen** (Vorschlag, im Task final festlegen): `PLANESABOVE_LAT`, `PLANESABOVE_LON`, `PLANESABOVE_PLACE` (Pflicht, ohne sie startet der Dienst nicht), `PLANESABOVE_RADIUS_KM`, `PLANESABOVE_PORT`, `PLANESABOVE_DATA_DIR`, `PLANESABOVE_LOG_LEVEL`, `PLANESABOVE_SPEECH_ADAPTER`, `PLANESABOVE_SPEECH_ENDPOINT`, `PLANESABOVE_SPEECH_VOICE`, `PLANESABOVE_FLIGHTAWARE_ENABLED` (hängt `flightaware` hinten an `sources.route.order`). Secrets behalten ihre Namen: `ELEVENLABS_API_KEY`, `FLIGHTAWARE_API_KEY`, `HEARTBEAT_URL`. Ein gesetzter Schlüssel aktiviert das Feature **nicht**.
- **Repo-Config**: `config.example.yaml` wird zu `config.yaml` (eingecheckt, aus `.gitignore` entfernt). `location` und `place` stehen dort ohne Wert; ein Unit-Test sichert, dass die eingecheckte Datei keine Koordinaten enthält. Dev/Prod-Unterschiede (`dataDir`, `speech.*`, `port`) stehen nicht mehr in der Datei, sondern in den Compose-Dateien als `environment:`.
- **Compose**: `docker-compose.zimaos.yml` liefert `PLANESABOVE_*` über `${PLANESABOVE_LAT:?}`-Platzhalter (Pflicht) bzw. mit Default; der Bind-Mount `/config` wird optional (nur für die Override-Datei). `docker-compose.yml` für den Dev-Rechner analog. Der Test `tests/unit/deploy-workflow.test.ts` wird angepasst.
- **Startlog**: eine Zeile, welche Schlüssel aus Umgebung bzw. Override kamen (nie Secret-Werte).
- **README**: ein eigener Abschnitt „Konfiguration“ mit (a) den drei Schichten und der Überlagerungsreihenfolge, (b) einer Tabelle aller Umgebungsvariablen mit Pflicht/optional, Default, Beispiel, (c) dem Weg, eine Override-Datei anzulegen, (d) einer Migrationsanleitung für die bestehende Installation auf dem Heimserver (welche Werte aus der alten `config.yaml` in welche Variable wandern), (e) dem Hinweis, dass die eingecheckte `config.yaml` nie Standort oder Schlüssel enthält. Die Abschnitte „Schnellstart“, „Betrieb auf dem Heimserver“ und „ElevenLabs“/„FlightAware“ werden auf die Variablen umgestellt.

## Acceptance criteria
- [ ] `config.yaml` ist eingecheckt, enthält keine Koordinaten, keinen Ortsnamen und keine Schlüssel; ein Unit-Test prüft das (Regex auf `lat`/`lon` mit Zahlenwert, `apiKey`-artige Schlüssel).
- [ ] Der Dienst startet ohne `PLANESABOVE_LAT`/`PLANESABOVE_LON`/`PLANESABOVE_PLACE` nicht und nennt die fehlenden Variablen in der Meldung; Unit-Tests für Pflicht, Typkonvertierung (Zahl, Boolean) und ungültige Werte.
- [ ] Überlagerungsreihenfolge Repo → Env → Override ist durch Unit-Tests belegt, inklusive „Override gewinnt über Env“ und „Listen werden ersetzt“.
- [ ] Ein gesetzter `ELEVENLABS_API_KEY` bzw. `FLIGHTAWARE_API_KEY` ohne die zugehörige Aktivierungsvariable ändert das Verhalten nicht (Test).
- [ ] Beide Compose-Dateien reichen die `PLANESABOVE_*`-Variablen durch; `podman compose -f docker-compose.zimaos.yml config -q` läuft mit gesetzten Pflichtvariablen fehlerfrei; `tests/unit/deploy-workflow.test.ts` ist angepasst und grün.
- [ ] README-Abschnitt „Konfiguration“ existiert mit den fünf Teilen (a) bis (e) aus „What“; jede im Code gelesene `PLANESABOVE_*`-Variable kommt in der Tabelle vor (Test: Variablennamen aus `src/server` gegen README).
- [ ] ADR 0030 bleibt gültig; Abweichungen (z. B. andere Variablennamen) werden in der ADR nachgetragen, nicht nur im Code.
- [ ] Nach dem Deploy auf dem Heimserver: Variablen in der ZimaOS-Oberfläche gesetzt, Container startet, `/healthz` meldet `ok`, die Szene zeigt den richtigen Standort. [human-eye]

## Notes
- Entscheidung des Betreibers 2026-10-31 (Brainstorm „reale Config sicher bearbeitbar machen“): Aktivierung und Schlüssel getrennt halten, weil bei FlightAware Geld dranhängt. Override-Datei bleibt, weil Timeouts und Ähnliches pro Installation drehbar sein sollen, ohne neuen Code-Default.
- Die Memory-Regel „config.yaml-Änderungen immer ansagen“ bleibt für Schicht 2 und 3 bestehen (Umgebungsvariablen auf dem Server, Override-Datei) und entfällt für die eingecheckte Repo-Config.
- Mock-Modus (`mode: mock`, `scenario`) bleibt in der Datei; E2E-Tests setzen ihn weiter per eigener YAML oder Override-Datei.
- Migration auf dem Server: alte `config.yaml` unter `/DATA/AppData/planesabove/config/` kann nach der Umstellung gelöscht oder in eine Override-Datei verkürzt werden.
- Prior art: infrastructure-z7kq4 (Compose für ZimaOS; Env-Vars kommen dort in jeder Oberfläche unverändert an, ADR 0025).
