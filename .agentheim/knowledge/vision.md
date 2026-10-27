# Vision: PlanesAbove

## Purpose
PlanesAbove ist ein stationäres „Fenster zum Himmel“ im Kinderzimmer: ein altes iPad
(mit einem Heimserver im Hintergrund, einem Lenovo ThinkCentre mit ZimaOS) zeigt in einer illustrierten Himmelsszene, welche
Flugzeuge gerade über unserem Haus fliegen — in ihrer echten Lackierung, vor einem Himmel, der
dem echten Wetter und der echten Tageszeit folgt. Es ist für Mona (4) gebaut, damit sie Flugzeuge
und Airlines entdeckt, wiedererkennt und etwas über sie lernt — und schön genug, dass es auch für
Erwachsene als lebendiges Wandbild taugt. Vorbild ist avioframe.com.

## Users
- **Mona (4, Betrachterin)** — schaut immer wieder beiläufig hin. Kann nicht lesen; Bild und
  Stimme sind ihre Schnittstelle. Tippt auf ein Flugzeug oder dessen Text und bekommt den
  Steckbrief vorgelesen.
- **Erwachsene im Zimmer** — lesen die dezente Info-Leiste (Airline, Flugnummer, Typ, Kennzeichen,
  Route, Höhe, Geschwindigkeit, Flugphase) oder genießen die Szene als Bild.
- **Papa (Betreiber & Kurator)** — stellt Standort und Radius ein, betreibt iPad und Heimserver,
  zeichnet neue Lackierungen und priorisiert diese Arbeit künftig anhand des Sichtungsprotokolls.
  Will das System nicht ständig reparieren müssen.

## The problem
Flugzeuge über dem Haus sind für ein Kind faszinierend, aber flüchtig, weit weg und anonym.
Bestehende Flugtracker (Karten, Radar-Ansichten, Datentabellen) sind für Erwachsene und Spotter
gemacht — für eine Vierjährige unlesbar und unschön. Kommerzielle Rahmen wie avioframe sind nicht
selbst gestaltbar und nicht auf ein eigenes, illustriertes Lackierungs-Set zugeschnitten.

## What success looks like
- **Lebendigkeit:** Tagsüber erscheinen regelmäßig Flugzeuge; keine langen Phasen gähnender Leere
  (Stellhebel: konfigurierbarer Radius, Default ~30 km).
- **Freude & Lernen:** Mona tippt von sich aus, freut sich, lernt Airlines und Flugzeugtypen und
  erkennt sie irgendwann wieder — dafür müssen Lackierungen verlässlich stimmen.
- **Wartungsfrei:** Läuft stabil über Wochen, ohne dass Papa eingreifen muss.
- **Schnell sichtbar:** Ein erster durchgehender Stand hängt früh an der Wand und wird danach
  schrittweise verbessert.

### v1-Verhalten (vereinbart)
- Bis zu **zwei Flugzeuge** gleichzeitig, ausgewählt als die **zwei nächsten** im Umkreis (reiner Bodenabstand); ein Flugzeug behält seinen Slot mindestens N Takte (Default 3) und die Slot-Positionen bleiben stabil (ADR 0017).
- Aktualisierung im **30-Sekunden-Takt** (API-schonend).
- **Vorlese-Sperre:** Während vorgelesen wird, wird nichts getauscht; frühester Wechsel beim
  nächsten Takt nach Ende des Vorlesens.
- **Steckbrief** (Deutsch, sachlich): Airline, Abflug- und Zielort mit Land, Höhe, Geschwindigkeit,
  Flugzeugtyp mit Kategorie, plus typklassen-spezifische Besonderheit (z. B. Doppelstock beim A380).
- **Route unbekannt** ist ein regulärer Zustand, kein Fehler.
- **Kein Flugzeug:** nur Wetter- und Tageslicht-Szene, schmale Leiste „Zuletzt: … vor N Min“.
- **Unbekannte Airline:** weiße Standard-Lackierung, Ansage nennt trotzdem die richtige Airline.
- **Animierte Übergänge** für Flugzeug kommt/geht/wechselt, Wetter- und Tageszeitwechsel.
- **Sichtungsprotokoll** wird still mitgeschrieben (Auswertung erst v2).

### Qualitätsregel
Entwickelt wird test-getrieben: Unit-Tests zuerst, Contract-Tests je externer Quelle gegen aufgezeichnete Fixtures. Dazu kommen End-to-End-Tests mit Playwright (WebKit, wie Safari auf dem iPad) gegen gemockte externe APIs, mit festen Szenarien wie leerer Himmel, zwei Flugzeuge, Wechsel während des Vorlesens und Quellenausfall (ADR 0003).

### Gestaltungsregel
Jedes UI-Element entsteht zuerst in einer eigenen **Storybook-Instanz** nach Atomic Design, wird dort einzeln abgenommen und erst dann in der App verwendet (ADR 0002).

## Non-goals
- **Kein Flugtracker mit Karte** — keine Karte, keine Flugbahnen, kein Radar-Look. Eine illustrierte Szene.
- **Kein Spotter-Werkzeug zuerst** — kindgerecht ist die Untergrenze; Spotter-Details nur dezent.
- **Kein Produkt mit Support** — ein Haushalt, ein Standort, ein Display. Keine Nutzerkonten,
  keine Mandanten, kein App-Store. Teilen höchstens als Self-Hosting für IT-Kundige.
- **Keine Bezahl-APIs, keine Verträge** — nur kostenlose Datenquellen für Flug- und Wetterdaten.
- **Keine Interaktion über das Tippen hinaus** — kein Menü für Mona, kein Spiel, kein Quiz.
  Konfiguration (Radius etc.) nur für den Betreiber.
- **Nicht vollständig** — nie mehr als zwei Flugzeuge; nicht jede Airline hat eine Lackierung.
- **Nicht mehrsprachig** in v1 — nur Deutsch.

### Bewusst verschoben (v2+), keine Non-Goals
- Geschichten-Modus (kindgerechte Erzählung mit Vergleichen statt Zahlen)
- Auswertung des Sichtungsprotokolls (welche Airlines/Typen lohnen neue oder detailliertere Lackierungen)
- Foto-Knopf mit echtem Foto des konkreten Flugzeugs (Spotter-Seiten, Lizenz/Attribution klären)

## Ubiquitous language (seed)
- **Himmelsszene** — das illustrierte Bild auf dem Display: Himmel + bis zu zwei Flugzeuge + Info-Leiste.
- **Himmel** — Hintergrund aus **Tageszeit** × **Wetterlage** (28 Kombinationen).
- **Tageszeit** — Morgendämmerung, Tag, Abenddämmerung, Nacht.
- **Wetterlage** — Klar, Leicht bewölkt, Bedeckt, Nebel, Regen, Schnee, Gewitter.
- **Umkreis / Radius** — Kreis um das Haus, in dem Flugzeuge berücksichtigt werden (konfigurierbar, Default ~30 km).
- **Takt** — der 30-Sekunden-Aktualisierungszyklus.
- **Auswahl** — die (bis zu) zwei nächsten Flugzeuge im Umkreis zu einem Takt.
- **Steckbrief** — die vorgelesene, sachliche Beschreibung eines Flugzeugs.
- **Vorlese-Sperre** — solange vorgelesen wird, ändert sich die Auswahl nicht.
- **Typklasse** — gezeichnete Flugzeug-Silhouette: Narrowbody, Widebody, Jumbo (Hump), Double-Decker,
  Regional-Jet, Turboprop, Business-Jet, Light Aircraft, Glider, Helicopter.
- **Lackierung** — Farbsatz (und ggf. Logo) einer Airline, angewendet auf eine Typklasse.
- **Standard-Lackierung** — weiß, für Airlines ohne eigene Lackierung.
- **Route** — Abflug- → Zielort; kann **unbekannt** sein.
- **Flugphase** — Steigflug, Sinkflug, Horizontalflug.
- **Story** — eine einzeln ansehbare Darstellung eines UI-Bausteins in Storybook.
- **Info-Leiste** — Textleiste für Erwachsene unten im Bild.
- **Übergang** — animierter Wechsel (Flugzeug kommt/geht/wechselt, Wetter, Tageszeit).
- **Sichtung** — protokollierter Eintrag, dass ein Flugzeug (Airline, Typ) im Umkreis war.

## Open questions
- Liefert eine kostenlose Quelle verlässlich genug die **Route** (Abflug/Ziel) zu einem Flug? Kernrisiko für den Steckbrief. (open since 2026-10-26)
  - Research vom 2026-10-26: Kostenlose Routendaten existieren (VRS standing-data CC0, adsb.lol routeset, adsbdb), sind aber aus dem Callsign abgeleitet und daher manchmal falsch. Bei adsbdb ist die Weitergabe eingeschränkt. Wie gut die Abdeckung wirklich ist, misst der Walking Skeleton.
- Welches **iPad** wird genutzt? Zur Wahl stehen ein iPad Pro 12,9" 1. Gen. (iPadOS 16) und ein kleineres iPad mit Homebutton, wahrscheinlich iPad 6. Gen. oder Pro 10,5" (iPadOS 17), Modellnummer noch offen. Beide haben 4:3. Festgelegt ist die Mindestgrenze iPadOS 16 / Safari 16. (open since 2026-10-26)
- Wie klingt eine kindgerechte deutsche **Vorlesestimme** auf dem alten iPad? Die Sprachausgabe ist austauschbar (z. B. Piper ↔ ElevenLabs), welche klingt am besten? (open since 2026-10-26)
- Ist der Default-Radius von 30 km am realen Standort lebendig genug — oder zu voll? Erst mit echten Daten beantwortbar. (open since 2026-10-26)
- Wie wird **Typklasse** und **Kategorie** (Mittel-/Langstrecke) aus dem ICAO-Typcode abgeleitet? (open since 2026-10-26)
- Darf/soll das Display nachts dunkler werden oder ganz ruhen (Kinderzimmer)? (open since 2026-10-26)
