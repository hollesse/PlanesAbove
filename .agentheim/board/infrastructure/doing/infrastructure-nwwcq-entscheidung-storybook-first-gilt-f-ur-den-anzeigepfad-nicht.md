---
id: infrastructure-nwwcq
title: Entscheidung: Storybook-first gilt für den Anzeigepfad, nicht für Betreiber-Werkzeuge (ergänzt ADR 0002)
status: doing
type: decision
context: infrastructure
created: 2026-10-31
completed:
depends_on: []
blocks: []
tags: [decision, foundation, storybook-gate]
related_adrs: [0031]
related_research: []
prior_art: []
---

## Why
ADR 0002 verlangt, dass jedes UI-Element zuerst in Storybook entsteht und abgenommen wird. Der Lackierungs-Editor ist ein Betreiber-Werkzeug mit eigener Oberfläche (Werkzeugleiste, Ebenenpanel, Farbpicker, Lückenliste, Fotopanel). Ob das Gate dafür gilt, ist in der Vision als offene Frage notiert.

## What
ADR schreiben (Vorschlag: 0036, scope global, ergänzt ADR 0002) nach dem Architekten-Entwurf in den Notes; die offene Frage in vision.md schließen und die Gate-Notiz in `contexts/livery-editor/README.md` anpassen.

## Acceptance criteria
- [ ] ADR committed unter `.agentheim/knowledge/decisions/`, Begründung entspricht dem Architekten-Entwurf in den Notes (oder der vom Betreiber geänderten Fassung); in die INDEX eingetragen.
- [ ] Keine Code-Änderung in diesem Task.
- [ ] Der Betreiber hat den Entwurf gelesen und die offenen Punkte in den Notes beantwortet oder bewusst offen gelassen. [human-eye]

## Notes
**Architekten-Entwurf (2026-10-31):**
- `renderLiverySvg`, das Molekül „lackiertes Flugzeug“, Silhouetten und Detailschichten bleiben streng Storybook-first. Je Lackierungsdatei wird eine Story erzeugt; das deckt „jede Typklasse × jede Lackierung“ ab.
- Editor-eigene UI liegt außerhalb des Gates. Der Betreiber nimmt sie im laufenden Editor ab; Stories sind optional.
- Hebt das pauschale `depends_on: [design-system-001-styleguide]` für Editor-UI-Tasks auf.
- Verworfen: Gate für alles, Gate für nichts.
