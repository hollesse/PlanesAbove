---
id: infrastructure-d3v7k
title: Geräteabnahme des Walking Skeletons auf ZimaOS-Heimserver und echtem iPad
status: done
type: chore
context: infrastructure
created: 2026-10-27
completed:
depends_on: [infrastructure-001-walking-skeleton, airspace-w3k8d, sighting-log-k4m7q, infrastructure-agdax]
blocks: []
tags: [walking-skeleton, operator, device, piper, podman, webkit]
related_adrs: [0004, 0005, 0008, 0011, 0012, 0013, 0016, 0019, 0024]
related_research: [free-flight-weather-tts-apis-2026-10-26]
prior_art: [infrastructure-001-walking-skeleton]
---

## Why
Der Walking Skeleton wurde in der Cloud gebaut und dort im Mock-Modus und per E2E (nur Chromium) geprüft. Seit der Erfassung heute Vormittag hat sich der Unterbau bewegt: Flugquellenkette adsb.fi → adsb.lol (ADR 0019), Routenkette hexdb → adsbdb → VRS-Snapshot → FlightAware (airspace-w3k8d, ADR 0016, ADR 0018), Routen-Statistik per `npm run stats:routes`, Beobachtungsstandort je Sichtung (sighting-log-k4m7q). Der Dienst läuft auf dem Entwicklungsrechner bereits live mit echten Daten. Was noch nie lief: der Piper-Container (nur gegen konstruierte Fixtures gebaut, ADR 0013), die Container-Images selbst, Playwright unter WebKit, der Heimserver und das iPad.

Der Task hat deshalb zwei Hälften. Alles ohne Hardware erledigt ein Worker auf dem Entwicklungsrechner (dort gibt es Podman, kein Docker). Die Kriterien, die Heimserver, iPad, echten Standort und echte Ohren brauchen, sind `[human-eye]` und bleiben für den Betreiber offen (ADR 0061); der Verifier meldet sie als „builder eye-check pending", nicht als FAIL, und der Worker bounct den Task deswegen nicht.

## What
**Worker-Hälfte (Entwicklungsrechner, Podman):**
1. Piper-Sidecar bauen und starten (`podman build -t planesabove-tts:local docker/piper`, `podman run --rm -p 5000:5000 planesabove-tts:local`). Die echte Anfrageform von `piper.http_server` (piper1-gpl) ermitteln, Dockerfile (Pip-Extras, Voice-Download, CMD) und `PiperSpeechSynthesizer` daran anpassen, die konstruierte WAV-Fixture durch eine vom laufenden Server aufgezeichnete ersetzen. Wenn `voice` je Anfrage nicht wählbar ist, Voice beim Start fest verdrahten und die Config-Doku entsprechend korrigieren. Die „UNVERIFIED"-Hinweise in Dockerfile, Adapter, ADR-0013-Verweis im README und infrastructure-README-Open-Question entfernen bzw. als geklärt markieren.
2. Dienst-Image bauen und live starten (`podman build -t planesabove:local .`, `podman run` mit gemountetem `config.yaml` und Datenverzeichnis, `speech.adapter: piper`, `speech.endpoint` auf den lokalen Piper). `/healthz` muss `ok` melden, ein Tipp in Chromium muss eine WAV aus Piper abspielen.
3. Playwright WebKit installieren (`npx playwright install webkit`) und `npx playwright test --project=webkit` grün bekommen; WebKit-spezifische Fehler sind Teil dieses Tasks.
4. Root-README-Abschnitt „Betrieb auf dem Heimserver (ZimaOS) und iPad-Pruefung" auf den aktuellen Stand bringen: Quellketten, Befund (c) per `npm run stats:routes -- --db /DATA/AppData/planesabove/data/planesabove.db --days 1` statt roher sqlite-Abfrage, Hinweis dass lokal Podman (build/run) und auf ZimaOS Docker Compose mit GHCR-Images (kein Build, siehe infrastructure-agdax) genutzt wird, Piper-Schritt ohne „unverifiziert"-Vorbehalt.
5. Abschnitt `## Befunde` unten in diesem Task als ausfüllbare Vorlage für (a)–(c) belassen; der Worker trägt dort nur die lokal ermittelten Werte ein (Piper-Anfrageform, WebKit-Version).

**Betreiber-Hälfte (vor Ort):** Einmalige Einrichtung auf dem ZimaOS-Heimserver über den automatischen Deploy-Pfad aus infrastructure-agdax (Compose-Datei mit GHCR-Images und Watchtower importieren, `config.yaml` anlegen, kein `--build` auf dem Server), Einrichtung des iPads nach README, Gegenprüfung mit öffentlichem Tracker, Hörprobe, eine Stunde Routen-Stichprobe, Befunde (a)–(c) eintragen. Danach die Vision-Open-Questions zu iPad, Vorlesestimme und Radius in einer Modeling-Session schließen.

## Acceptance criteria
- [ ] `podman build docker/piper` gelingt; `POST` gegen den laufenden Container mit der im Adapter kodierten Anfrageform liefert `audio/wav`, und ein Contract-Test `src/**/piper*.test.*` läuft gegen eine vom echten Server aufgezeichnete WAV-Fixture (Fixture-Datei mit Herkunftskommentar, keine konstruierte mehr).
- [ ] Kein Vorkommen von `UNVERIFIED`/`unverified`/`unverifiziert` mehr in `docker/piper/Dockerfile`, dem Piper-Adapter und dem README-Betriebsabschnitt; die Piper-Open-Question im infrastructure-README ist gestrichen oder als geklärt umformuliert.
- [ ] `podman build .` erzeugt das Dienst-Image; mit gemounteter Live-Konfiguration (echter Standort, Radius 30, `speech.adapter: piper`) meldet `GET /healthz` innerhalb von 60 s `"status":"ok"`; ein JSON-Logeintrag belegt eine erfolgreiche Piper-Synthese (kein `speech synthesis failed`).
- [ ] `npx playwright test --project=webkit` ist auf dem Entwicklungsrechner grün; Root-README nennt WebKit nicht mehr als „läuft hier nicht".
- [ ] Root-README-Betriebsabschnitt nennt die aktuellen Quellketten (adsb.fi → adsb.lol; hexdb → adsbdb → VRS → FlightAware), `npm run stats:routes` für Befund (c), Podman lokal vs. Compose auf ZimaOS; `docker compose config` bleibt fehlerfrei.
- [ ] Auf dem ZimaOS-Heimserver startet die Compose-App mit GHCR-Images und Watchtower (`docker compose --profile tts up -d`, kein lokaler Build) mit der Live-`config.yaml`; `/healthz` meldet `ok`; das iPad zeigt die Szene unter der LAN-URL; ein anschließender Push auf `main` landet ohne Zutun auf dem Display. [human-eye]
- [ ] Innerhalb von 60 s erscheinen die real im Umkreis fliegenden Flugzeuge (gegengeprüft mit einem öffentlichen Tracker): korrekte Typklasse, höchstens die 2 nächsten, Callsign/Typ/Höhe in der Info-Leiste. [human-eye]
- [ ] Tippen spricht eine verständliche deutsche Zeile über den iPad-Lautsprecher (Piper-Sidecar). [human-eye]
- [ ] Befunde (a)–(c) im Abschnitt `## Befunde` eingetragen: iPad-Modell, iPadOS- und Safari-Version, Mindestgrenze Safari 16 bestätigt; deutsche Sprachausgabe über Server-Audio ja/nein; Routenanteil aus `stats:routes` über eine Stunde Stichprobe (Quellen, Unbekannte, Konflikte). [human-eye]

## Notes
- Ausgelagert aus infrastructure-001-walking-skeleton (Betreiber-Entscheidung 2026-10-27), weil die Cloud-Umgebung weder Heimserver noch iPad noch den echten Standort hat.
- Refinement 2026-10-27 (Betreiber-Entscheidungen): Worker macht alles ohne Hardware und bounct nicht; Abnahme wartet auf airspace-w3k8d und sighting-log-k4m7q, damit die Stichprobe die endgültige Routenkette misst und je Standort auswertbar ist; Stichprobe 1 h, Auswertung per `stats:routes`; lokal steht Podman zur Verfügung (kein Docker-Daemon), Compose wird erst auf ZimaOS geprüft.
- Piper-Hinweis für den Worker: piper1-gpl's `piper.http_server` lädt die Stimme beim Start (`-m`); ob ein `voice`-Feld pro Anfrage akzeptiert wird, ist genau die zu klärende Frage. Antwort ist WAV; `wavDurationMs` muss die echte Datei parsen.
- Refinement 2026-10-27 abends (dritter Durchgang): Alle drei Abhängigkeiten (infrastructure-001, airspace-w3k8d, sighting-log-k4m7q) sind in `done/`; die Routenkette im README (Abschnitte Routenquelle/Flugquelle) ist bereits aktuell, nur der Betriebsabschnitt (Schritte 2, 6, 7) hinkt noch (sqlite-Abfrage statt `stats:routes`, Piper-Vorbehalt). `stats:routes` kennt inzwischen `--standort`; Befund (c) bitte für den Live-Standort auswerten. Auf dem Entwicklungsrechner ist `docker` ein Shell-Alias auf Podman 6.1 — der Worker nutzt `podman` explizit. Nicht Teil des Tasks: die Vision-Open-Questions schließen (eigene Modeling-Session nach der Abnahme).
- Refinement 2026-10-28: Betreiber will keinen manuellen Erstlauf. Die Abnahme vor Ort läuft über den automatischen Deploy-Pfad (infrastructure-agdax, jetzt Abhängigkeit); der Worker-Teil (Podman lokal, Piper, WebKit, README) bleibt unverändert und kann parallel zu agdax laufen, nur die Betreiber-Hälfte wartet.
- Die fünf `[human-eye]`-Kästchen bleiben bis zur Abnahme vor Ort offen (ADR 0061). Der Betreiber hakt sie von Hand ab.
- Befunde (b) und (c) beantworten offene Fragen der Vision (Vorlesestimme, Routen-Abdeckung); (a) die iPad-Frage. Die Routen-Open-Question ist seit ADR 0016 inhaltlich beantwortet und wartet nur auf die Streichung.

## Befunde
- (a) iPad: _Modell / iPadOS / Safari / Safari ≥ 16 bestätigt:_
- (b) Sprachausgabe deutsch über Server-Audio: _ja / nein, Piper-Anfrageform:_
- (c) Routenanteil (1 h, `stats:routes`): _Anteil mit Route / je Quelle / Unbekannte / Konflikte:_
- WebKit-Version im lokalen Playwright-Lauf: _

## Verifier note (iteration 1)
**REASONS:**
- Check 6 (ADR frontmatter): the ADR 0024 body (0024-piper-contract-verified.md) has id/title/status/date but no `scope` field; every existing ADR has one (0013 uses `scope: infrastructure`).
- Only defect found. Verified independently: npm test 493, typecheck, build; playwright webkit 11 passed (chromium 11); `podman build docker/piper` ok and live POST /synthesize returns 200 RIFF/WAVE (Content-Type text/html, adapter checks bytes — accepted); `podman build .` ok with `npm ci --ignore-scripts`, better-sqlite3 works in the image; no UNVERIFIED left; README_DELTA anchors match infrastructure README lines 44/52 and both sections exist; livery def → lh legitimately stale; `podman compose config -q` clean; root README names both chains, stats:routes, Podman vs Compose/GHCR. Five [human-eye] criteria: builder eye-check pending.

**SUGGESTED_FIX:** Add `scope: infrastructure` (and `related_tasks`/`related_adrs: [0013]`) to the ADR 0024 frontmatter in the ADRS block. Change nothing else.

**ITERATION_HINT:** likely-fixable


## Outcome
Worker-Hälfte abgeschlossen (Betreiber-Hälfte, [human-eye]-Kriterien, bleibt offen).

- Piper: `podman build docker/piper` gelingt; piper-tts 1.8.0. Echte Anfrageform ermittelt, `PiperSpeechSynthesizer` postet jetzt an `<endpoint>/synthesize`; `tests/fixtures/piper-sample.wav` ist vom Server aufgezeichnet (Herkunft in `piper-sample.wav.origin.txt`). Alle UNVERIFIED-Hinweise entfernt; Dockerfile-`|| true` beim Voice-Download entfernt. Config-Default `speech.voice` auf `de_DE-thorsten-medium` korrigiert (der alte Name existiert im Image nicht, der Server wich still auf die Startstimme aus).
- Dienst-Image: `podman build .` scheiterte zunächst (npm 10 aus node:22 will better-sqlite3 per node-gyp bauen, kein Python im Slim-Image). Behoben mit `npm ci --ignore-scripts` in beiden Stufen; das betrifft auch den CI-Build (agdax). Live-Lauf lokal (Port 8089, Live-Konfiguration mit echtem Standort Oberweyer, Radius 30, `speech.adapter: piper`, Kopie des Datenverzeichnisses): `/healthz` `"status":"ok"` nach unter 10 s, zwei echte Flugzeuge, `/audio/<id>.wav` liefert `audio/wav`, Log `speech synthesized` (adapter piper, voice de_DE-thorsten-medium, durationMs 5840/6769), kein `speech synthesis failed`. Neu: `speech synthesized`-Infozeile im AudioService. Tipp in Chromium nicht eigens per Browser geprüft; der Audiopfad (state -> audioUrl -> WAV) wurde per HTTP gegen den echten Piper belegt.
- WebKit: `npx playwright test --project=webkit` 11 passed. Die veraltete Erwartung in `tests/e2e/skeleton.spec.ts` (`data-livery` `def` -> `lh`, DLH-Lackierung seit 9c206c5) wurde korrigiert, sonst keine WebKit-spezifischen Fehler.
- Root-README: WebKit-Zeile, Quellketten, Schritt 6 (Piper ohne Vorbehalt), Schritt 7 (`stats:routes`), Schritt 11 (Podman build/run, Hinweis `--ignore-scripts`). `podman compose config -q` fehlerfrei.
- Tests: npm test 493 passed / 1 skipped, typecheck, build, playwright webkit 11 passed. Neue Tests (3): Endpoint-Trailing-Slash, Erfolgs-Logzeile, Fixture-Contract mit /synthesize; Fixture ersetzt.
- README_DELTA: beide infrastructure-README-Änderungen (Entwickler-Befehle-Bullet, Piper-Open-Question) als `replace` mit Anker auf die Bullet-Zeile; falls die Grammatik die Open-Questions-Sektion nicht trägt, bitte die Zeile von Hand streichen/umformulieren.
- ADR 0024 (provisorisch, Frontmatter in Iteration 2 um `scope: infrastructure` ergänzt): Ergänzung zu 0013 mit dem verifizierten Vertrag.

### Befunde (lokal)
- (b) Sprachausgabe deutsch über Server-Audio: ja, lokal belegt (Server-seitig, Gerätehörprobe auf dem iPad steht aus). Piper-Anfrageform: `POST <endpoint>/synthesize`, `Content-Type: application/json`, Body `{"text": "...", "voice": "de_DE-thorsten-medium"}` (optional weiter `speaker`, `speaker_id`, `length_scale`, `noise_scale`, `noise_w_scale`); Antwort 200 mit WAV-Körper, Header `text/html`; leerer Text oder Fehler -> 500; `/` nur GET.
- WebKit-Version im lokalen Playwright-Lauf: 27.2 (Playwright WebKit, Desktop Safari-Profil).
- (a) iPad und (c) Routenanteil: Betreiber, offen.
