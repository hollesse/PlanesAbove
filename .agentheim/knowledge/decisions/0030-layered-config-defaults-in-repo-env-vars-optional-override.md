---
id: 0030
title: Drei-Schichten-Konfiguration: Defaults im Repo, Pflichtwerte und Secrets per Umgebungsvariable, optionale Override-Datei
scope: global
status: accepted
date: 2026-10-31
supersedes: []
superseded_by: []
related_adrs: [0007, 0008, 0025]
related_tasks: [infrastructure-rmzgt]
related_research: []
---

# ADR 0030: Drei-Schichten-Konfiguration: Defaults im Repo, Pflichtwerte und Secrets per Umgebungsvariable, optionale Override-Datei

Ergänzt ADR 0007 (validierte YAML-Konfiguration) und ADR 0025 (Betrieb über die ZimaOS-Oberfläche). Die Validierung beim Start und das Fail-fast-Verhalten bleiben.

## Context
Die einzige Konfigurationsdatei `config.yaml` liegt heute außerhalb von git (nur `config.example.yaml` ist eingecheckt). Davon gibt es zwei Kopien: die lokale Entwicklungs-Kopie und die Produktions-Kopie unter `/DATA/AppData/planesabove/config/` auf dem Heimserver. Jede Code-Änderung, die einen neuen Schlüssel oder einen neuen Default bringt, muss der Betreiber von Hand in beide Kopien nachziehen, auf dem Server per Dateien-App und Container-Neustart. Der Assistent darf die Prod-Kopie nicht erreichen und muss jede Änderung ansagen (Regel vom 2026-10-31).

Die Datei enthält keine Geheimnisse (API-Keys laufen seit ADR 0007 nur über Umgebungsvariablen). Das einzig Persönliche ist der Standort (Koordinaten, Ortsname). Das Repository ist öffentlich.

Es gibt drei Arten von Werten:
1. **Defaults**, die für jede Installation gleich sind (Timeouts, Cache-Zeiten, Takte, Plausibilitätsschwellen, Quellenreihenfolge). Sie ändern sich nur mit dem Code.
2. **Pflichtwerte je Installation**: Standort, Ortsname, Radius; die Dev/Prod-Unterschiede `dataDir`, `port`, `speech.adapter`, `speech.endpoint`; Secrets; die Aktivierung von Opt-in-Features mit Fremdkonto (ElevenLabs, FlightAware).
3. **Seltenes Feintuning** einer einzelnen Installation (ein Timeout, eine Cache-Zeit), das kein neuer Code-Default werden soll.

## Decision
Die Konfiguration bekommt drei Schichten, die in dieser Reihenfolge übereinandergelegt werden (spätere gewinnt):

1. **Repo-Config** (`config.yaml` im Repository, versioniert, öffentlich): alle Defaults. Sie ersetzt `config.example.yaml` als Quelle der Wahrheit für Defaults und wird in das Docker-Image gebacken. Der Assistent darf sie direkt bearbeiten, Änderungen fließen per Commit, Image-Build und Watchtower auf den Server.
2. **Umgebungsvariablen** mit Präfix `PLANESABOVE_`: Pflichtwerte je Installation und Secrets. Standort und Ortsname sind Pflicht, der Dienst startet ohne sie nicht (lesbare Meldung). Die Aktivierung von ElevenLabs und FlightAware ist eine **eigene** Variable, getrennt vom Schlüssel: ein hinterlegter Schlüssel schaltet das Feature nicht ein. Die bestehenden Secret-Variablen (`ELEVENLABS_API_KEY`, `FLIGHTAWARE_API_KEY`, `HEARTBEAT_URL`) bleiben unter ihrem Namen.
3. **Override-Datei** (optional, Pfad in `PLANESABOVE_CONFIG_OVERRIDE`): ein YAML mit denselben Schlüsseln wie die Repo-Config, das einzelne Werte überschreibt. Für Feintuning. Auf dem Heimserver im Normalfall nicht vorhanden.

Der Standort kommt **nie** in die Repo-Config; die eingecheckte Datei trägt dort keinen Wert, und ein Test sichert das. Der Zusammenbau und die Validierung passieren weiterhin beim Start (ADR 0007); die zusammengesetzte Konfiguration wird gegen dasselbe Schema geprüft.

Die README beschreibt alle drei Schichten, jede Umgebungsvariable mit Pflicht/optional, Default und Beispiel, sowie die Reihenfolge der Überlagerung. Das ist Teil der Abnahme.

## Consequences
### Positive
- Fast jede Konfigurationsänderung ist eine Code-Änderung und läuft über den normalen Deploy-Pfad. Der Gang zum Server entfällt im Regelfall.
- Der Assistent kann die Defaults bearbeiten, ohne ein Geheimnis oder den Standort zu berühren; die Ansage-Regel beschränkt sich auf Schicht 2 und 3.
- Eine Feature-Aktivierung (ElevenLabs, FlightAware) ist ein Handgriff in der ZimaOS-Oberfläche: Variablen setzen, Container neu starten.
- Ein Fremder kann das Projekt mit zwei Variablen (Standort) starten.

### Negative
- Ein Umbau des Config-Loaders und der Compose-Dateien; eine einmalige Migration der bestehenden Prod-Config in Umgebungsvariablen.
- Zwei Quellen für Werte (Datei und Umgebung) sind beim Debuggen weniger offensichtlich. Der Dienst loggt beim Start, welche Werte aus Umgebung und Override stammen (ohne Secrets).
- Umgebungsvariablen sind Strings; Typen (Zahl, Boolean, Liste) müssen geparst und validiert werden.

### Neutral
- `config.example.yaml` entfällt oder wird zum Beispiel für die Override-Datei.
- Der Mock-Modus (`mode`, `scenario`) bleibt ein Schalter der Repo-Config bzw. Override-Datei; Tests setzen ihn wie bisher.

## Alternatives considered
- **Alles bleibt in einer nicht eingecheckten Datei** (Status quo): Jede Änderung muss der Betreiber doppelt nachziehen; der Assistent kommt an Prod nicht heran.
- **Alles über Umgebungsvariablen, keine Datei:** Bei über 60 Schlüsseln (Plausibilitätsschwellen, Polygone gesperrter Lufträume) unlesbar und in der ZimaOS-Oberfläche kaum pflegbar.
- **Schlüssel aktiviert das Feature** (ElevenLabs-Key gesetzt, also ElevenLabs an): Bequemer, aber bei FlightAware hängt echtes Geld dran; der Betreiber will einen Schlüssel hinterlegen können, ohne sofort zu bezahlen.
- **Prod-Config mit Standort ins Repo:** Würde den Wohnort veröffentlichen.

## References
- ADR 0007 (validierte YAML-Konfiguration, Secrets nur in Umgebungsvariablen)
- ADR 0025 (ZimaOS-Compose-Datei, Umgebungsvariablen in der Oberfläche)
- Brainstorm-Session 2026-10-31
