---
id: infrastructure-001-walking-skeleton
title: Walking skeleton — echte Flugzeuge über dem Haus erscheinen auf dem iPad, Tippen spricht eine Zeile, eine Sichtung wird gespeichert
status: todo
type: spike
context: infrastructure
created: 2026-10-26
completed:
depends_on: [design-system-001-styleguide, infrastructure-pn3w4, infrastructure-y8epz, airspace-jy8hz, airspace-h76v2, weather-yttgx, sky-scene-xczgm, infrastructure-w7qbc, infrastructure-p6s30]
blocks: []
tags: [foundation, walking-skeleton, prototype]
related_adrs: [0001, 0002]
related_research: []
prior_art: []
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

## Acceptance criteria
- [ ] Mit `config.yaml` auf dem echten Standort und dem Default-Radius 30 km startet der Dienst auf dem Heimserver (z. B. `docker compose up`). `/healthz` meldet OK, und das iPad zeigt die Szene unter der LAN-URL des Servers.
- [ ] Innerhalb von 60 s nach dem Laden erscheinen die Flugzeuge, die real im Umkreis sind (gegengeprüft mit einem öffentlichen Tracker):
  - als korrekte Typklassen-Silhouette in weißer Standard-Lackierung,
  - höchstens 2, und zwar die 2 nächsten,
  - mit Callsign, Typ und Höhe in der Info-Leiste.
  Ohne Flugzeug im Umkreis zeigt die Szene den leeren Himmel bzw. „Zuletzt: … vor N Min“.
- [ ] Die Auswahl aktualisiert sich alle 30 s. Fällt die primäre Flugdatenquelle oder das Netz aus, bleibt die letzte gute Szene mit Stale-Markierung stehen. Sobald die Quelle zurück ist, erholt sich die Szene von selbst.
- [ ] Tippen auf ein Flugzeug oder seinen Text spricht eine deutsche Zeile (Airline oder Callsign, Typ, Höhe) über den Lautsprecher des iPads. Die Zeile ist auf dem echten alten iPad verständlich. [human-eye]
- [ ] Während diese Ausgabe läuft, ändert sich die Auswahl nicht, auch wenn ein Takt andere Flugzeuge liefert. Die neuere Auswahl erscheint beim ersten Takt nach Ende der Ausgabe. Eine hängende Wiedergabe wird vom Watchdog freigegeben.
- [ ] Jeder unterschiedliche Flug im Umkreis schreibt genau eine Zeile in die Sichtungs-Tabelle: Zeit, Airline/Callsign, Typ, Typklasse, Lackierung vorhanden ja/nein. Wiederholte Takte desselben Flugs ändern die Anzahl nicht. Die Zeilen überleben einen Neustart des Dienstes.
- [ ] Der Himmel ist ein fester Platzhalter (z. B. „Tag/Klar“), per Konfiguration austauschbar. Der echte Wetter-Himmel ist ein Folge-Task.
- [ ] Die Befunde sind im Outcome festgehalten:
  - (a) iPad-Modell, iOS- und Safari-Version und das daraus festgelegte JS-Target.
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
