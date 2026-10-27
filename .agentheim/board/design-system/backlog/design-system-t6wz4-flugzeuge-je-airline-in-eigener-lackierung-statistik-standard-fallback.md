---
id: design-system-t6wz4
title: Neue Lackierungen und Logos für die Airlines zeichnen, die im Sichtungslog ohne eigenes Design erscheinen (erste Runde: SunExpress, Cathay Pacific, AJet, Corendon, Aegean, Virgin Atlantic)
status: backlog
type: feature
context: design-system
created: 2026-10-27
completed:
depends_on: [airspace-f9cjz, design-system-001]
blocks: []
tags: [liveries, logos, assets]
related_adrs: [0009, 0010, 0002]
related_research: []
prior_art: [design-system-q7m3k, design-system-001]
---

## Why
Mona soll jedes Flugzeug in der Bemalung seiner Airline sehen. Der Katalog (`src/client/ui/domain/liveries.ts`, 41 Lackierungen + Standard) stammt aus dem Claude-Design-Entwurf und deckt die Airlines über dem Haus nur teilweise: SunExpress ist mit 10 Sichtungen die häufigste Airline ohne Design, dazu Cathay Pacific, AJet (TKJ), Corendon (CAI/CXI), Aegean (AEE), Virgin Atlantic (VIR), NetJets (NJE), Thai (THA). Außerdem haben nur 15 der 41 Katalog-Lackierungen ein Logo; häufig gesehene Airlines ohne Logo sind Eurowings (22 Sichtungen), British Airways (10), Brussels Airlines (7), Condor (6), Turkish (4), Wizz Air (3), Austrian (3) sowie Emirates, Qatar und United.

## What
Erste Runde neuer Lackierungen, jede als Katalog-Eintrag (CSS-`--skin-*`-Variablen wie in ADR 0009), Zuordnung in `airline-liveries.json` und Story in Storybook:

1. **Neue Lackierungen mit Logo:** SunExpress (SXS), Cathay Pacific (CPA), AJet (TKJ), Corendon (CAI, CXI), Aegean (AEE), Virgin Atlantic (VIR). Logo-SVG + PNG in `src/client/ui/assets/svg/logos/` und `svg/logos/`, Ankerpunkt per `data-anchor` wie bei den vorhandenen Logos.
2. **Logos für vorhandene Lackierungen** der häufigsten Airlines ohne Logo: Eurowings, British Airways, Brussels Airlines, Condor, Turkish Airlines, Wizz Air, Austrian, Emirates, Qatar Airways, United.
3. Storybook: jede neue Lackierung erscheint in Molecules/Lackiertes Flugzeug (alle Typklassen) und jedes neue Logo in Atoms/Logo; Abnahme durch den Betreiber vor Nutzung in der App (Regel dieses BC).

Weitere Runden (NetJets, Thai, Finnair, Air Dolomiti, Cargo-Gesellschaften …) nach der nächsten Lackierungs-Statistik (sighting-log-t8tfb) als eigene Tasks.

## Acceptance criteria
- [ ] Der Katalog enthält die sechs neuen Lackierungen; der Test „catalog has N liveries“ ist angepasst; der Test „every livery variable is used by some plane SVG“ ist grün.
- [ ] `airline-liveries.json` ordnet SXS, CPA, TKJ, CAI, CXI, AEE, VIR den neuen Lackierungen zu; `airlines.json` kennt jeden dieser Präfixe; die Tests aus airspace-f9cjz bleiben grün.
- [ ] Für jede neue Lackierung und jedes neue Logo (Liste unter What 1 + 2) existiert eine Logo-Datei; die Tests „every logo SVG references a PNG that exists“, „no generated logo falls back to the placeholder“ und „viewBox encloses all painted content“ sind grün.
- [ ] Storybook-E2E (alle Stories ohne Konsolenfehler) ist grün; Atoms/Logo „Alle Logos“ zeigt die neuen Logos.
- [ ] Farben und Logo-Sitz jeder neuen Lackierung sind auf narrowbody und widebody wiedererkennbar; der Betreiber hat sie in Storybook abgenommen. [human-eye]

## Notes
- Refine 2026-10-27: Der ursprüngliche Capture hatte drei Teile. Abgespalten: **airspace-f9cjz** (17 fehlende Zuordnungen zu bereits gezeichneten Lackierungen + `liveries.enabled` Default true) und **sighting-log-t8tfb** (Statistik `stats:liveries`). Dieser Task ist das reine Zeichnen und wartet auf airspace-f9cjz, damit die Liste nur echte Lücken enthält.
- **Offen (Betreiber-Entscheidung, Grund für backlog):** Woher kommen die Logo-Bilder? Bei design-system-q7m3k kamen die PNGs aus dem Claude-Design-Projekt (`da5d4e02-…`). Für die neuen Airlines gibt es dort nichts. Optionen: (a) Betreiber liefert PNGs (Rechte: privat genutzt, ADR 0001), (b) Worker zeichnet vereinfachte Vektor-Logos (Wortmarke/Form in Airline-Farben), (c) Lackierung ohne Logo, nur Farben. Bis das entschieden ist, kann kein Worker die Logo-Kriterien erfüllen.
- Zahlen aus `data/planesabove.db` und `unmapped_keys`, Stand 2026-10-27. Nach sighting-log-t8tfb ersetzt `npm run stats:liveries` diese Handzählung.
- Fallback-Regel bleibt: `resolveLivery` (Client) und `resolveLivery` (Server, ADR 0010) liefern Standard-Lackierung; light-aircraft/glider ohne Lackierung.
