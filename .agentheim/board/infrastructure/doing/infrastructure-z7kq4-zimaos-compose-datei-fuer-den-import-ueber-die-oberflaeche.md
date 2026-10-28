---
id: infrastructure-z7kq4
title: Eigene Compose-Datei für den Import über die ZimaOS-Oberfläche (ohne build, Piper fest dabei, gepflegter Watchtower)
status: doing
type: feature
context: infrastructure
created: 2026-10-28
completed:
depends_on: [infrastructure-agdax]
blocks: []
tags: [deployment, compose, zimaos, watchtower, ghcr]
related_adrs: [0008, 0022]
related_research: []
prior_art: [infrastructure-agdax, infrastructure-d3v7k]
---

## Why
Der Betreiber installiert PlanesAbove über die ZimaOS-Oberfläche („Eigene App installieren“ → Compose importieren), nicht per SSH (Entscheidung 2026-10-28). Die vorhandene `docker-compose.yml` ist für Entwicklungsrechner und SSH-Betrieb geschrieben: Sie enthält `build: .` und `build: ./docker/piper` (auf dem Server gibt es keinen Checkout), einen Storybook-Dienst mit relativem Bind-Mount `./storybook-static` und Piper nur hinter dem Compose-Profil `tts`. Ob die ZimaOS-Oberfläche Profile beachtet, ist unklar. Ein Import dieser Datei scheitert deshalb vermutlich oder startet ohne Sprachausgabe.

Außerdem ist `containrrr/watchtower:latest` nicht mehr gepflegt. Gegen Docker-Engines ab 29 (Mindest-API 1.44) wird der Fehler „client version … is too old“ gemeldet. Welche Docker-Version auf ZimaOS läuft, ist nicht bekannt.

## What
Eine zweite Compose-Datei `docker-compose.zimaos.yml` nur für den Heimserver:
- Dienste `planesabove` und `tts` laufen beide ohne Profil, ausschließlich mit GHCR-Images (`ghcr.io/hollesse/planesabove:main`, `ghcr.io/hollesse/planesabove-tts:main`), ohne `build:`. Dazu kommt `watchtower`. Kein Storybook.
- Nur absolute Bind-Mounts unter `/DATA/AppData/planesabove/…`, so wie in der bestehenden Datei (data, config:ro).
- Healthcheck, `restart: unless-stopped`, Log-Rotation, `TZ` und Watchtower-Labels wie bisher.
- Watchtower bekommt ein gepflegtes Image, das mit Docker-API ≥ 1.44 arbeitet, z. B. den Fork `nickfedor/watchtower` (vor dem Einbau prüfen, ob er weiter gepflegt wird). Die bestehende `docker-compose.yml` bekommt dasselbe Image.
- Optional ZimaOS/CasaOS-Metadaten (`x-casaos`: Titel, Web-UI-Port 8080, Icon), damit die App als Kachel mit Link erscheint. Nur einbauen, wenn das ohne Risiko für den Import geht. Sonst kommt in die Notes, warum es weggelassen wurde.
- README, Abschnitt „Betrieb auf dem Heimserver (ZimaOS)“, Schritte 1 und 2: Ordner `/DATA/AppData/planesabove/{config,data}` und `config.yaml` über die ZimaOS-Dateien-App anlegen (Port 8080, `dataDir: /data`, `speech.adapter: piper`, `speech.endpoint: http://tts:5000`). Dann `docker-compose.zimaos.yml` in der Oberfläche importieren. Der SSH-Weg mit der bestehenden Datei bleibt als Alternative beschrieben. Ein Hinweis kommt dazu: Mit `docker version` auf ZimaOS die Engine-Version prüfen.

## Acceptance criteria
- [ ] `docker-compose.zimaos.yml` existiert; `podman compose -f docker-compose.zimaos.yml config -q` läuft fehlerfrei.
- [ ] Die Datei enthält kein `build:`, kein `profiles:`, keinen relativen Bind-Mount (jeder Host-Pfad beginnt mit `/`) und keinen `storybook`-Dienst. Ein Test unter `tests/` oder `src/**/*.test.*` liest die YAML-Datei und prüft genau diese vier Regeln.
- [ ] `planesabove` und `tts` verweisen auf die GHCR-Images mit Tag `:main` und tragen das Label `com.centurylinklabs.watchtower.enable=true`. `planesabove` hat Healthcheck, Port `8080:8080`, `CONFIG_PATH` und `TZ`. Das prüft derselbe Test.
- [ ] Beide Compose-Dateien nutzen für Watchtower nicht mehr `containrrr/watchtower`. Der Name des gewählten Images und der Grund dafür stehen im Kommentar der Compose-Datei.
- [ ] Die README-Schritte 1 und 2 beschreiben den Import über die ZimaOS-Oberfläche mit `docker-compose.zimaos.yml` sowie die Prüfung mit `docker version`. Der SSH-Weg bleibt als Alternative stehen.
- [ ] Auf ZimaOS lässt sich `docker-compose.zimaos.yml` über „Eigene App installieren“ importieren und starten. Beide Container und Watchtower laufen, `/healthz` meldet `ok`, und Watchtower meldet im Log keinen API-Versionsfehler. [human-eye]

## Notes
- Entscheidung des Betreibers 2026-10-28 (Modeling-Session „auf das Homelab deployen“): Installation über die ZimaOS-Oberfläche, frischer Datenbestand auf dem Server (die lokale `data/planesabove.db` wird nicht übernommen, den VRS-Snapshot lädt der Server selbst).
- Die GHCR-Pakete entstehen beim ersten Lauf von `deploy.yml` (erster Push 2026-10-28). Das Repo ist öffentlich. Nach dem Lauf prüfen, ob beide Pakete öffentlich sind, sonst in den Paketeinstellungen umstellen (README Schritt 2).
- Das letzte Kriterium ist `[human-eye]` und gehört dem Betreiber vor Ort. Danach folgt die Geräteabnahme aus infrastructure-d3v7k (Betreiber-Hälfte).
