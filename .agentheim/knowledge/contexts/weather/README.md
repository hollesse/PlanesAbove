# Wetter & Tageszeit (weather)

## Purpose
Bildet echtes Wetter und Sonnenstand am Standort auf genau einen der 28 Himmel (Tageszeit × Wetterlage) ab.

## Classification
supporting — nötig für die Stimmung, aber keine eigene Differenzierung.

## Actors
—

## Ubiquitous language
- **Tageszeit** — Morgendämmerung, Tag, Abenddämmerung, Nacht (aus Sonnenstand am Standort).
- **Wetterlage** — Klar, Leicht bewölkt, Bedeckt, Nebel, Regen, Schnee, Gewitter.
- **Himmel** — die Kombination Tageszeit × Wetterlage; genau eines der 28 Hintergrundbilder.

## Aggregates
_Noch nicht modelliert — entsteht in `modeling` / bei der Arbeit an Tasks._

## Key events
_Noch offen._

## Key commands
_Noch offen._

## Relationships with other contexts
- **Upstream of:** sky-scene.
- **Anticorruption layer to:** externe kostenlose Wetterquelle.
See `../../context-map.md`.

## Open questions
_Siehe `../../vision.md` → Open questions._
