---
id: 0034
title: Storybook-first gilt für den Anzeigepfad, nicht für Betreiber-Werkzeuge (ergänzt ADR 0002)
scope: global
status: accepted
date: 2026-10-31
supersedes: []
superseded_by: []
related_adrs: [0002, 0031]
related_tasks: [infrastructure-nwwcq]
related_research: []
---

# ADR 0034: Storybook-first gilt für den Anzeigepfad, nicht für Betreiber-Werkzeuge (ergänzt ADR 0002)

## Context
ADR 0002 verlangt, dass jedes UI-Element zuerst in Storybook entsteht und vom Betreiber abgenommen wird, bevor die App es verwendet. Der Grund: Der Anzeigeclient (alter iPad, Vanilla-HTML/CSS/JS) soll exakt das zeigen, was abgenommen wurde, und seltene Kombinationen (Typklasse × Lackierung) sollen vorab prüfbar sein.

Mit dem Lackierungs-Editor (ADR 0031, BC `livery-editor`) kommt ein Betreiber-Werkzeug mit eigener Oberfläche hinzu: Werkzeugleiste, Ebenenpanel, Farbpicker, Lückenliste, Fotopanel. Es läuft auf dem Rechner des Betreibers, nie auf dem iPad. Die Vision führte offen, ob das Gate auch dafür gilt. Pauschal angewendet würde ADR 0002 jede Editor-Aufgabe hinter `design-system-001-styleguide` stellen und für reine Arbeitsoberfläche Stories verlangen, die niemand als Referenz braucht.

## Decision
1. **Anzeigepfad bleibt streng Storybook-first.** Dazu gehören `renderLiverySvg`, das Molekül „lackiertes Flugzeug", die Silhouetten und die Detailschichten (inkl. Farbfelder für Triebwerkskörper, Flügel, Höhenleitwerk und Pfadfläche Rumpf + Finne nach ADR 0031 Punkt 4a). Jede neue oder geänderte Darstellung entsteht zuerst als Story und wird abgenommen.
2. **Je Lackierungsdatei wird eine Story erzeugt.** Damit ist „jede Typklasse × jede Lackierung" aus ADR 0002 für die dateibasierten Lackierungen abgedeckt, ohne dass pro Lackierung eine Story von Hand geschrieben wird.
3. **Editor-eigene UI liegt außerhalb des Gates.** Werkzeugleiste, Ebenenpanel, Farbpicker, Lückenliste, Fotopanel und ihr Zusammenspiel nimmt der Betreiber im laufenden Editor ab. Stories dafür sind optional, nie Voraussetzung.
4. **Der Editor konsumiert den Anzeigepfad, er dupliziert ihn nicht.** Die Vorschau im Editor nutzt dieselben Module (`renderLiverySvg`, Molekül) wie der Anzeigeclient. Was der Editor als „lackiertes Flugzeug" zeigt, ist damit automatisch das, was im Gate abgenommen wurde.
5. **Das pauschale `depends_on: [design-system-001-styleguide]` für Editor-UI-Tasks entfällt.** Tasks, die Anzeigepfad-Bausteine ändern, behalten die Abhängigkeit.
6. Die Vision-Notiz „Lackierungs-Editor: Gilt Storybook-first …" gilt damit als beantwortet; die Gate-Notiz in `contexts/livery-editor/README.md` wird entsprechend angepasst.

ADR 0002 bleibt in Kraft; dieser ADR schärft nur seinen Geltungsbereich (Anzeigepfad statt „jedes UI-Element des Repos").

## Consequences
### Positive
- Editor-Tasks sind nicht an den Styleguide gekoppelt und können früh gebaut werden.
- Kein Aufwand für Stories ohne Referenzwert (reine Arbeitsoberfläche).
- Die Garantie „iPad zeigt, was abgenommen wurde" bleibt unverändert, weil der Editor denselben Rendering-Code nutzt.

### Negative
- Editor-UI wird ohne isolierte Vorab-Abnahme gebaut; Fehlgriffe zeigen sich erst im laufenden Editor.
- Die Grenze „Anzeigepfad vs. Werkzeug-UI" muss bei jedem Task bewusst gezogen werden; Grenzfälle brauchen eine Entscheidung (siehe Offene Punkte).

### Neutral
- Die Story-Erzeugung je Lackierungsdatei braucht eine kleine Storybook-Erweiterung (Auto-Discovery der Lackierungsdateien), die separat als Task entsteht.
- Storybook bleibt Dev-/Review-Werkzeug und wird nicht ausgeliefert (unverändert zu ADR 0002).

## Alternatives considered
- **Gate für alles (auch Editor-UI):** konsistent mit ADR 0002, aber erzwingt Stories für Bedienelemente, die nur der Betreiber sieht, und verzögert den Editor ohne Qualitätsgewinn. Verworfen.
- **Gate für nichts im Editor, auch nicht für die Vorschau:** würde zulassen, dass der Editor eine eigene Darstellung des lackierten Flugzeugs baut, die vom Anzeigeclient abweicht. Verworfen; Punkt 4 verhindert das.

## Offene Punkte
- Soll der Editor-eigene Bedienelement-Satz (z. B. Farbpicker) langfristig doch in Storybook auftauchen, falls er in mehr als einem Betreiber-Werkzeug wiederverwendet wird? Bis dahin: nein.
- Grenzfall: Rein editor-interne Darstellungshilfen, die das lackierte Flugzeug zeigen (z. B. Lückenmarkierung oder Pfad-Overlay auf der Silhouette). Vorschlag: außerhalb des Gates, solange sie nie in den Anzeigeclient gelangen; Betreiber bestätigt oder widerspricht.

## References
- ADR 0002 (Storybook-first, Atomic Design), ADR 0031 (Lackierung als Pfaddatei im Repo), ADR 0030 (Vorlage)
- `.agentheim/knowledge/vision.md` (Abschnitt Lackierungs-Editor, Open questions)
- `.agentheim/knowledge/contexts/livery-editor/README.md`
