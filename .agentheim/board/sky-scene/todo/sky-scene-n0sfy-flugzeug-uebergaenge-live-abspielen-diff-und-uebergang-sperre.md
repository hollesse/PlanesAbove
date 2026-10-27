---
id: sky-scene-n0sfy
title: Flugzeug-Übergänge (kommt / geht / wechselt) in der Live-Szene abspielen statt hart zu schneiden; Diff per icao24, Übergang-Sperre puffert den neuesten Stand
status: todo
type: feature
context: sky-scene
created: 2026-10-27
completed:
depends_on: [design-system-001, design-system-kcpnw]
blocks: []
tags: [uebergang, transitions, client, kiosk]
related_adrs: [0004, 0012, 0017, 0020]
related_research: []
prior_art: [sky-scene-g3r8w]
---

## Why
Der Kiosk-Client (`src/client/app/app.ts`) ersetzt bei jedem Poll den ganzen Bildschirm per `replaceChildren` – ein harter Schnitt. Im Prototyp und im Storybook (Pages/Übergänge) fliegt ein Flugzeug ein, aus oder wechselt in 5 s. Mona soll genau das sehen. Das ist das Herzstück des Erlebnisses und seit dem Abnahme-Storybook die größte sichtbare Lücke zwischen Entwurf und Gerät.

## What
Nur die 11 Flugzeug-Übergänge (Gruppen kommt / geht / wechselt). Ein Himmel- oder Tageszeitwechsel bleibt vorerst ein harter Schnitt (Crossfades sind ein Folge-Task).

- **`pickTransition(prev, next)`** – reine Funktion (`src/client/app/logic.ts` oder `transition-plan.ts`), vergleicht ausschließlich icao24 und Array-Position. Das Wire-Array `planes[]` ist kompaktiert (`src/server/modules/sky-scene/sky-service.ts:59-69` – nur belegte Slots werden gepusht): Slot-Positionen sind stabil (ADR 0017), Array-Positionen nicht – nach dem Gehen von Slot 1 steht der Überlebende an Index 0 und rutscht beim nächsten Neuzugang auf Index 1. Nie Slot-Nummern annehmen. Ergebnis ist eine Spec-Id, `'cut'` oder `'same'`:

  | prev | next | Ergebnis |
  |---|---|---|
  | [] | [] | same |
  | [] | [x] | empty-to-one |
  | [] | [x,y] | empty-to-two |
  | [a] | [] | one-to-empty |
  | [a] | [a] | same |
  | [a] | [x] | switch-one |
  | [a] | [a,x] | one-to-two |
  | [a] | [x,a] | cut (Spiegelfall ohne Spec) |
  | [a] | [x,y] | cut |
  | [a,b] | [] | two-to-empty |
  | [a,b] | [a] | two-to-one-b |
  | [a,b] | [b] | two-to-one-a |
  | [a,b] | [x] | cut |
  | [a,b] | [a,b] | same |
  | [a,b] | [a,x] | switch-two-2 |
  | [a,b] | [x,b] | switch-two-1 |
  | [a,b] | [x,y] | switch-two-both |
  | [a,b] | [b,a] / [b,x] / [x,a] | cut (Position gewandert; unter ADR 0017 unmöglich, trotzdem abgesichert) |

  Fallback ist immer der Schnitt, nie die „nächstbeste“ Spec (die würde ein Flugzeug im falschen Slot animieren).
- **`same`, Himmel-/Stale-/Uhr-only-Änderung:** heutiger Voll-Render (`replaceChildren`), kein In-Place-Patch. Erster Render nach Seitenstart: Schnitt. Anderer `buildId`: Reload wie heute, kein Übergang.
- **Himmel-/Stale-Wechsel im selben Takt wie ein Flugzeugwechsel:** die Flugzeug-Spec spielt mit `data.sky = next.sky` (Himmel springt bei Frame 0), `clock`/`place`/`stale` aus `next`. (Annahme des Refiners, kleine reversible Wahl – siehe Notes.)
- **Übergang-Sperre:** zweite Instanz der bestehenden `VorleseSperre<SceneState>`-Klasse, innerhalb der Vorlese-Sperre verkettet (ADR 0020):
  ```
  poll → vorleseSperre.submit(s)         // apply = (s) => uebergangSperre.submit(s)
  uebergangSperre = new VorleseSperre(show, timers)
  show(s): prev = current; current = s;  // Tipps arbeiten sofort auf s
           id = pickTransition(prev?.planes, s.planes)
           spec-Id → stage = renderTransitionStage(spec, data); replaceChildren; playTransition; root.dataset.transition = id; uebergangSperre.lock(TRANSITION_MS + 300)
           sonst   → render()
  Timer → uebergangSperre.release(): neuesten gepufferten Stand per show() anwenden (ggf. nächster Übergang direkt); sonst render() des Endbilds und data-transition leeren
  ```
  Der Watchdog von `lock()` ist der Ende-Timer; kein zweiter Timer. Ein laufender Übergang wird nie unterbrochen; Zwischenstände werden verworfen (nur der neueste zählt). `reloadWhenFree` wartet auf beide Sperren. Der `catch`-Zweig (`render()` zur Stale-Auffrischung) wird während eines Übergangs übersprungen; der Endrender nimmt das frische Stale-Flag mit. Die Vorlese-Sperre bleibt außen: Ein per Vorlese-Sperre gepufferter Stand geht nach der Freigabe durch die Übergang-Sperre. `data-speaking` spiegelt weiter nur die Vorlese-Sperre.
- **Tippen während des Übergangs:** erlaubt ab Frame 0. Die Tipp-Auflösung fragt in einer Übergangs-Bühne nur `[data-side="to"]`-Ebenen ab (gestapelte gehende/kommende Ebenen würden Indizes verschieben).
- **DOM-Signale:** `data-planes` = angewandter Stand (`current`), neu `data-transition` = laufende Spec-Id (leer, wenn keiner läuft).

## Acceptance criteria
- [ ] `tests/unit/pick-transition.test.ts`: tabellengetrieben über jede Zeile der Entscheidungstabelle oben; jede Zeile liefert genau das gelistete Ergebnis, die drei Spiegel-/No-Spec-Fälle `'cut'`, Identität `'same'`.
- [ ] `tests/unit/pick-transition.test.ts`: jede Spec-Id, die `pickTransition` liefern kann, existiert in `TRANSITIONS`; alle 11 Flugzeug-Ids sind erreichbar.
- [ ] `tests/unit/app.test.ts` (fake Timers, jsdom): der erste Poll rendert ohne Übergang (`data-transition` leer); ein zweiter Poll `[a]→[a,b]` setzt `data-transition="one-to-two"` und `data-planes="a,b"` sofort.
- [ ] `tests/unit/app.test.ts`: während eines Übergangs werden drei weitere Polls gepuffert; bei `TRANSITION_MS + 300` wird nur der NEUESTE gezeigt (mit eigenem Übergang oder Schnitt); Zwischenstände werden nie gerendert.
- [ ] `tests/unit/app.test.ts`: eine Vorlesung, die mitten im Übergang startet, hält einen gepufferten Stand auch nach Ablauf des Übergangs-Timers zurück, bis sie endet; umgekehrt wartet ein nach Vorlese-Ende gepufferter Stand noch auf das Übergangs-Ende. `data-speaking` bleibt bei einem reinen Übergang `false`.
- [ ] `tests/unit/app.test.ts`: ein fehlgeschlagener Poll während eines Übergangs ersetzt die Bühne nicht.
- [ ] `tests/unit/app.test.ts`: ein Klick auf das ankommende Flugzeug während des Übergangs ruft `speak` mit der `audioUrl` des neuen Flugzeugs auf (Auflösung über `[data-side="to"]`).
- [ ] `tests/e2e/skeleton.spec.ts` mit neuem `scenarios/plane-transition.json` (Takt 0 `[aaaaaa]`, at 30 `[aaaaaa,bbbbbb]`, at 60 `[aaaaaa]`): nach `goto` `data-transition=""` und `data-planes="aaaaaa"`; nach `advance(30)` `data-transition="one-to-two"` und `data-planes="aaaaaa,bbbbbb"`; ein weiteres `advance` innerhalb der 5 s lässt beides unverändert; danach (`timeout` ~10 s) `data-transition="two-to-one-b"` und `data-planes="aaaaaa"`; nach weiteren 5 s `data-transition=""`.
- [ ] Auf dem echten iPad fliegt beim Moment eins→zwei das ankommende Flugzeug wie im Storybook-Prototyp ein, ohne Sprung oder Blitzer am Anfang oder bei der Übergabe von der animierten Bühne zum statischen Bildschirm. [human-eye]
- [ ] Auf dem Kiosk liest ein Tipp auf das ankommende Flugzeug in der ersten Sekunde des Übergangs dessen Steckbrief vor, ohne dass das Bild stottert. [human-eye]

## Notes
- Kind-Task aus der Refinement von sky-scene-bvnnx (dismissed). Hängt an design-system-kcpnw (datengetriebener Player, `TRANSITION_MS`, `data-side`).
- ADR 0020 hält fest: nie unterbrechen, zweite Sperr-Instanz statt geteilter, fester Timer statt `animationend`, Diff per icao24 wegen kompaktiertem Array, Himmelwechsel bleibt Schnitt.
- Offene, reversible Wahl (Refiner-Annahme, kein Blocker): Himmel-/Stale-Wechsel gleichzeitig mit Flugzeugwechsel → Flugzeug-Spec spielt, Himmel springt bei Frame 0. Alternative wäre ein Voll-Schnitt, der bei jeder Dämmerung die Animation verlöre. Beim Betreiber-Eye-Check gegenprüfen.
- Folge-Capture (nicht hier): Wetter-/Tageszeit-Crossfades (11 Specs) live abspielen.
- Der Mock-Client pollt alle 200 ms; eine echte 5-s-Wartezeit im E2E ist in Ordnung.
- Eine Spiegel-Spec „one-to-two, Überlebender rechts“ fehlt im Katalog; falls der Schnitt dort im Betrieb stört, ist das ein design-system-Capture (neue Story + Abnahme), nicht Teil dieses Tasks.
- Refinement 2026-10-27 (zweiter Durchgang): Voraussetzungen gegengeprüft – ADR 0020 liegt vor, alle 11 Spec-Ids existieren in `src/client/ui`, Kompaktierung in `sky-service.ts` bestätigt. `TRANSITION_MS` und `data-side` kommen aus design-system-kcpnw (in Arbeit); `work` hält diesen Task, bis kcpnw integriert ist.
- Refinement 2026-10-27 (dritter Durchgang): design-system-kcpnw ist integriert (Commit 80699ff) – `TRANSITION_MS` (5000) in `src/client/ui/transitions/catalog.ts`, `renderTransitionStage` / `playTransition` / `data-side` in `src/client/ui/transitions/player.ts`, `VorleseSperre.whenFree` in `src/client/app/sperre.ts` liegen vor. Kein offener Blocker mehr; die verbleibende Sky-bei-Frame-0-Wahl bleibt wie oben notiert reversibel.
