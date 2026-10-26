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
- **WeatherSource** — port through which the weather context obtains current conditions; the Open-Meteo adapter is the anticorruption layer translating WMO codes, cloud cover and visibility into a Wetterlage (ADR 0006). Bright Sky (DWD) is the documented alternative adapter.
- **Sonnenhöhe (solar elevation)** — angle of the sun above the horizon at the configured lat/lon, computed locally with no network; with morning/evening direction it determines the Tageszeit. Thresholds are config values (defaults: Nacht below -6°, Dämmerung -6° to +4°, Tag above +4°).
- **Quellenangabe (attribution)** — the Open-Meteo credit line (link, credit, CC BY 4.0 licence link) that must be visible in an info/about view of the display.

## Aggregates
_Noch nicht modelliert — entsteht in `modeling` / bei der Arbeit an Tasks._

## Key events
_Noch offen._
- Wetterlage mapping invariant: every WMO code (including unknown ones) maps to exactly one of the 7 Wetterlagen; on source failure the last known Wetterlage is kept, and before any success it defaults to Klar.

## Key commands
_Noch offen._

## Relationships with other contexts
- **Upstream of:** sky-scene.
- **Anticorruption layer to:** externe kostenlose Wetterquelle.
See `../../context-map.md`.

## Open questions
_Siehe `../../vision.md` → Open questions._
