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
- **Steckbrief** — sachliche deutsche Ansage zu einem Flugzeug (Airline, Route mit Ländern, Höhe, Geschwindigkeit, Typ + Kategorie, ggf. Besonderheit der Typklasse).
- **Vorlesen** — Ausgabe des Steckbriefs per Sprachausgabe nach Tippen.
- **Vorlese-Sperre** — solange vorgelesen wird, übernimmt die Szene keine neue Auswahl.
- **Info-Leiste** — Textzeile(n) für Erwachsene unten im Bild; eine oder zwei Zeilen mit Nummern-Plakette.
- **Zuletzt** — Hinweis im leeren Himmel auf das zuletzt gesehene Flugzeug („vor N Min“).
- **SpeechSynthesizer** — serverseitiger Port: Text + Stimme rein, Audio (mp3/wav) + Dauer raus. Adapter `piper` (Standard, lokal, kostenlos) und `elevenlabs` (optional, Schlüssel per Umgebungsvariable); Auswahl allein per `config.yaml` (ADR 0012).
- **Narrator** — clientseitiger Abspieler für das Vorlesen: spielt per `<audio>` eine Audio-URL des Servers nach Tippen und meldet das Ende (`ended`) an die Vorlese-Sperre; `speechSynthesis` ist nur ein optionaler Notfall-Adapter (ADR 0012).
- **Sprachcache** — Audio-Cache des Servers, Schlüssel (Adapter, Stimme, Text); Wechsel des Adapters spielt nie veraltetes Audio ab.
- **Narrator** / **Vorlese-Sperre (Umsetzung)** — der Client spielt die Audio-URL nach Tippen per `<audio>`; die Sperre beginnt beim Abspielen, endet bei `ended` oder per Watchdog (auch bei `error`/`stalled`), eine neuere Auswahl wird bis dahin gepuffert (infrastructure-001, ADR 0012).
- **Veraltete Szene (stale)** — serverseitig berechnet, nicht pro Fehlschlag gesetzt: die Szene gilt als veraltet (Kopfzeile "Letzter Stand"), wenn der letzte erfolgreiche Abruf der Flugquelle aelter ist als flightMaxAge (`health.flightMaxAgeSeconds`, Default 3 Takte = 90 s; dieselbe Schwelle wie /healthz-degraded). Die Clientregel (`client.staleAfterMinutes`, 5 min) bleibt separat.
- **Slot** — eine der zwei stabilen Positionen der Szene (Slot 1, Slot 2); die Slot-Nummer ist die Identität in der Szene und die Spalte `slot` im Sichtungslog. Ein freigewordener Slot wird neu besetzt, belegte Slots tauschen nie die Position (ADR 0017).
- **Slot-Haltezeit** — ein Flugzeug behält seinen Slot mindestens `scene.slotHoldTakte` Takte (Default 3), auch wenn ein anderes näher ist; sie endet sofort, wenn es den Radius verlässt oder aus den Flugdaten verschwindet. Danach gilt wieder die Nächste-Regel (horizontale Distanz). Server-seitig; die Vorlese-Sperre (Client) verzögert nur die Anzeige, nicht den Haltezähler (ADR 0017).

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
