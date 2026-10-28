---
id: design-system-h7w2q
title: Szene füllt den iPad-Bildschirm als Home-Bildschirm-Web-App nicht ganz aus; iPadOS rechnet die Höhe ohne die transparente Statusleiste, unten bleibt ein schwarzer Streifen
status: done
type: bug
context: design-system
created: 2026-10-28
completed:
depends_on: [design-system-001-styleguide]
blocks: []
tags: [ipad, kiosk, safe-area, status-bar, layout]
related_adrs: [0004, 0008]
related_research: []
prior_art: []
---

## Why
Der Builder hat die App am 2026-10-28 auf dem echten Gerät geöffnet: iPad Pro 10,5", iPadOS 17.7.3, als Web-App vom Home-Bildschirm. Unten erscheint ein schmaler schwarzer Streifen, nur unten, etwa so hoch wie die Statusleiste. Die Statusleiste oben (Uhrzeit, Datum, Akku) ist transparent und zeigt den Himmel. Das ist richtig so und soll so bleiben. Das Display steht in Monas Zimmer und soll bis zum Rand Himmel zeigen.

## What
Ursache: `src/client/app/index.html` setzt `apple-mobile-web-app-status-bar-style: black-translucent` und `viewport-fit=cover`. Die Seite liegt deshalb unter der Statusleiste. `src/client/app/app.css` setzt `html, body { height: 100% }` und `#app { width: min(100vw, calc(100vh * 4 / 3)) }`. Als Home-Bildschirm-Web-App rechnet iPadOS diese Höhen aber ohne die Statusleiste (20 pt). Beim iPad Pro 10,5" (1112 × 834 pt, genau 4:3) wird die Bühne so 1085 × 814 statt 1112 × 834. Unten bleiben 20 pt schwarz, links und rechts je ~13 pt Rand in `#0d0f12`.

Ziel: Der Himmel füllt den ganzen Bildschirm bis zum Rand, auch hinter der transparenten Statusleiste. Kein schwarzer Streifen, kein Rand bei einem 4:3-Display. Höhe und Breite der Seite sollen die ganze Bildschirmfläche nutzen, z. B. mit `100dvh`/`100lvh` (ab Safari 15.4), mit `env(safe-area-inset-top)` als Ausgleich oder mit beidem, statt `height: 100%`/`100vh`. Die Grenze Safari 16 (ADR 0004) muss eingehalten werden. Bei einem Nicht-4:3-Display bleibt das Letterboxing wie bisher. Die Kopfzeile darf nicht so weit nach oben rutschen, dass die Statusleiste sie überdeckt. Sie liegt heute bei `top: 5.5%`. Der Worker prüft, ob das bei 834 pt Höhe mit 20 pt Statusleiste reicht, sonst wird ein Abstand über `env(safe-area-inset-top)` ergänzt.

## Acceptance criteria
- [x] `app.css` berechnet die Höhe der Seite und die Bühnenbreite nicht mehr über `height: 100%`/`100vh` allein. Es wird eine Einheit oder Formel genutzt, die die Statusleiste mitzählt (`100dvh`/`100lvh` und/oder `env(safe-area-inset-top)`), mit einem Fallback für Engines ohne `dvh`. Ein Kommentar nennt den Grund (iPadOS-Web-App mit `black-translucent`).
- [x] Ein Playwright-Test mit Viewport 1112 × 834 (iPad Pro 10,5" quer) prüft, dass die Bühne `.pa-screen` genau 1112 × 834 groß ist (±1 px) und bei (0,0) beginnt, unter WebKit und Chromium.
- [x] Ein Playwright-Test mit Viewport 1180 × 820 (Nicht-4:3) prüft, dass die Bühne 4:3 bleibt und zentriert ist (Letterboxing unverändert).
- [x] Die Kopfzeile (Ort, Uhrzeit) liegt bei 1112 × 834 vollständig mindestens 20 px unter der Oberkante (Playwright-Test über `getBoundingClientRect`), damit die Statusleiste sie nicht überdeckt.
- [x] Bestehende E2E- und Unit-Tests bleiben grün, die Stories rendern unverändert.
- [ ] Auf dem iPad Pro 10,5" als Home-Bildschirm-Web-App reicht der Himmel bis zum unteren und seitlichen Rand, kein schwarzer Streifen. Oben ist der Himmel hinter der transparenten Statusleiste sichtbar. [human-eye]

## Notes
- Gefunden am 2026-10-28 beim ersten Test am echten Gerät (Captured via `quick-capture`, refined im Modeling mit dem Builder). Antworten des Builders: Gerät iPad Pro 10,5" mit iPadOS 17.7.3; die Leiste ist nur unten und schmal; Ziel ist „Himmel bis zum Rand“.
- Der iOS-Fehler lässt sich in Playwright nicht nachstellen, weil der Standalone-Modus nicht emuliert wird. Die Tests sichern deshalb nur das Ziellayout ab, den Gerätebefund prüft der Builder per Auge.
- Wortlaut des Builders beim Erfassen: „unten ist eine kleine schwarze Leiste. Ich glaube das liegt daran, dass du dachtest, die Statusleiste mit Datum und Uhrzeit wäre schwarz hinterlegt, das ist sie aber nicht sondern sie ist durchsichtig und zeigt den himmel an.“

## Outcome

app.css: html/body height and #app width now declare `100dvh`/`100dvw` after the `100%`/`vh` fallback (an engine without dvh drops the second declaration), with a comment naming the iPadOS standalone + black-translucent cause (20 pt status bar). The header at `top: 5.5%` (about 46 px at 834) already clears the status bar, so no safe-area padding was added. New tests/e2e/stage-fill.spec.ts (WebKit + Chromium): at 1112x834 the stage is exactly 1112x834 at (0,0) and the header y >= 20; at 1180x820 the stage stays 4:3 and centered. tests/e2e/support/service.ts hardened (retry on port collision, SIGKILL fallback in stop) because repeat-each runs hung in afterEach. Playwright cannot emulate standalone mode, so the device check stays [human-eye]. npm test, typecheck, full e2e (40 passed), new spec repeat-each green.

