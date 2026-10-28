---
id: design-system-w5n2k
title: Die Long-Route-Tests in Playwright WebKit sind instabil; je Lauf scheitert eine andere der drei Varianten (Einzelansicht, Zwei-Flugzeuge, Umbruch vor dem Pfeil)
status: done
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
- [x] `npx playwright test tests/e2e/long-route.spec.ts --project=webkit --repeat-each=10` ist grün.
- [x] Die Ursache steht im Outcome. Falls das Problem in der Komponente lag, deckt ein Unit- oder E2E-Test es ab.

## Notes
- Gefunden in der Modeling-Session „auf das Homelab deployen“ beim ersten grünen Deploy-Lauf. Der e2e-Job blockiert das Deployment nicht.

## Outcome
Ursache: ein Race im Test, nicht in der Komponente. `measure()` hat nach festen 600 ms gemessen. `fitRoutesWhenMounted` passt erst nach `document.fonts.load`, `fonts.ready` und rAF ein, und das dauert in WebKit manchmal länger. Belegt mit `--repeat-each=10`: Mit 600 ms scheiterten 10 von 60 Läufen, mit 3000 ms keiner.
Fix: `fitRoutes` setzt am Ende `data-routes-fitted` auf den Root (Unit-Test in `tests/unit/fit-route.test.ts`). Die E2E-Tests warten auf diesen Marker statt auf eine feste Zeit. Das Einpassen läuft synchron, sobald der Marker steht, ist der Zustand also fertig. Ergebnis: `tests/e2e/long-route.spec.ts --repeat-each=10` 120/120 grün (WebKit + Chromium), voller E2E-Lauf 36/36, Unit-Tests 528.

### Nachtrag (CI, Linux-WebKit)
Der Marker allein hat auf CI nicht gereicht: 1 von 36 scheiterte weiter. Im offiziellen Playwright-Container (`mcr.microsoft.com/playwright:v1.64.1-noble`, `--cpus=2`, `--repeat-each=15 --workers=4`) nachgestellt, dort scheiterten 15 von 90. Die Messwerte zeigen einen vorübergehenden Zustand: Zum Messzeitpunkt stand die Zwei-Flugzeuge-Zeile auf 2.38cqw (scrollWidth 529 > 485), 1,5 s später korrekt auf 1.98cqw ohne Überlauf. WebKit braucht unter Last also einen späteren Frame, bis das Einpassen fertig ist. Der Endzustand stimmt. Zwei Fixes an der Komponente (alle Schriften vorladen, Nachbarspalten beobachten) änderten die Quote nicht und wurden verworfen. Fix im Test: Nach dem Marker wartet `waitForFunction` (Timeout 5 s), bis keine Route mehr überläuft. Eine Route, die nie passt, scheitert also weiterhin. Container unter Last: 90/90 grün.
