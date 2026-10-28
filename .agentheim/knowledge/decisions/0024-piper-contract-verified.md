---
id: ADR-0024
title: Piper-Sidecar-Vertrag gegen den laufenden Server geprüft (Ergänzung zu ADR 0013)
scope: infrastructure
status: accepted
date: 2026-10-28
related_tasks: [infrastructure-d3v7k]
related_adrs: [0013, 0012]
---

# ADR-0024: Piper-Sidecar-Vertrag verifiziert

## Kontext
ADR 0013 hielt die Anfrageform des Piper-Sidecars ausdrücklich als ungeprüft fest (gebaut gegen konstruierte Fixtures). Task infrastructure-d3v7k hat `docker/piper` mit Podman gebaut und den Server (piper-tts 1.8.0) abgefragt.

## Entscheidung
- Endpunkt: `POST <speech.endpoint>/synthesize`, JSON `{"text": ..., "voice": ...}`. Der Adapter hängt `/synthesize` an die Basis-URL an (`http://tts:5000`, Schrägstrich am Ende tolerant). Der Pfad `/` antwortet 405.
- Antwort: HTTP 200, Körper ist eine WAV (RIFF, 16 bit mono); der Server sendet `Content-Type: text/html`, deshalb prüft der Adapter nur die WAV-Bytes (`wavDurationMs`), nie den Header.
- `voice` ist pro Anfrage wählbar und optional, aber nur für im Image installierte Stimmen; eine unbekannte Stimme fällt still auf die Startstimme zurück (kein HTTP-Fehler, also kein `bad-voice` von Piper). Daher Default `speech.voice: de_DE-thorsten-medium` (vorher `de_DE-thorsten`, das es im Image nicht gibt).
- Fehlerfälle: leerer Text und Fehler im Server liefern HTTP 500 (HTML-Fehlerseite) -> `unavailable`.
- Dockerfile: Extra `piper-tts[http]`, Voice-Download mit `python3 -m piper.download_voices` ohne `|| true` (ein fehlgeschlagener Download bricht den Build jetzt ab). Die Contract-WAV ist eine vom echten Server aufgezeichnete Fixture mit Herkunftsdatei.
- Dienst-Image: `npm ci --ignore-scripts` in beiden Stufen, weil npm 10 (in node:22) better-sqlite3 sonst per node-gyp bauen will und scheitert; die Prebuild im Tarball genügt. Das betrifft auch den CI-Build der Images.
- Zusätzlich loggt der AudioService je erfolgreicher Synthese `speech synthesized` (adapter, voice, durationMs).

## Konsequenzen
ADR 0013 bleibt gültig; sein Vorbehalt „unverifiziert“ entfällt. Ändert Piper die Route oder die Antwort, schlägt der Fixture-Contract-Test beim Neuaufzeichnen auf.