---
id: airspace-fehby
title: Keine Route für Kleinflugzeuge, deren Callsign die Registrierung ist (D-Exxx u. ä.)
status: done
type: feature
context: airspace
created: 2026-10-30
completed:
depends_on: []
blocks: []
tags: [kleinflugzeug, route, plausibilitaet]
related_adrs: []
related_research: []
prior_art: []
---

## Why
Für Kleinflugzeuge, die als Callsign nur ihre Registrierung senden, liefert adsbdb manchmal eine alte, zufällige Route aus einem früheren Flug. Beispiel DEBEC (D-EBEC, DV20): adsbdb sagt Gelnhausen → Limburg an der Lahn, tatsächlich fliegt die Maschine Platzrunden und Rundflüge ab Flugplatz Elz. Die Plausibilitätsprüfung nimmt die Route an, weil der Flieger zufällig auf der Linie liegt. Bei solchen Flügen gibt es ohnehin kaum echte Routen.

## What
Regel „Kennzeichen-Callsign“ (Betreiber-Entscheidung 2026-11-01):
- Ein Flug hat ein Kennzeichen-Callsign, wenn das Callsign (getrimmt, groß, ohne Bindestrich) gleich dem gemeldeten Kennzeichen ohne Bindestrich ist, z. B. `DEBEC` = `D-EBEC`, `N123AB` = `N123AB`.
- Fehlt das gemeldete Kennzeichen, greift als Ersatz das deutsche Muster `^D[A-Z]{4}$` (z. B. `DEBEC`, `DMABC`).
- Für solche Flüge wird **keine Routenquelle gefragt** (weder hexdb, adsbdb, VRS noch FlightAware), es wird nichts in `route_lookups` geschrieben und kein Budget verbraucht. Angezeigt wird der reguläre Zustand „Route unbekannt“; der Routen-Satzbaustein entfällt.
- Airline-Callsigns (`^[A-Z]{3}[0-9]`, z. B. `DLH4AB`) sind nie betroffen.

## Acceptance criteria
- [ ] Callsign `DEBEC` mit Kennzeichen `D-EBEC` → keine Routenquelle wird gefragt (Fake-Quellen zählen 0 Aufrufe), Route `null`, kein Eintrag in `route_lookups` (Test).
- [ ] Callsign `DEBEC` ohne gemeldetes Kennzeichen → ebenfalls keine Abfrage (Ersatzmuster) (Test).
- [ ] Callsign `N123AB` mit Kennzeichen `N123AB` → keine Abfrage; Callsign `N123AB` ohne Kennzeichen → normale Abfrage (Ersatzmuster gilt nur für D + 4 Buchstaben) (Test).
- [ ] Airline-Callsigns wie `DLH4AB` und `EWG1234` werden wie bisher abgefragt, auch wenn ein Kennzeichen gemeldet ist (Test).
- [ ] Der Steckbrief eines Kennzeichen-Flugs enthält keinen Routen-Baustein; die Info-Leiste zeigt „Route unbekannt“ (Test über den Szenenzustand: `route` ist `null`).
- [ ] airspace-README beschreibt die Regel „Kennzeichen-Callsign“.

## Notes
- Captured 2026-10-30 via quick-capture, verfeinert 2026-11-01. Kein eigener Text wie „Rundflug“, bewusst „Route unbekannt“.
- Einstieg: `RouteService.lookupFor(callsign, position, ctx)` in `src/server/modules/airspace/route-service.ts`; der Aufruf kommt aus `sky-service.ts` (~Zeile 77). Das Kennzeichen steht am Flugzeug als `a.registration` (adsb.lol `r`). Die Regel gehört nach airspace (eine reine Funktion, z. B. `isRegistrationCallsign(callsign, registration)`), sky-service fragt sie vor `lookupFor` ab oder `lookupFor` bekommt das Kennzeichen im `ctx`.
- Schwestertask airspace-rrazj (Vereinsflieger-Tabelle) ist unabhängig.
- Reale config.yaml anpassen: nein.

## Verifier note (iteration 1)

**REASONS:**
- Criterion 5 ("Der Steckbrief eines Kennzeichen-Flugs enthält keinen Routen-Baustein; die Info-Leiste zeigt „Route unbekannt“ (Test über den Szenenzustand: `route` ist `null`)") has no test. The diff adds tests only in tests/unit/server/registration-callsign.test.ts, and they exercise only `isRegistrationCallsign` and `RouteService.lookupFor` directly. No test runs through `SkyService` or checks the scene plane's `route`. tests/unit/server/sky-service.test.ts is not touched.
- Because of that, the production change in src/server/modules/sky-scene/sky-service.ts:77 (passing `registration: a.registration` into the `lookupFor` ctx) is not covered by any test. If that change were reverted, every new test would still pass. A non-German registration callsign such as N123AB/N123AB would then be looked up again at scene level, which is the regression criterion 3 is meant to prevent end-to-end.
- Minor, not blocking on its own: the "kein Eintrag in `route_lookups`" part of criterion 1 is shown only indirectly, through `lookupFor` returning `null` (no attempts). No assertion checks attempts or recording, and a scene-level test would cover this as well.

**SUGGESTED_FIX:** Add a SkyService-level test (e.g. in tests/unit/server/sky-service.test.ts) with an aircraft whose callsign is its registration (DEBEC/D-EBEC, and N123AB/N123AB to exercise the passed-through registration). It should assert that the scene plane's `route` is `null`, that the fake route sources were called 0 times, and that no route attempts/lookups were recorded.

**ITERATION_HINT:** likely-fixable

## Outcome

Regel "Kennzeichen-Callsign" umgesetzt: reine Funktion isRegistrationCallsign in airspace/registration-callsign.ts, RouteService.lookupFor bricht frueh mit null ab (ctx.registration, von sky-service durchgereicht). Tests: registration-callsign.test.ts (Funktion + lookupFor) und, nach Verifier-Hinweis, ein SkyService-Block in sky-service.test.ts (DEBEC/D-EBEC und N123AB/N123AB: Szenen-route null, Fake-Quelle 0 Aufrufe; Airline-Callsign wird weiter abgefragt). Volle Suite und Typecheck gruen.
