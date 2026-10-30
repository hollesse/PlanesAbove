---
id: design-system-pyheh
title: Entwurf in Storybook: Zwei-Flugzeuge-Ansicht mit beiden Flugzeugen gleich groß, Typklasse je Slot per Control unten wählbar, passende Übergänge dazu
status: done
type: feature
context: design-system
created: 2026-10-30
completed:
depends_on: [design-system-001]
blocks: []
tags: [storybook, szenen-ebene, typklasse, uebergang, entwurf]
related_adrs: [0002, 0009, 0020]
related_research: []
prior_art: [design-system-kcpnw]
---

## Why
In der heutigen Zwei-Flugzeuge-Ansicht ist Slot 1 deutlich größer als Slot 2 (`.pa-slot-one` 50 % Breite, `.pa-slot-two` 33 % Breite, `src/client/ui/styles/ui.css`). Der Betreiber hat das Gefühl, dass man durch die unterschiedlichen Slot-Größen den Unterschied zwischen Narrowbody und Widebody nicht richtig erkennt: ein kleiner Widebody in Slot 2 wirkt wie ein Narrowbody in Slot 1. Außerdem geht ein kleines Flugzeug (Business-Jet, Turboprop, Light Aircraft) in Slot 2 unter. Sind beide Slots gleich groß, trägt allein die Silhouette den Größenunterschied der Typklasse, und auch kleine Flugzeuge sind gut zu erkennen.

Es geht zunächst nur um den **Entwurf** zum Vergleichen und Abnehmen in Storybook (Storybook-first, ADR 0002), nicht um den Umbau der App.

## What
Eine **eigene Storybook-Komponente/Story** (nicht die bestehende „Organisms/Szenen-Ebene“ verändern), die die Zwei-Flugzeuge-Ansicht mit zwei **gleich großen** Slots zeigt:

- Neue Story-Datei unter `src/client/ui/stories/`, z. B. „Organisms/Szenen-Ebene (gleich groß)“ oder „Entwürfe/Zwei Flugzeuge gleich groß“. Eigenes Organism-Modul (z. B. `scene-layer-equal.ts`) mit eigenen Slot-Klassen (z. B. `pa-slot-eq-one` / `pa-slot-eq-two`); bestehende Klassen `pa-slot-one`/`pa-slot-two` und ihre Übergänge bleiben unverändert, damit die App und die 22 bestehenden Übergänge nicht betroffen sind.
- Beide Slots gleiche Breite; Position so, dass beide samt Plakette vollständig im Himmel über der Info-Leiste liegen (4:3 und 5:3). Layout-Vorschlag: nebeneinander mit je ~42–45 % Breite, oder leicht versetzt in der Höhe; der Worker legt einen Vorschlag vor, der Betreiber nimmt ab.
- **Storybook-Controls**: je Slot ein `select` für die **Typklasse** (alle 10: narrowbody, widebody, jumbo-hump, double-decker, regional-jet, turboprop, business-jet, light-aircraft, glider, helicopter), dazu wie bisher `aspect`, `time`, `weather`. Lackierung/Logo dürfen fix oder ebenfalls als Control sein (optional). Die Controls erscheinen im Storybook-Controls-Panel unten („direkt unten auswählen“).
- Info-Leiste mit zwei Zeilen und Plaketten gehört zum Entwurf dazu (vollständiger Screen), damit die Wirkung auf dem Tablet beurteilbar ist; Beispieldaten aus `SAMPLE_FLIGHTS`.
- **Übergänge passend dazu**: die Flugzeug-Übergänge (kommt / geht / wechselt), die Slot 1/Slot 2 betreffen, als Variante mit gleich großen Slots – entweder als eigene Story in der neuen Datei oder als eigene Story-Datei („Entwürfe/Übergänge gleich groß“). Der datengetriebene Player (`src/client/ui/transitions/player.ts`, `TransitionData`/`PlaneRef`, design-system-kcpnw) soll wiederverwendet werden; der Weg dorthin (Specs parametrisieren über den Slot-Klassenpräfix vs. eigener Spec-Satz) ist Worker-Entscheidung, dokumentiert in den Notes des Ergebnisses. Auch hier Typklasse je Slot wählbar, Wetter-/Tageszeit-Übergänge sind nicht nötig.

## Acceptance criteria
- [ ] Neue Story-Datei existiert unter `src/client/ui/stories/`; die bestehenden Stories „Organisms/Szenen-Ebene“, „Templates/…“ und „Pages/Übergänge“ rendern unverändert (bestehende Snapshot-/E2E-Tests grün, `npm test` und Storybook-Build ohne Fehler).
- [ ] In der neuen Story haben die Wrapper beider Slots dieselbe CSS-Breite (Test: `getBoundingClientRect().width` der beiden Slot-Elemente stimmt innerhalb 1 px überein, bei 4:3 und 5:3).
- [ ] Beide Slots plus Plaketten liegen vollständig innerhalb des Himmelsbereichs oberhalb der Info-Leiste (kein Überlappen mit `.pa-bar-double`, kein Beschnitt am Bildrand) bei 4:3 und 5:3.
- [ ] Storybook-Controls: zwei `select`-Controls (Typklasse Slot 1, Typklasse Slot 2) mit genau den 10 Typklassen aus dem Katalog als Optionen; eine Änderung rendert die jeweilige Silhouette neu.
- [ ] Übergänge „Flugzeug kommt“, „Flugzeug geht“ und „Flugzeug wechselt“ sind in der Gleich-groß-Variante als abspielbare Stories vorhanden (Start-Knopf wie bisher, Dauer `TRANSITION_MS`), ebenfalls mit Typklasse je Slot wählbar.
- [ ] Narrowbody und Widebody nebeneinander sind in der neuen Ansicht als unterschiedlich groß/anders proportioniert erkennbar; ein Business-Jet oder Light Aircraft in Slot 2 ist klar lesbar. [human-eye]
- [ ] Der Betreiber hat den Entwurf in Storybook abgenommen oder eine Rückmeldung zur Weiterarbeit gegeben (Abnahme). [human-eye]

## Notes
- Aktuelle Größen: `.pa-slot-single` 72 %, `.pa-slot-one` 50 %, `.pa-slot-two` 33 % Breite (`src/client/ui/styles/ui.css`). Plaketten-Positionen `.pa-badge-slot-one/-two` müssen für die neue Variante mitziehen.
- Die Silhouetten-SVGs skalieren über die Slot-Breite; ob die Typklassen-SVGs untereinander bereits in realistischem Größenverhältnis gezeichnet sind (Widebody breiter als Narrowbody bei gleicher Slot-Breite) muss der Worker prüfen. Falls nicht, ist das ein eigener Folge-Task (Größenfaktor je Typklasse), nicht Teil dieses Entwurfs — hier nur feststellen und in den Notes melden.
- Verwandt: design-system-kcpnw (Übergangs-Player datengetrieben) — Grundlage für die Übergangs-Variante. ADR 0020 (fester Timer statt `animationend`) gilt weiter.
- Erst nach Abnahme folgt ein eigener Task für sky-scene (App nutzt die neue Szenen-Ebene) und ggf. das Anpassen der 22 bestehenden Übergänge.
- Offen für die Abnahme: nebeneinander auf gleicher Höhe oder leicht versetzt? Der Worker darf beide Varianten als zwei Stories anbieten.

## Outcome

Entwurf (nur Storybook, App und die 22 bestehenden Übergänge unverändert) zum Vergleichen und Abnehmen:

- **Template-Story** `Templates/Entwurf: Zwei Flugzeuge gleich groß` (`src/client/ui/stories/scene-equal.stories.ts`): vollständiger Screen mit Kopfzeile, Himmel, zwei Slots, zwei Plaketten und doppelter Info-Leiste (Daten aus `SAMPLE_FLIGHTS`). Controls: `aspect`, `time`, `weather`, `layout`, und zwei `select` "Typklasse Slot 1/2" mit allen 10 Typklassen. Zwei Stories: "Nebeneinander (gleiche Höhe)" und "Leicht versetzt".
- **Übergangs-Stories** `Pages/Entwurf: Übergänge gleich groß` (`transitions-equal.stories.ts`): Flugzeug kommt / geht / wechselt (alle 11 Varianten aus dem Bestand), Start-Knopf, 5 s (`TRANSITION_MS`, fester Timer, ADR 0020), Typklasse je Slot und Layout wählbar. Ein Flugzeug behält seine Typklasse über den Wechsel, ein neu ankommendes nimmt die Typklasse seines Slot-Index (`retypeData`).
- **Organism** `organisms/scene-layer-equal.ts` (eigene Klassen `pa-slot-eq-single/-one/-two`, `pa-badge-slot-eq-one/-two`), Template `templates/screen-equal.ts`.

**Layout-Vorschlag (zur Abnahme):** beide Slots je 44 % Breite, Slot 1 bei left 4 %, Slot 2 bei left 52 %, Plaketten jeweils links oberhalb. Vertikale Position in `cqw` (Anteil der Bildschirmbreite), damit sie bei 4:3 und 5:3 im Himmel über der Info-Leiste bleiben: "nebeneinander" beide top 16cqw; "versetzt" Slot 1 top 8cqw, Slot 2 top 19,5cqw. Beide Varianten sind angeboten, der Betreiber wählt.

**Entscheidung Übergänge:** kein zweiter handgeschriebener Spec-Satz. `transitions/catalog-equal.ts` leitet `EQUAL_TRANSITIONS` aus den 11 Flugzeug-Specs ab (gleiche Ids, Layer-Reihenfolge, Zeiten) und tauscht nur die fünf Plane-Keyframes aus, deren Geometrie von der Slotgröße abhängt (`pa2-plane1`, `pa5-p1`, `pa6-p2`, `pa6-p1`, `pa7-pout` -> `pae-*` in `styles/transitions.css`, in cqw und mit den Slot-Positions-Variablen). Den Slot-Klassenpräfix wählt der Renderer: der Player bekam die optionalen Parameter `slots` (SlotRenderers) und `stageClass`; Standardverhalten unverändert (bestehender Snapshot-Test grün). Die übrigen Keyframes (Prozent-Slides, Plaketten, Leisten) bleiben für 44-%-Slots gültig und werden wiederverwendet.

**Befund Silhouetten (Notes-Prüfung):** gleiche viewBox (1000x460), gemessene Inhaltsbreite: narrowbody 938, widebody 973, jumbo-hump 985, double-decker 991, regional-jet 850, turboprop 860, business-jet 564, light-aircraft 306, glider 350, helicopter 914 von 1620 (ca. 56 % der Slotbreite). Kleine Klassen sind deutlich kleiner gezeichnet, aber Narrowbody vs. Widebody unterscheiden sich in der Länge nur um ca. 4 % (Höhe 283 vs. 347): nicht in realistischem Verhältnis. Folge-Item "Größenfaktor je Typklasse" liegt im Backlog.

**Tests:** `tests/unit/equal-slots.test.ts` (8 Tests: gleiche Slotbreite im CSS, bestehende Klassen unverändert, zwei select-Controls mit genau den 10 Typklassen, Typklasse rendert Silhouette neu, 11 Übergänge samt Keyframes, Player mit eq-Slots, Typ-Erhalt, Übergangs-Stories) und `tests/e2e/equal-slots.spec.ts` (5 Playwright-Tests: Slotbreiten innerhalb 1 px, Slots+Plaketten im Himmel über `.pa-bar-double` ohne Beschnitt bei 4:3 und 5:3, beide Layouts; Übergangs-Stories spielbar). `npm test` (579 passed), `npm run typecheck`, `npm run build-storybook` sauber; neue E2E-Tests und der Story-Render-Test laufen grün in Chromium. 9 bereits bestehende App-E2E-Tests (`skeleton`, `stage-fill`) schlagen in Chromium fehl, weil der Mock-Service ohne `npm run build` (dist) nicht startet - unabhängig von dieser Änderung.

**Offen für den Betreiber (bewusst, `[human-eye]`):** (1) Ist der Größenunterschied Narrowbody/Widebody sowie die Lesbarkeit von Business-Jet/Light Aircraft in Slot 2 erkennbar? (2) Abnahme bzw. Rückmeldung zum Entwurf (nebeneinander vs. versetzt). Diese beiden Kriterien bleiben offen.
