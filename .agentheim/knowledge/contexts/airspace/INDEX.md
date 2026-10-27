# Luftraum (airspace) — Index (knowledge)

Catalog of ADRs, research, and concept synthesis pages scoped to this bounded context.

> Updated by: `work` (BC-scoped ADRs, concept page links), `research` (BC-scoped reports).
> Hand-edits are fine but the skills will append at the section markers below.

---

## ADRs scoped to this BC

<!-- adr-local:start -->
- **0021** — Own airport table for a source-independent route display — 2026-10-27 — `../../decisions/0021-own-airport-table-uniform-route-display.md` — Eigene Flughafentabelle (ICAO zu Stadt + IATA): Routen heißen quellenunabhängig Stadt (IATA), Fallback Anbietername mit einmaliger Warnung, Seed aus VRS, kein Backfill.
- **0019** — Flight source chain: adsb.fi primary, failover to airplanes.live and adsb.lol in the same Takt, per-source backoff after Retry-After/x-ratelimit-reset and circuit breaker (adsb.lol keyless limit 500/day measured) — 2026-10-27 — `../../decisions/0019-flight-source-chain-adsb-fi-primary-with-failover-and-backoff.md`
- **0018** — FlightAware AeroAPI as a budgeted, opt-in, last-resort route source (explicit exception to ADR 0001; own call log + usage sync; key via env) — 2026-10-27 — `../../decisions/0018-flightaware-aeroapi-budgeted-last-resort-route-source.md`
- **0016** — adsbdb live lookup first, VRS snapshot as fallback, adsbdb results never persisted — 2026-10-27 — `../../decisions/0016-adsbdb-live-lookup-first-vrs-snapshot-fallback-never-persisted.md`
- **0015** — Unknown aircraft fall back to light-aircraft; B categories mapped or excluded — 2026-10-27 — `../../decisions/0015-unknown-aircraft-fall-back-to-light-aircraft-b-categories-mapped-or-excluded.md`
- **0014** — VRS standing-data snapshot is the sole default route source; adsb.lol routeset removed — 2026-10-27 — `../../decisions/0014-vrs-snapshot-sole-default-route-source-routeset-removed.md`
- **0010** — Typklasse, Kategorie and airline derived from static curated tables — 2026-10-26 — `../../decisions/0010-typklasse-kategorie-airline-from-static-curated-tables.md`
- **0005** — Free ADS-B position and route sources behind replaceable ports — 2026-10-26 — `../../decisions/0005-free-flight-and-route-sources-behind-ports.md`
<!-- adr-local:end -->

## Research touching this BC

<!-- research-local:start -->
- **flight-position-source-alternatives-2026-10-27** — adsb.lol keyless = 500 Requests/Tag je IP (gemessen); adsb.fi v3 als Drop-in-Primaerquelle (1 req/s, nicht-kommerziell, Quellenangabe), airplanes.live, adsb.one (archiviert), OpenSky 4000 Credits/Tag als Fallback; Backoff/Circuit-Breaker; Eigenempfaenger als Stufe 0 — `../../research/flight-position-source-alternatives-2026-10-27.md`
- **route-coverage-sources-2026-10-27** — Routenabdeckung steigern: keine freie Quelle kennt den getrackten Flug; hexdb +8 Punkte; FlightAware AeroAPI Personal als Last Resort ($5/Monat frei); Heuristiken als Konflikt-Schiedsrichter — `../../research/route-coverage-sources-2026-10-27.md`
<!-- research-local:end -->

## Concepts (opt-in synthesis pages)

<!-- concepts:start -->
<!-- concepts:end -->

## Pointers

- BC README (ubiquitous language, invariants): `README.md`
- Task board (tasks by status) for this BC: `../../../board/airspace/INDEX.md`
