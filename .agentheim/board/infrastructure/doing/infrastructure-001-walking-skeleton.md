---
id: infrastructure-001-walking-skeleton
title: Walking skeleton — echte Flugzeuge über dem Haus erscheinen auf dem iPad, Tippen spricht eine Zeile, eine Sichtung wird gespeichert
status: doing
type: spike
context: infrastructure
created: 2026-10-26
completed:
depends_on: [design-system-001, infrastructure-pn3w4, infrastructure-y8epz, airspace-jy8hz, airspace-h76v2, weather-yttgx, sky-scene-xczgm, infrastructure-w7qbc, infrastructure-p6s30]
blocks: []
tags: [foundation, walking-skeleton, prototype]
related_adrs: [0001, 0002, 0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0011, 0012]
related_research: []
prior_art: [design-system-001, design-system-c4v3r, design-system-v8q3n, design-system-q7m3k]
---

## Why
Der erste Prototyp soll beweisen, dass die gewählte Architektur von Ende zu Ende trägt:
- Server und Datenquelle laufen.
- Auswahl, iPad-Darstellung, Sprachausgabe und Speicher funktionieren.

Er ist **fachlich dünn, architektonisch dick**: wenig Feature, aber jeder Weg einmal durchlaufen. Erst danach lohnen Styleguide und echte Features. Außerdem beantwortet er die beiden größten offenen Fragen mit echten Daten: Klappt die Sprachausgabe auf dem iPad? Wie oft kennen kostenlose Quellen die Route?

## What
Der dünnste lauffähige Durchstich durch alle Bereiche, gemäß den akzeptierten Foundation-ADRs:
- **Luftraum:** echte Flugzeuge im Umkreis, Auswahl der zwei nächsten, minimale Typklassen-Tabelle.
- **Lackierungen:** nur die weiße Standard-Lackierung.
- **Wetter:** fester Platzhalter-Himmel.
- **Himmelsszene:** zeigt die Auswahl an, Tippen spricht eine Zeile, die Vorlese-Sperre greift.
- **Sichtungsprotokoll:** schreibt Sichtungen dauerhaft.
- **Infrastruktur:** Deployment auf dem Heimserver (Lenovo ThinkCentre mit ZimaOS). Das iPad öffnet die Seite vorerst manuell.
- **Oberfläche:** ausschließlich aus den abgenommenen Storybook-Komponenten (`design-system-001-styleguide`). Fehlt ein Baustein, entsteht er zuerst als Story (ADR 0002).

## Refinement (2026-10-27, Betreiber-Entscheidung)
Der Skeleton wird in der Cloud-Umgebung gebaut; dort gibt es keinen Heimserver, kein iPad und keinen echten Standort. Deshalb:
- **In diesem Task:** alles, was ohne Gerät prüfbar ist — Dienst, Client aus den abgenommenen Storybook-Komponenten, Adapter mit Contract-Tests, SQLite-Sichtungen, Mock-Modus mit Szenarien und steuerbarer Zeit, E2E-Szenarien, `docker-compose.yml`, `config.example.yaml`, README-Doku. Zusätzlich ein kurzer **Live-Smoke-Check** gegen adsb.lol (aus der Cloud erreichbar) mit Beispielkoordinaten, um Contract-Fixtures aus echten Antworten aufzunehmen.
- **Ausgelagert in `infrastructure-d3v7k`** (Geräteabnahme durch den Betreiber): Start auf ZimaOS mit echtem Standort, Gegenprüfung mit öffentlichem Tracker, Sprachausgabe auf dem echten iPad, Routen-Stichprobe über eine Stunde und die Befunde (a)–(c).
- Die mit **[→ infrastructure-d3v7k]** markierten Kriterien unten gelten für diesen Task als erfüllt, wenn der jeweilige Pfad im Mock-Modus/E2E nachgewiesen und die Geräte-Prüfung in `infrastructure-d3v7k` beschrieben ist.
- Umgebung: Playwright hier nur Chromium (WebKit-Projekt konfigurieren, auf dem Betreiber-Rechner nachholen). Docker-CLI vorhanden; ob ein Daemon läuft, ist offen — `docker compose config` als Mindestprüfung.
- Sprachausgabe: Piper-Container ist hier ggf. nicht startbar; der `fake`-Adapter (ADR 0012) deckt Mock/E2E ab, der `piper`-Adapter bekommt Contract-Tests gegen aufgezeichnete/konstruierte Fixtures.

## Acceptance criteria
- [ ] [→ infrastructure-d3v7k] Mit `config.yaml` auf dem echten Standort und dem Default-Radius 30 km startet der Dienst auf dem Heimserver (z. B. `docker compose up`). `/healthz` meldet OK, und das iPad zeigt die Szene unter der LAN-URL des Servers.
- [ ] [→ infrastructure-d3v7k für die Gegenprüfung mit echten Daten] Innerhalb von 60 s nach dem Laden erscheinen die Flugzeuge, die real im Umkreis sind (gegengeprüft mit einem öffentlichen Tracker):
  - als korrekte Typklassen-Silhouette in weißer Standard-Lackierung,
  - höchstens 2, und zwar die 2 nächsten,
  - mit Callsign, Typ und Höhe in der Info-Leiste.
  Ohne Flugzeug im Umkreis zeigt die Szene den leeren Himmel bzw. „Zuletzt: … vor N Min“.
- [ ] Die Auswahl aktualisiert sich alle 30 s. Fällt die primäre Flugdatenquelle oder das Netz aus, bleibt die letzte gute Szene mit Stale-Markierung stehen. Sobald die Quelle zurück ist, erholt sich die Szene von selbst.
- [ ] Tippen auf ein Flugzeug oder seinen Text spricht eine deutsche Zeile (Airline oder Callsign, Typ, Höhe) über den Lautsprecher des iPads. Die Zeile ist auf dem echten alten iPad verständlich. [human-eye] [→ infrastructure-d3v7k]
- [ ] Während diese Ausgabe läuft, ändert sich die Auswahl nicht, auch wenn ein Takt andere Flugzeuge liefert. Die neuere Auswahl erscheint beim ersten Takt nach Ende der Ausgabe. Eine hängende Wiedergabe wird vom Watchdog freigegeben.
- [ ] Jeder unterschiedliche Flug im Umkreis schreibt genau eine Zeile in die Sichtungs-Tabelle: Zeit, Airline/Callsign, Typ, Typklasse, Lackierung vorhanden ja/nein. Wiederholte Takte desselben Flugs ändern die Anzahl nicht. Die Zeilen überleben einen Neustart des Dienstes.
- [ ] Der Himmel ist ein fester Platzhalter (z. B. „Tag/Klar“), per Konfiguration austauschbar. Der echte Wetter-Himmel ist ein Folge-Task.
- [ ] **Test-getrieben (ADR 0003):**
  - Die Domänenlogik wurde test-first entwickelt: Auswahl der zwei nächsten, Vorlese-Sperre, Typklassen-Zuordnung, Sichtungs-Deduplizierung. Die Unit-Tests laufen offline mit einem Befehl.
  - Jeder Adapter (Flugdaten, Route, TTS) hat Contract-Tests gegen aufgezeichnete Fixtures, einschließlich Fehlerfällen (403/429/Timeout, fehlende Felder).
- [ ] **E2E mit Playwright (WebKit)** gegen den echten Dienst im Mock-Modus, mit gemockten externen APIs. Mindestens diese Szenarien sind grün:
  - leerer Himmel
  - ein Flugzeug
  - zwei Flugzeuge, die zwei nächsten werden gewählt
  - Wechsel während des Vorlesens wird zurückgehalten
  - Ausfall der Quelle, dann Erholung

  Die Zeit ist in den Tests steuerbar, sodass ein 30-s-Takt in Millisekunden läuft. `npm test` und `npm run e2e` (oder Äquivalente) sind im BC-README dokumentiert.
- [ ] [→ infrastructure-d3v7k] Die Befunde sind im Outcome festgehalten:
  - (a) genutztes iPad-Modell (iPad Pro 12,9" 1. Gen. oder das kleinere iPad), iPadOS- und Safari-Version, Bestätigung der Mindestgrenze Safari 16.
  - (b) Funktioniert deutsche Sprachausgabe auf dem echten iPad über Server-Audio, über `speechSynthesis`, beides oder keins?
  - (c) Welcher Anteil der beobachteten Callsigns bekam in einer Stunde Stichprobe eine brauchbare Route?

## Notes
- **Stop-loss:** Wenn mitten im Spike klar ist, dass die Abhilfe für ein Problem bereits bekannt und billig ist, wird sie festgehalten und der Spike an dieser Stelle beendet. Die verbleibenden Punkte werden als Folge-Tasks erfasst statt im Spike ausgebaut. Ziel ist der Nachweis, nicht Vollständigkeit.
- Hängt von allen Foundation-Entscheidungen ab:
  - global: Runtime/Stack `infrastructure-pn3w4`, Persistenz/Konfiguration `infrastructure-y8epz`, Deployment/Kiosk `infrastructure-w7qbc`, Observability `infrastructure-p6s30`
  - BC-lokal: Flug-/Routenquellen `airspace-jy8hz`, Typklassen-Tabellen `airspace-h76v2`, Wetter/Sonne `weather-yttgx`, Sprachausgabe `sky-scene-xczgm`
  - Nicht alle davon sind tragend für den Skeleton (Wetter: Stretch; Observability: folgt direkt danach). Sie sind trotzdem vorher zu entscheiden, damit die Grundlage vollständig ist.
- Die Oberfläche wird aus den Storybook-Komponenten von `design-system-001-styleguide` zusammengesetzt, nicht neu gebaut (ADR 0002).
- Assets wiederverwenden: `svg/*.svg` (Typklassen, Himmel, Logos) und die CSS-Variablen-Technik aus `Flugzeugmodelle.html`.

## Verifier note (iteration 1)
**REASONS:**
- Check 5 (README_DELTA sync): the "Ubiquitous language" op appends a second **Mock-Modus** definition although the infrastructure README already has one (line 20: "- **Mock-Modus** — Startmodus des Dienstes, in dem Flug-, Routen-, Wetter- und TTS-Adapter durch Szenario-Dateien gespeist werden (ADR 0003/0004)."). applyReadmeDelta's append only skips exact duplicates, so two disagreeing bullets would result. Must be a `replace` with anchor `Mock-Modus`, `expected` = the current bullet, merged body.
- Checks 1–4 passed (npm test 187, typecheck, build, build-storybook, Playwright chromium 10/10, `docker compose config` both profiles; ADR 0002 respected; no `.agentheim/` writes).
- Not formally judged (stopped at check 5), but unrecorded ADR departures noticed — fix or record now: (a) ADR 0007 `sightings` has an "Auswahl slot" column — the migration (src/server/migrations/0001-sightings.ts) has none; (b) ADR 0007 puts the route cache in tables of the same file — route-service.ts keeps it in memory only, justified by adsbdb which is not used; (c) ADR 0008 asks for an optional `storybook` Compose profile — missing; mentioned in the Outcome but not in ADR 0013's scope cuts.
- Not blocking: sighting-log ("Besuch"/visitGap) and design-system ("Stale-Hinweis") terms can't go via this task's README_DELTA; the conductor carries them over.
**SUGGESTED_FIX:** Replace the Mock-Modus append with a `replace` merging both definitions. Then either fix the three ADR departures (Auswahl slot column, persisted route cache, storybook profile) or list them as explicit scope cuts in ADR 0013.
**ITERATION_HINT:** likely-fixable
