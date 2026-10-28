---
id: design-system-w5n2k
title: Die Long-Route-Tests in Playwright WebKit sind instabil; je Lauf scheitert eine andere der drei Varianten (Einzelansicht, Zwei-Flugzeuge, Umbruch vor dem Pfeil)
status: backlog
type: bug
context: design-system
created: 2026-10-28
completed:
depends_on: []
blocks: []
tags: [e2e, webkit, playwright, info-leiste, flaky]
related_adrs: [0003]
related_research: []
prior_art: [design-system-grp94]
---

## Why
`tests/e2e/long-route.spec.ts` (aus design-system-grp94) scheitert unter `--project=webkit` nicht reproduzierbar. Am 2026-10-28 gab es in drei aufeinanderfolgenden lokalen Läufen jeweils 1 bis 3 Fehlschläge in wechselnden Tests, z. B. „two-plane view 4:3 route inside bar — Expected: true, Received: false“. Das passierte mit frisch gebautem `storybook-static`, mit und ohne die Umbenennung `pretest:e2e` → `pree2e`. Der CI-Job `e2e` darf zwar scheitern (`continue-on-error`), ist damit aber dauerhaft rot und verliert seinen Wert als Signal.

## What
Ursache finden. Verdacht: Das Layout wird gemessen, bevor die Schrift (IBM Plex) geladen ist oder die Schriftgrößen-Anpassung fertig ist (Race mit `document.fonts.ready` oder ResizeObserver). Je nach Ursache liegt der Fix im Test (vorher auf einen stabilen Zustand warten) oder in der Komponente (die Anpassung läuft nicht deterministisch).

Wenn mitten im Spike die Ursache schon bekannt ist und sich billig beheben lässt: Behebung festhalten und aufhören.

## Acceptance criteria
- [ ] `npx playwright test tests/e2e/long-route.spec.ts --project=webkit --repeat-each=10` ist grün.
- [ ] Die Ursache steht im Outcome. Falls das Problem in der Komponente lag, deckt ein Unit- oder E2E-Test es ab.

## Notes
- Gefunden in der Modeling-Session „auf das Homelab deployen“ beim ersten grünen Deploy-Lauf. Der e2e-Job blockiert das Deployment nicht.
