---
id: sky-scene-d4n9p
title: Boeing-Typen ziffernweise aussprechen („Boeing sieben vier sieben“), Airbus bleibt als Zahl („A dreihundertzwanzig“)
status: done
type: bug
context: sky-scene
created: 2026-10-31
completed:
depends_on: [sky-scene-b7w2n]
blocks: []
tags: [speech, steckbrief, aussprache]
related_adrs: [0012, 0028]
related_research: []
prior_art: [sky-scene-b7w2n, sky-scene-xczgm]
---

## Why
`spokenType` in `src/server/modules/sky-scene/steckbrief.ts` wandelt jede Zahl im Typnamen in ein deutsches Zahlwort um. Für Airbus ist das richtig („A dreihundertzwanzig“), für Boeing nicht: Eine 747 heißt im Sprachgebrauch „sieben vier sieben“, nicht „siebenhundertsiebenundvierzig“. Betreiber-Wunsch 31.10.2026.

## What
Im Aussprache-Wörterbuch (`spokenType`) eine Herstellerregel ergänzen: Beginnt der Typname mit „Boeing“, werden die Ziffern der Modellnummer einzeln gesprochen („Boeing sieben vier sieben“, „Boeing sieben drei sieben Max acht“, „Boeing sieben acht sieben“). Alle anderen Hersteller (Airbus, Embraer, ATR, Bombardier, Cessna …) behalten die bisherige Zahlwort-Regel. Nur die dreistellige Modellnummer wird ziffernweise gesprochen. Die Variante nach dem Bindestrich bleibt ein normales Zahlwort: „Boeing 747-10“ → „Boeing sieben vier sieben zehn“, „Boeing 787-9“ → „Boeing sieben acht sieben neun“, „Boeing 737-800“ → „Boeing sieben drei sieben achthundert“. Suffixe wie „MAX“ werden weiter wie heute behandelt.

Die Texte der Typ+Airline-Bausteine ändern sich dadurch für Boeing-Typen; alte Cache-Dateien bleiben liegen (anderer Baustein-Key) und verfallen über das Alter-Pruning.

## Acceptance criteria
- [ ] `spokenType('Boeing 747')` → „Boeing sieben vier sieben“; `spokenType('Boeing 737 MAX 8')` → „Boeing sieben drei sieben Max acht“; `spokenType('Boeing 787-9')` → „Boeing sieben acht sieben neun“; `spokenType('Boeing 747-10')` → „Boeing sieben vier sieben zehn“; `spokenType('Boeing 737-800')` → „Boeing sieben drei sieben achthundert“; `spokenType('Boeing 747-400')` → „Boeing sieben vier sieben vierhundert“.
- [ ] `spokenType('Airbus A320neo')` → „Airbus A dreihundertzwanzig Neo“ (unverändert); `spokenType('Embraer 190')` und `spokenType('ATR 72')` unverändert gegenüber heute (bestehende Tests bleiben grün).
- [ ] Ein Steckbrief für eine Boeing 747 enthält den Typ+Airline-Baustein „Das ist eine Boeing sieben vier sieben der Lufthansa.“ (Artikel „eine“ für Boeing, „ein“ für Airbus; prüfen, wie der Artikel heute gebildet wird, und bei Bedarf eine Hersteller→Artikel-Tabelle ergänzen).
- [ ] README-Delta: Aussprache-Regel im BC-README unter Steckbrief ergänzt.

## Notes
- Betreiber-Entscheidung 31.10.2026: nur Boeing ziffernweise, und nur die Modellnummer; die Variante nach dem Bindestrich als Zahl (747-10 → „sieben vier sieben zehn“). Airbus als Zahl.
- Artikel: „die Boeing“, „der Airbus“. Falls der Baustein heute immer „Das ist ein …“ sagt, ist „Das ist eine Boeing …“ die korrekte Form; der Worker entscheidet per kleiner Tabelle (Airbus → ein, Boeing → eine, Default → ein) und dokumentiert es im Outcome.

## Outcome

`spokenType` in `src/server/modules/sky-scene/steckbrief.ts` speaks the 3-digit Boeing series digit by digit and the variant after the dash as number word; `composeSpeechParts` uses "eine" for Boeing, "ein" otherwise. Tests in `tests/unit/server/steckbrief.test.ts` (old 737-800 expectation updated). npm test and typecheck green.
