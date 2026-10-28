---
id: design-system-h3b7q
title: Lange Route in der Info-Leiste: drei Alternativen als Storybook-Entwürfe, Betreiber wählt eine
status: done
type: spike
context: design-system
created: 2026-10-27
completed:
depends_on: [design-system-001-styleguide, design-system-z9rzp]
blocks: [design-system-grp94]
tags: [info-leiste, route, layout, storybook, spike]
related_adrs: [0002, 0021]
related_research: []
prior_art: [design-system-001]
---

## Why
Die große Routenzeile (`.pa-route-large`, `white-space: nowrap`, 5cqw bzw. 3.3cqw) passt bei zwei langen Flughafennamen nicht mehr in die Breite: „Santiago de Compostela (SCQ) → Jerez de la Frontera (XRY)" (57 Zeichen) braucht bei 5cqw rund die doppelte Bildschirmbreite. Der Betreiber will die Lösung nicht blind festlegen, sondern erst drei Entwürfe in Storybook sehen (ADR 0002, Storybook-first) und dann entscheiden. Mehrleg-Routen zeigen künftig nur Start → Ende (airspace-cn6t7); der Worst Case sind also zwei lange Namen, nicht drei.

## What
Zusätzliche Stories unter „Organisms/Info-Leiste · Entwürfe lange Route", je Variante Einzelansicht und Zwei-Flugzeuge-Ansicht, mit Beispieldaten „Santiago de Compostela (SCQ) → Jerez de la Frontera (XRY)" und Eyebrow mit „· über Sharjah". Nur Story-lokales CSS (Klassen mit Präfix `pa-draft-`), Komponenten und `ui.css` bleiben unverändert. In keiner Variante bricht ein Flughafenname innerhalb des Namens um.

- **A – erst kleiner, dann umbrechen:** Größenstufe nach Länge des längsten Namens (bis 16 Zeichen voll, bis 22 etwa 80 %, darüber etwa 65 %); reicht das nicht, Umbruch nur vor dem Pfeil (zweite Zeile beginnt mit „→").
- **B – Umbruch vor dem Pfeil plus Stufe:** immer zwei Zeilen, sobald die Route länger als eine Schwelle ist, dazu dieselbe Größenstufe.
- **C – einzeilig, nur Verkleinerung:** keine zweite Zeile, Schrift schrumpft nach Gesamtlänge bis sie passt (Minimum definieren).

Jede Variante bekommt zusätzlich einen Normalfall („Frankfurt (FRA) → New York (JFK)"), damit sichtbar ist, dass kurze Routen unverändert bleiben.

**Stop-loss (ADR 0065):** Ist mid-spike nach der ersten gebauten Variante bereits klar, dass sie genügt (oder eine Variante offensichtlich ausscheidet), das festhalten und abbrechen; nicht alle drei um ihrer selbst willen fertigstellen. If, mid-spike, the mitigation is already known and cheap, record it and stop.

## Acceptance criteria
- [ ] Storybook enthält die Entwurfs-Stories (Variante A, B, C je Einzel- und Zwei-Flugzeuge-Ansicht plus Normalfall); `npm run e2e:chromium` (alle Stories rendern fehlerfrei) ist grün.
- [ ] Komponenten (`info-bar.ts`, `info-row.ts`) und `ui.css` sind unverändert (Diff berührt nur `src/client/ui/stories/`).
- [ ] In jeder Variante liegt der gesamte Routentext innerhalb des Info-Leisten-Containers (kein Überlauf), nachweisbar per Bounding-Box in der Story bei 4:3 und 5:3.
- [x] Der Betreiber hat eine Variante gewählt; die Wahl steht in den Notes dieses Tasks und im Task design-system-grp94. [human-eye]

## Notes
- Betreiber-Wunsch 2026-10-27: „erstmal nur extra Designs in Storybook anlegen, ohne die Implementierung zu ändern, dann drei Alternativen designen und entscheiden."
- Einstiegspunkte: `src/client/ui/stories/info-bar.stories.ts`, `info-row.stories.ts`, `src/client/ui/domain/samples.ts`, `src/client/ui/styles/ui.css` (nur lesen).
- Nachfolger: design-system-grp94 setzt die gewählte Variante um und bringt den Playwright-Test mit den zwei längsten Namen.
- **Betreiberwahl 2026-10-28: Variante D (Kombination aus A und C)**, als vierte Story „D · Kombination" in `info-bar-long-route.stories.ts` angelegt und gemessen (alle vier D-Stories „passt" in 4:3 und 5:3). Regel: **Einzelansicht** erst verkleinern (in Stufen bis mindestens 60 % von 5cqw), Umbruch vor dem Pfeil nur wenn das immer noch nicht reicht; bei Umbruch Größe der Namensstufe (lange Namen 65 % = 3,25cqw, wie A lang). Normalfall „Frankfurt (FRA) → New York (JFK)" bleibt dadurch einzeilig bei 4,5cqw statt zweizeilig bei 5cqw (A-Normal wirkte bei 5:3 zu eng für die kleinen Texte). **Zwei-Flugzeuge-Ansicht** wie C: immer eine Zeile, nur verkleinern (Minimum 50 %, lange Route 2,05cqw).

## Verifier note (iteration 1)
**REASONS:**
- Criterion 3 not met: story `BNormalZwei` (Variante B, Normalfall Zwei Flugzeuge) overflows at 5:3 — badge reads "Überlauf · 2 Zeilen / 1 Zeile · 3.3cqw / 3.3cqw"; independent bounding-box probe agrees (first row's route sticks out of the row vertically).
- Cause is a worker-chosen parameter, not Variant B itself: `B_THRESHOLD = 30` for both views forces "Frankfurt (FRA) → New York (JFK)" (32 chars) onto two lines at 3.3cqw in the low 5:3 two-plane row; the same route fits on one line (A-normal-zwei shows "passt").
- Everything else passes: npm test 482, typecheck clean, e2e chromium 10 passed ("every story renders" green; 1 known unrelated livery failure), diff only under src/client/ui/stories/, fits() check sound and matches independent measurement on all 24 stages, no name breaks inside a name, ADR 0002/0021 consistent, no .agentheim paths. Criterion 4 [human-eye]: builder eye-check pending.

**SUGGESTED_FIX:** Make Variant B fit in every story at both ratios: view-dependent threshold (e.g. two-plane view breaks only above ~40 chars, or apply the size step to short routes too), then confirm all 12 stories show "passt" at 4:3 and 5:3. Update the Outcome's B notes to match.

**ITERATION_HINT:** likely-fixable


## Outcome

Neue Datei `src/client/ui/stories/info-bar-long-route.stories.ts`, Storybook-Titel **„Organisms/Info-Leiste · Entwürfe lange Route"**. Öffnen: `npm run storybook`, in der Seitenleiste unter Organisms den Eintrag „Info-Leiste · Entwürfe lange Route" wählen. Pro Variante vier Stories: Einzelansicht lange Route, Zwei Flugzeuge lange Route, Normalfall Einzel, Normalfall Zwei Flugzeuge (insgesamt 12). Jede Story zeigt 4:3 und 5:3 nebeneinander. Beispieldaten: „Santiago de Compostela (SCQ) → Jerez de la Frontera (XRY)", Eyebrow mit „· über Sharjah"; Normalfall „Frankfurt (FRA) → New York (JFK)" bzw. „Köln (CGN) → Palma (PMI)".

Umsetzung: Die echten Komponenten (`renderInfoBar`) werden unverändert gerendert; die Variante wird nach dem Mount per Story-lokalem CSS (`pa-draft-*`) und Inline-`font-size` in cqw angewendet (Umbruch nur vor dem Pfeil, nie im Namen). Ein Badge oben rechts in jeder Bühne zeigt das Ergebnis der Bounding-Box-Prüfung („passt"/„Überlauf" plus Zeilenzahl und Schriftgröße): Routentext innerhalb der Info-Leiste, innerhalb der eigenen Textspalte (kein Kontakt mit Statistik/Badge) und Textblöcke vertikal innerhalb Leiste/Zeile. Es wird bei jedem Resize neu angewendet.

Stop-loss: nicht ausgelöst; alle drei Varianten teilen sich eine kleine parametrische Funktion. Variante C scheidet für den Zwei-Flugzeuge-Fall praktisch aus (siehe unten).

Iteration 2: Variante B nutzt jetzt eine ansichtsabhängige Umbruchschwelle (`B_THRESHOLD = { single: 30, double: 40 }`), weil in der niedrigen Zwei-Flugzeuge-Zeile bei 5:3 „Frankfurt (FRA) → New York (JFK)" (32 Zeichen) zweizeilig überlief. Geprüft mit dem gebauten Storybook in Playwright/Chromium: alle 12 Stories zeigen „passt" in 4:3 und 5:3.

Beobachtungen (gemessen mit Playwright/Chromium, Zahlen = Routen-Schrift):
- **Wichtiger Nebenbefund:** Auch der Normalfall „Frankfurt (FRA) → New York (JFK)" (32 Zeichen, mit Flughafencodes) passt in der Einzelansicht bei den heutigen 5cqw NICHT einzeilig (Überlauf), sobald die Routenzeilen Codes enthalten. Die heutige Einzelzeile reicht nur für Routen ohne Code. Das betrifft die Umsetzung (grp94), unabhängig von der Variantenwahl.
- **A (erst kleiner, dann Umbruch):** Lange Route Einzel: 65 %-Stufe (3.25cqw), Umbruch vor dem Pfeil nötig, passt. Zwei Flugzeuge: 2.15cqw, beide Zeilen brechen um; passt, wirkt aber kleinteilig (Eyebrow ist 1.5cqw). Normalfall Einzel: bricht um (5cqw, zwei Zeilen); Normalfall Zwei Flugzeuge einzeilig bei 3.3cqw. Vorteil: kurze Routen bleiben einzeilig groß, Umbruch nur wenn nötig.
- **B (Umbruch ab Schwelle: Einzel > 30, Zwei Flugzeuge > 40 Zeichen, plus Stufe):** Lange Route: gleiche Größen wie A (3.25cqw Einzel, 2.15cqw zwei Flugzeuge), passt in beiden Formaten. Normalfall Einzel zweizeilig bei 5cqw, Normalfall Zwei Flugzeuge einzeilig bei 3.3cqw, beide passen in 4:3 und 5:3. Konsistentes, vorhersehbares Umbruchverhalten; die Schwelle muss pro Ansicht gewählt werden (niedrige Zwei-Flugzeuge-Zeile braucht höhere Schwelle).
- **C (einzeilig, nur Verkleinerung, Minimum 50 %):** Lange Route Einzel: 2.5cqw (genau 50 %), passt; Zwei Flugzeuge: 2.05cqw (62 %), passt, aber Route fast so klein wie die Statistik, für die Hauptinformation zu klein. Normalfall Einzel 4.5cqw. Für zwei lange Namen die schwächste Variante (Lesbarkeit aus Entfernung).
- Gemeinsames Detail: Die Eyebrow mit „· über Sharjah" ist in der Einzelansicht bei 5:3 fast randvoll (nowrap, noch innerhalb der Leiste). Bei längeren Betreibernamen würde sie als Nächstes überlaufen.
- Tendenz (nur Beobachtung, die Wahl liegt beim Betreiber): A oder B; A, wenn kurze Routen möglichst groß einzeilig bleiben sollen, B, wenn ruhiges, vorhersehbares Umbruchverhalten wichtiger ist.

Kriterium 4 (Betreiber wählt eine Variante) ist [human-eye] und offen; die Wahl gehört in die Notes dieses Tasks und in design-system-grp94.

Verifikation: `npm test` grün, `npm run typecheck` sauber, `npm run e2e:chromium` 10 passed, 1 failed = bereits bestehende Assertion in `tests/e2e/skeleton.spec.ts` (data-livery „def" vs „lh"), nicht von diesem Task. Build-Ausgaben (storybook-static, dist) nicht in der Dateiliste.
