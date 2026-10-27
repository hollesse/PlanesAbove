---
id: design-system-r5d7v
title: Veralteter Stand in der Kopfzeile statt eigenem Stale-Hinweis („Letzter Stand · HH:MM“ statt „Live · HH:MM“)
status: todo
type: feature
context: design-system
created: 2026-10-27
depends_on: [infrastructure-001]
blocks: []
tags: [design-system, stale, header]
related_adrs: [0002, 0008]
related_research: []
prior_art: [design-system-001, design-system-v8q3n, infrastructure-001]
---
## Why
Der Walking Skeleton (infrastructure-001) hat für den veralteten Zustand (ADR 0008: letzte gute Szene bleibt, dezente Markierung) einen eigenen Baustein „Stale-Hinweis“ eingeführt. Der Betreiber hat ihn bei der Durchsicht abgelehnt: Die Kopfzeile zeigt dabei weiterhin „Live · HH:MM“, was falsch ist. Gewünscht: In der Kopfzeile steht statt „Live“ „Letzter Stand“ mit der Uhrzeit des letzten guten Stands.

## What
- Molekül Kopfzeile (`molecules/scene-header.ts`) bekommt einen Zustand: **live** → „Live · HH:MM“ (aktuelle Uhrzeit, wie bisher); **veraltet** → „Letzter Stand · HH:MM“ mit der Uhrzeit des letzten erfolgreich empfangenen Stands. Gleiche Position, Tinte und Schein wie bisher.
- Der separate Baustein **Stale-Hinweis** (`atoms/stale-notice.ts`, Stories `Atoms/Stale-Hinweis`, CSS `.pa-stale-notice`) entfällt; die Screen-Vorlage nutzt statt der `stale`-Text-Eigenschaft den Kopfzeilen-Zustand (z. B. `stale?: { since: 'HH:MM' }` o. ä.).
- Der App-Client (`src/client/app/`) setzt den Kopfzeilen-Zustand: veraltet, sobald der Dienst `stale` meldet oder seit `staleAfterMinutes` kein Poll erfolgreich war; die angezeigte Uhrzeit ist die des letzten guten Stands (vom Dienst gemeldeter Zeitpunkt der letzten erfolgreichen Abfrage bzw. des letzten erfolgreichen Polls). Nach Erholung wieder „Live · aktuelle Uhrzeit“.
- Stories: Molecules/Kopfzeile bekommt eine Story „Veraltet“ (beide Tinten), Templates/Bildschirm eine Variante „veraltet“.

## Acceptance criteria
- [ ] Kopfzeile im veralteten Zustand zeigt „Letzter Stand · HH:MM“ mit der Uhrzeit des letzten guten Stands; im Normalzustand „Live · HH:MM“ mit der aktuellen Uhrzeit (Unit-Tests für beide).
- [ ] Der Baustein Stale-Hinweis (Atom, Stories, CSS, Export) ist entfernt; kein Code nutzt ihn mehr.
- [ ] App: bei Quellenausfall bzw. ausbleibenden Polls wechselt die Kopfzeile auf „Letzter Stand · <Uhrzeit des letzten guten Stands>“ und nach Erholung zurück auf „Live“ (Unit-Test in `app.test.ts`, E2E-Szenario „Ausfall der Quelle“ prüft den Kopfzeilentext).
- [ ] Neue Stories für den veralteten Zustand vorhanden; alle Tests (Vitest, Typecheck, Storybook-Build, Playwright Chromium) grün.
- [ ] Der Betreiber hat die Stories gesehen und abgenommen. [human-eye]

## Notes
- Feedback des Betreibers wörtlich: „Es steht immer noch live. Da sollte stehen anstatt Live letzter Stand dann die Uhrzeit vom letzten Stand.“
- ADR 0008 (Client-Selbstheilung, dezente Stale-Markierung) bleibt erfüllt; die Markierung wandert in die Kopfzeile. ADR 0013 nennt das Atom — im Outcome vermerken, dass es durch den Kopfzeilen-Zustand ersetzt wurde.
