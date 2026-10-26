# Index

Top-level catalog of this project's bounded contexts, global decisions, and research.
For BC-scoped artifacts, see each BC's `INDEX.md`.

> Updated by: `modeling` (BC creation), `work` (global ADRs), `research` (reports tagged global / cross-BC), backfill script.
> Hand-edits are fine but the skills will append at the section markers below.

---

## Bounded contexts

<!-- bc-list:start -->
- **sky-scene** — Himmelsszene für Mona: Szene, Übergänge, Steckbrief vorlesen, Vorlese-Sperre — `contexts/sky-scene/INDEX.md`
- **airspace** — Flugzeuge im Umkreis, Anreicherung, Auswahl der zwei nächsten im 30-s-Takt — `contexts/airspace/INDEX.md`
- **weather** — echtes Wetter + Sonnenstand → einer der 28 Himmel — `contexts/weather/INDEX.md`
- **liveries** — Katalog Airline → Lackierung je Typklasse, Fallback weiß — `contexts/liveries/INDEX.md`
- **sighting-log** — schreibt still jede Sichtung mit (Auswertung v2) — `contexts/sighting-log/INDEX.md`
- **infrastructure** — global gültige Technik: Laufzeit, Tablet/Heimserver, Kiosk, Deployment, Konfiguration — `contexts/infrastructure/INDEX.md`
- **design-system** — Styleguide aus den Claude-Design-Entwürfen; Gate für jede UI — `contexts/design-system/INDEX.md`
<!-- bc-list:end -->

## Global ADRs (scope: global)

<!-- adr-global:start -->
- **0001** — Single-household, self-hosted tool using only free data sources — 2026-10-26 — `decisions/0001-single-household-self-hosted-free-data-only.md`
<!-- adr-global:end -->

## Cross-BC research

Research reports relevant to more than one BC (or to the project as a whole). BC-specific
reports are listed in each BC's `INDEX.md`.

<!-- research-global:start -->
<!-- research-global:end -->

## Pointers

- Vision: `vision.md`
- Context map: `context-map.md`
- Protocol (chronological log): `../board/protocol.md` — newest entries on top
- All ADRs: `decisions/`
- All research: `research/`
