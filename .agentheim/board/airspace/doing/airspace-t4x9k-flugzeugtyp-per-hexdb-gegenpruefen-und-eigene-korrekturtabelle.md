---
id: airspace-t4x9k
title: Flugzeugtyp je Hex bei hexdb gegenprüfen (nur im Speicher gecacht) und eine eigene Korrekturtabelle Hex → Typ als Vorrang, damit falsche Typcodes der Flugquelle (OE-FML DA42 als C525) nicht als falsche Silhouette erscheinen
status: doing
type: feature
context: airspace
created: 2026-10-28
completed:
depends_on: []
blocks: []
tags: [typeclass, hexdb, aircraft-type, data-quality]
related_adrs: [0010, 0016]
related_research: [free-flight-weather-tts-apis-2026-10-26]
prior_art: [airspace-h76v2, airspace-w3k8d]
---

## Why
Live auf dem Heimserver am 2026-10-28 um 13:35 Uhr: OE-FML (Hex `4400fe`) ist eine Diamond DA42 NG Twin Star, wurde aber als Business Jet gezeigt. Die Flugquelle (adsb.fi/adsb.lol, die den Typ aus ihrer gemeinsamen Flugzeugdatenbank anreichern) lieferte `type_code: C525` (Cessna CitationJet). Die Typtabelle hat das korrekt als `business-jet` eingeordnet. `DA42` steht dort richtig als `light-aircraft`. hexdb liefert für `4400FE` richtig `ICAOTypeCode: DA42`, „Twin Star DA42 NG“. Für Mona ist die Silhouette der Kern der Anzeige, ein falscher Typ ist also ein sichtbarer Fehler.

## What
Der Typcode eines Flugzeugs wird in dieser Reihenfolge bestimmt (Entscheidung des Betreibers 2026-10-28, Varianten A+B):
1. **Eigene Korrekturtabelle** `src/server/modules/airspace/tables/type-overrides.json`: Hex (6 Zeichen, klein) → ICAO-Typcode, von Hand gepflegt, beim Start validiert wie die anderen Tabellen (ADR 0010, `loadTables`). Erster Eintrag: `"4400fe": "DA42"`. Hat ein Hex einen Eintrag, wird hexdb nicht gefragt.
2. **hexdb-Gegenprüfung**: Für jedes Hex ohne Override einmal `GET https://hexdb.io/api/v1/aircraft/<hex>` abfragen. Liefert hexdb einen `ICAOTypeCode`, der von dem der Flugquelle abweicht, gewinnt hexdb.
3. **Flugquelle** wie bisher, wenn weder Override noch hexdb-Typ vorhanden sind.

Der korrigierte Typcode läuft danach durch die unveränderte `resolveTypeClass` (Typtabelle, Emitter-Fallback).

Rahmenbedingungen:
- **Lizenz wie ADR 0016:** hexdb-Ergebnisse liegen nur in einem In-Memory-Cache (TTL in Stunden, z. B. 24 h, mit begrenzter Größe) und werden nie in SQLite gespeichert. Die Sichtung speichert weiter den `type_code` **der Flugquelle** und die tatsächlich angezeigte `typklasse` (unsere eigene Ableitung). Dazu kommt eine neue Spalte `type_source` (`flight` | `override` | `hexdb`), per neuer nummerierter Migration. Ein Typcode von hexdb landet also nie in der Datenbank. Ob die angezeigte `typklasse` als eigene Ableitung gespeichert werden darf, hält eine ADR fest, die ADR 0016 ergänzt.
- **Kein negatives Caching bei Nichterreichbarkeit** (wie ADR 0016): 404/unbekannt darf gecacht werden, Timeout, Netzfehler und 429 nicht. 429 löst denselben hexdb-Backoff aus wie bei den Routen (`sources.route.hexdb.backoffMinutes`), der Host ist derselbe. Timeout: `sources.route.hexdb.timeoutMs` oder ein eigener Wert unter `sources.aircraftType` (der Worker entscheidet und dokumentiert das).
- **Kein Flackern:** Die Abfrage läuft im Takt, bevor die Auswahl angezeigt wird, mit Timeout. Antwortet hexdb nicht rechtzeitig, gilt der Typ der Flugquelle, und im nächsten Takt wird erneut versucht. Wechselt die Typklasse eines schon angezeigten Flugzeugs nachträglich, ist das erlaubt (ein seltener Fall) und wird geloggt.
- **Abschaltbar** per Config (`sources.aircraftType.hexdb.enabled`, Default `true`). Im Mock-Modus wird hexdb nicht gefragt, für Tests gibt es einen Fake-Port.
- **Beobachtbarkeit:** eine Logzeile `aircraft type corrected` mit `hex`, `flightType`, `correctedType`, `source`. In der Lackierungs- oder einer neuen Typ-Statistik (Worker entscheidet: `stats:types` oder Erweiterung von `stats:liveries`) erscheint die Zahl der Sichtungen je `type_source` plus die Liste der Hex-Codes mit `override`/`hexdb`, damit der Betreiber sieht, wie oft das vorkommt.
- README (Root, Abschnitt Quellen) nennt hexdb zusätzlich als Typquelle (keine Speicherung) und beschreibt die Korrekturtabelle.

## Acceptance criteria
- [ ] Mit dem Override `4400fe → DA42` und einem Flugquellen-Typ `C525` ergibt die Auflösung `typklasse: light-aircraft`, `type_source: override`, und hexdb wird nicht gefragt (Unit-Test mit Fake-Port, Aufrufzähler 0).
- [ ] Ohne Override und mit hexdb-Antwort `DA42` bei Flugquellen-Typ `C525` gilt `light-aircraft` mit `type_source: hexdb`. Bei gleichem Typ gilt `type_source: flight` (Unit-Tests).
- [ ] hexdb wird je Hex höchstens einmal pro Cache-TTL gefragt (Test über mehrere Takte). Ein 404 wird gecacht, Timeout, Netzfehler und 429 nicht. Ein 429 setzt den hexdb-Backoff (Tests).
- [ ] Antwortet hexdb nicht innerhalb des Timeouts, wird mit dem Typ der Flugquelle angezeigt, und der Takt wird nicht verzögert (Test mit Fake-Clock bzw. hängendem Fake).
- [ ] Die Migration fügt `sightings.type_source` hinzu, und der gespeicherte `type_code` bleibt der der Flugquelle. Ein Test stellt sicher, dass kein Wert aus hexdb in `type_code` oder einer anderen Spalte landet.
- [ ] `type-overrides.json` wird beim Start validiert (Hex-Format, Typcode muss in `type-classes.json` stehen). Ein Fehler listet alle Probleme auf (Test).
- [ ] Die Logzeile `aircraft type corrected` erscheint bei jeder Korrektur (Test). Die Statistik zeigt die Zählung je `type_source` (Test).
- [ ] `sources.aircraftType.hexdb.enabled: false` schaltet die Gegenprüfung ab (Test). Im Mock-Modus wird hexdb nicht gefragt.
- [ ] Eine ADR (ergänzt ADR 0016 und ADR 0010) hält die Reihenfolge override > hexdb > Flugquelle fest, außerdem die Lizenzgrenze (nur im Speicher, gespeichert wird nur `type_source` und die eigene `typklasse`) und die Frage, ob die abgeleitete `typklasse` gespeichert werden darf.
- [ ] README nennt hexdb als Typquelle und die Korrekturtabelle.
- [ ] Auf dem Heimserver zeigt OE-FML beim nächsten Überflug die Kleinflugzeug-Silhouette. [human-eye]

## Notes
- Entstanden am 2026-10-28 aus der Live-Beobachtung des Betreibers. hexdb-Abfrage zur Kontrolle (kostenlos, ein Aufruf): `{"ModeS":"4400FE","Registration":"OE-FML","Manufacturer":"Diamond Aircraft","ICAOTypeCode":"DA42","Type":"Twin Star DA42 NG"}`.
- Bestehender Adapter für die hexdb-Routen: `src/server/modules/airspace/adapters/hexdb-route-source.ts` (HTTP-Helfer in `adapters/http.ts`). Typauflösung: `resolveTypeClass` in `src/server/modules/airspace/typeclass.ts`, aufgerufen in `src/server/modules/sky-scene/sky-service.ts:74`.
- Nicht Teil dieser Task: Plausibilitätsprüfung von Typ gegen Geschwindigkeit und Höhe (Variante C, verworfen) und FlightAware als Typquelle (kostenpflichtig).
