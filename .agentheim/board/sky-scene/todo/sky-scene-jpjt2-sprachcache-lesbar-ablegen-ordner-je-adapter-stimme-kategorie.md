---
id: sky-scene-jpjt2
title: Sprachcache lesbar ablegen — Ordner je Adapter/Stimme/Kategorie, sprechender Dateiname mit Text-Hash-Suffix; Steckbrief wird nicht mehr als Datei gespeichert
status: todo
type: refactor
context: sky-scene
created: 2026-10-31
completed:
depends_on: []
blocks: []
tags: [speech, cache, audio, follow-up]
related_adrs: [0028, 0012, 0027]
related_research: []
prior_art: [sky-scene-b7w2n, sky-scene-t6h2p, sky-scene-d4n9p]
---

## Why
Alle WAVs liegen flach in `data/audio/<24-hex-hash>.wav` (Hash über `adapter\0voice\0text`, `audio-service.ts`). Auf der Platte ist nicht erkennbar, welcher Baustein in welcher Datei steckt: nicht, von welchem Adapter oder welcher Stimme, nicht, ob Typ/Airline, Route, Höhe oder Flugphase. Der Betreiber will den Cache durchsehen, einzelne Bausteine anhören und gezielt löschen können (z. B. nach einer Formulierungsänderung wie dem Boeing-Fix sky-scene-d4n9p).

## What
Der Sprachcache (README: „Sprachcache“) wird nach Fakten statt nach reinem Text-Hash abgelegt:

```
data/audio/<adapter>/<stimme>/<kategorie>/<schluessel>-<texthash>.wav
```

- `<adapter>`: `synth.name` (`elevenlabs`, `piper`, `fake`); `<stimme>`: die Stimme (als Datei-Slug).
- Kategorien und Schlüssel:
  - `typ-airline/<Typcode>_<Airline-ICAO>` — z. B. `A320_DLH`; ohne Airline `A320`; ohne Typ `Flugzeug` bzw. `Flugzeug_DLH`.
  - `route/<Von>-<Nach>` — IATA-Code, Fallback ICAO-Code wenn kein IATA vorhanden; z. B. `FRA-IST`, `EDFE-EDDK`. Nur Start und Ziel (wie der gesprochene Baustein).
  - `hoehe/<Meter>` — gerundete Höhe, z. B. `3500`.
  - `phase/steigflug` bzw. `phase/sinkflug`.
- `<texthash>`: kurzer Hash (6 Hex) über den gesprochenen Bausteintext. Ändert sich die Formulierung, entsteht ein neuer Dateiname; alte Dateien werden nie fälschlich weiter abgespielt. Keine Versionsnummer.
- Dafür liefert `composeSpeechParts` (`steckbrief.ts`) Bausteine als Objekte `{ kategorie, schluessel, text }` statt reiner Strings; `SpeechFacts` bekommt die Codes (Typcode, Airline-ICAO/Prefix, Flughafen-IATA/ICAO) zusätzlich zu den gesprochenen Namen. Schlüssel werden slugifiziert (nur `[A-Za-z0-9_-]`).
- Der zusammengesetzte Steckbrief (Verkettung mit `partGapMs` Stille, ADR 0028) wird **nicht mehr als Datei gespeichert**, sondern bei jedem `GET /audio/<key>.wav` aus den Bausteinen zusammengefügt (`concatWav` ist billig). Die Dauer wird aus dem gefügten Puffer berechnet wie bisher.
- Nach außen bleibt die URL `/audio/<key>.wav` ein Hash (ADR 0012: der Client kennt den Adapter nicht). Der Key ist weiterhin der zusammengesetzte Key über (Adapter, Stimme, Bausteintexte); die `entries`-Map bildet ihn auf die Bausteine ab.
- Fallback-Trennung (ADR 0027/0028) bleibt: Fallback-Bausteine liegen unter `<fallback-adapter>/<fallback-stimme>/…`, nie unter dem Primär-Ordner. Bausteine beider Adapter werden nie gemischt.
- Migration (lazy, ohne Credits): Der alte Dateiname ist `hash(adapter\0voice\0text)` (24 Hex). Beim ersten Bedarf eines Bausteins berechnet der AudioService neben dem neuen Pfad auch den alten flachen Key; existiert `data/audio/<alterKey>.wav`, wird die Datei an den neuen Pfad **verschoben** (`fs.renameSync`) statt neu gerendert. So wandern alle noch gebrauchten Bausteine beim ersten Abruf von selbst ins neue Layout. Alte zusammengefügte Steckbrief-Dateien werden nicht mehr gebraucht; was nach einer Einlaufphase noch flach in `data/audio/` liegt, löscht der Betreiber von Hand (README-Hinweis). Kein Migrationsskript.

Entscheidungen des Betreibers (2026-10-31): Hash-Suffix statt Versionsnummer; Steckbrief zusammenbauen statt speichern; IATA vor ICAO; bestehende Bausteine per Lazy-Migration wiederverwenden.

## Acceptance criteria
- [ ] `composeSpeechParts` liefert Bausteine mit `kategorie`, `schluessel` und `text`; die Reihenfolge und der Text der Bausteine bleiben gegenüber heute unverändert (bestehende Tests in `tests/unit` für den gesprochenen Text bleiben grün).
- [ ] Ein Baustein „Das ist ein Airbus A320 der Lufthansa.“ landet unter `data/audio/<adapter>/<stimme>/typ-airline/A320_DLH-<6hex>.wav`; ohne Airline unter `typ-airline/A320-<6hex>.wav`.
- [ ] Route Frankfurt→Istanbul mit IATA-Codes landet unter `route/FRA-IST-<6hex>.wav`; ein Flughafen ohne IATA nutzt den ICAO-Code (`route/EDFE-EDDK-<6hex>.wav`).
- [ ] Höhe 3500 m landet unter `hoehe/3500-<6hex>.wav`, Steig-/Sinkflug unter `phase/steigflug-<6hex>.wav` bzw. `phase/sinkflug-<6hex>.wav`.
- [ ] Ändert sich der Text eines Bausteins bei gleichem Schlüssel, ändert sich das Hash-Suffix; die alte Datei wird nicht mehr gelesen.
- [ ] Nach `GET /audio/<key>.wav` eines mehrteiligen Steckbriefs existiert keine Datei für das gefügte Audio; die Antwort ist die PCM-Verkettung der Bausteine mit `partGapMs` Stille, Dauer wie bisher.
- [ ] Fallback-Bausteine liegen unter dem Ordner des Fallback-Adapters und seiner Stimme; der Primär-Ordner enthält keine Fallback-Datei.
- [ ] Schlüssel enthalten nur `[A-Za-z0-9_-]`; Airline-Namen/Codes mit Sonderzeichen werden slugifiziert.
- [ ] Liegt für einen Baustein noch die alte flache Datei `data/audio/<hash24>.wav` (Hash über Adapter, Stimme, Text wie heute), wird sie beim ersten Bedarf an den neuen Pfad verschoben und nicht neu gerendert; der Budgetzähler bleibt unverändert, die flache Datei existiert danach nicht mehr.
- [ ] Ohne `cacheDir` (Mock/Test) funktioniert der In-Memory-Pfad wie bisher.
- [ ] README (Sprachausgabe-Abschnitt) und BC-README-Eintrag „Sprachcache“ beschreiben das neue Layout und den Migrationshinweis; ADR 0028 wird um die Ablage ergänzt (Amendment, kein neues ADR nötig).

## Notes
- Codes: Typcode kommt aus `types.peek(...)`/`CorrectedType.typeCode`, Airline-ICAO aus `resolveAirline(...).prefix`, Flughafen-Codes aus `RouteInfo`/`Route.legs` (`Airport.iata`, `Airport.icao`, `airspace/model.ts`). `routeParts` in `route-service.ts` liefert heute nur Labels; die Codes müssen bis `composeSpeechParts` durchgereicht werden (z. B. `routeLegs` als `{label, iata, icao}`), ohne das airspace-Modul fachlich zu ändern.
- Zwei Routen mit gleichem gesprochenen Text (IST und SAW heißen beide „Istanbul“) ergeben zwei Dateien mit gleichem Inhalt. Bewusst in Kauf genommen, Codes sind eindeutiger und lesbarer.
- Der `speech synthesized`-Logeintrag (parts/partsRendered) bleibt unverändert.
- Betrifft im Wesentlichen `steckbrief.ts`, `audio-service.ts`, `sky-service.ts` und die Tests `tests/unit/narrator.test.ts`, `tests/unit/server/speech.contract.test.ts`.
