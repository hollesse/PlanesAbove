# Index

Top-level catalog of this project's bounded contexts, global decisions, and research.
For BC-scoped artifacts, see each BC's `INDEX.md`.

> Updated by: `modeling` (BC creation), `work` (global ADRs), `research` (reports tagged global / cross-BC), backfill script.
> Hand-edits are fine but the skills will append at the section markers below.

---

## Bounded contexts

<!-- bc-list:start -->
- **livery-editor** — Papas Desktop-Werkzeug zum Zeichnen von Lackierungen: Lücken-Filter, Referenzfoto, Pfadwerkzeug, Ebenen, Logos; schreibt Dateien ins Repo — `contexts/livery-editor/INDEX.md`
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
- **0033** — Sichtungen je Airline x Typklasse und Referenzfotos über zwei lesende Endpunkte des Heimservers — 2026-10-31 — `decisions/0033-sightings-by-class-and-reference-photo-read-endpoints.md`
- **0031** — Lackierung je Airline × Typklasse als ungeschnittene Pfaddatei im Repo; Silhouette und Detailschicht getrennt; Zuschnitt beim Anzeigen — 2026-10-31 — `decisions/0031-livery-per-airline-and-typeclass-as-unclipped-path-file-in-repo.md`
- **0030** — Drei-Schichten-Konfiguration: Defaults im Repo, Pflichtwerte und Secrets per Umgebungsvariable, optionale Override-Datei — 2026-10-31 — `decisions/0030-layered-config-defaults-in-repo-env-vars-optional-override.md`
- **0011** — Health endpoint, dead-man's-switch heartbeat and structured logs — 2026-10-26 — `decisions/0011-health-endpoint-heartbeat-and-structured-logs.md`
- **0008** — Docker Compose app on ZimaOS; self-recovering iPad kiosk client — 2026-10-26 — `decisions/0008-compose-on-zimaos-and-self-recovering-ipad-kiosk.md`
- **0007** — SQLite single-file storage (better-sqlite3) and validated YAML configuration — 2026-10-26 — `decisions/0007-sqlite-single-file-and-validated-yaml-config.md`
- **0004** — Home-server service computes state; iPad is a thin vanilla-JS browser client — 2026-10-26 — `decisions/0004-home-server-service-thin-vanilla-js-client.md`
- **0003** — Test-driven development with unit tests; Playwright E2E tests against mocked external APIs — 2026-10-26 — `decisions/0003-tdd-unit-tests-and-playwright-e2e-with-api-mocks.md`
- **0002** — Storybook-first UI development following Atomic Design — 2026-10-26 — `decisions/0002-storybook-first-atomic-design.md`
- **0001** — Single-household, self-hosted tool using only free data sources — 2026-10-26 — `decisions/0001-single-household-self-hosted-free-data-only.md`
<!-- adr-global:end -->

## Cross-BC research

Research reports relevant to more than one BC (or to the project as a whole). BC-specific
reports are listed in each BC's `INDEX.md`.

<!-- research-global:start -->
- **aircraft-photo-sources** — Kostenlose Fotoquellen je Flugzeug (Hex/Kennzeichen): Planespotters keyless, 1 Foto, strenge Terms (Bild vom Gerät laden, Credit+Link); Wikimedia Commons lizenzklar CC, mehrere; Airport-Data/hexdb ohne Terms; JetPhotos/Airliners.net keine API (Reviewer: PASS) — 2026-10-31 — `research/aircraft-photo-sources-2026-10-31.md`
- **free-flight-weather-tts-apis** — Verifikation der kostenlosen Flug-, Routen-, Wetter-, Stammdaten- und TTS-Quellen (Reviewer: PASS) — 2026-10-26 — `research/free-flight-weather-tts-apis-2026-10-26.md`
<!-- research-global:end -->

## Pointers

- Vision: `vision.md`
- Context map: `context-map.md`
- Protocol (chronological log): `../board/protocol.md` — newest entries on top
- All ADRs: `decisions/`
- All research: `research/`
