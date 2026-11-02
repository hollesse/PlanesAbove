---
id: livery-editor-c24r8
title: Reference-photo gallery - the newest Commons photo for each registration, up to 20 to click through
status: done
type: feature
context: livery-editor
created: 2026-11-02
completed:
depends_on: []
blocks: []
tags: [editor, referenzfoto, commons, galerie]
related_adrs: [0033, 0034, 0007, 0039]
related_research: []
prior_art: [airspace-yvdbz]
---

## Why
The editor's photo panel currently shows only the first Commons hit for the first of at most 3 samples (`MAX_SAMPLES = 3` in `src/server/modules/sighting-log/sightings-by-class.ts`, not deduplicated by registration). The Commons order is search relevance, not date (`src/server/modules/airspace/adapters/commons-photo-source.ts`). Different liveries of the same airline × type class therefore stay invisible.

What the operator wants: when a type has several sightings, show one photo per registration, namely the newest photo of that registration, at most 20, in a gallery to click through.

## What
- **sighting-log:** the samples per airline × type class are deduplicated by registration (newest sighting first), up to 20. Sightings without a registration count neither toward the 20 nor as a sample, because a photo needs a registration. `stats-api.ts` also passes on the samples; it must keep working.
- **airspace:** `GET /api/photos/reference` returns that registration's photos sorted newest first. "Newest" means `DateTimeOriginal` from the Commons extmetadata, falling back to the upload timestamp. The photo object carries this date. Unchanged: Commons only, and only hexes that have been sighted (ADR 0033).
- **livery-editor:** the photo panel (under the board) becomes a gallery:
  - one image per registration, ‹ › buttons, position "3 / 12";
  - caption: registration, photo date, then photographer · source · licence · link;
  - loading: the first photo immediately and the next one prefetched in the background, never 20 requests at once;
  - registrations without a Commons hit are skipped;
  - "Kein Foto" appears only if no registration has a photo, and "Foto nicht verfügbar" only if every request failed;
  - switching airline or type cancels any loading still in flight (the existing `photoRequest` pattern).

## Acceptance criteria
- [ ] Unit (sighting-log): 25 sightings of 22 distinct registrations for one airline × type class give 20 samples, all with distinct registrations, sorted by newest sighting first. Sightings without a registration don't appear among the samples.
- [ ] Unit (airspace/Commons): photos are sorted by `DateTimeOriginal` descending, falling back to the upload timestamp; the date field is set on every photo.
- [ ] Editor E2E (mocked `/api`): with 3 registrations, one of them without a photo, the gallery shows "1 / 2". › leads to the second photo, whose registration is in the caption; ‹ goes back.
- [ ] Editor E2E (mocked `/api`): requests are sequential. At most the current and the next photo are being loaded at once.
- [ ] The existing photo-panel E2E states ("Keine Sichtung gewählt", "Kein Foto", "Foto nicht verfügbar") stay green. The editor E2E tests run at the default 1280 px viewport.
- [ ] No new or changed config.yaml key (Reale config.yaml anpassen: nein).
- [ ] When clicking through, different liveries of the same airline can be told apart (in the running editor). [human-eye]

## Notes
- Editor-own UI is outside the Storybook gate (ADR 0034) and is accepted by the operator in the running editor.
- Commons is free; the paid AeroAPI is not involved (FlightAware rule unaffected).
- Decided on 2026-11-02 with the operator: load lazily (current + next), skip registrations without a photo.
- Locally, port 5174 is occupied by the operator's running editor. Run the editor E2E with a temporary config on a different port (e.g. `npm run editor -- --port 5175`), because CI does run them.

## Verifier note (iteration 1)
**REASONS:**
- Check 6b (honored related ADRs): ADR 0033 Decision §1 (line 27) states `/api/stats/sightings-by-class` returns "höchstens 3 Beispiel-Sichtungen"; the diff changes this (MAX_SAMPLES = 20, one per registration, no samples without registration) and also changes the `/api/photos/reference` contract of §2 / the airspace-yvdbz amendment (newest-first by DateTimeOriginal with upload-timestamp fallback, new `Photo.date`), but `ADRS_WRITTEN: none` and the `adrs` block is empty — no ADR/amendment records the contract change. The task text does not substitute for an ADR.
- Check 5 (README sync): the readmeDelta only appends an English "Referenzfoto-Galerie" bullet; the existing **Referenzfoto** bullet (README line 15) still says the Fotopanel "zeigt das erste Foto mit Fotograf, Quelle, Lizenz und Link", which now contradicts the gallery. The section is German.
- Minor (non-blocking): when a Commons page has neither DateTimeOriginal nor an upload timestamp, `ms` falls back to 0 and the caption would show 1970-01-01, although the `Photo.date` doc comment says the field is absent when the source gives none — leave `date` unset in that case.

**SUGGESTED_FIX:** Supply an ADR (or an amendment to ADR 0033 per the project's convention) via the `adrs` block recording: up to 20 samples, one per registration, newest first, no samples without registration; newest-first sorting and the new `Photo.date` on `/api/photos/reference`. Change the readmeDelta to a German `replace` op on the existing **Referenzfoto** bullet (Fotopanel = Galerie, ein Foto je Kennzeichen, ‹ ›, Position, Beschriftung) instead of appending an English bullet. No functional code changes needed (apart from the optional 1970 fix).

**ITERATION_HINT:** likely-fixable

## Outcome

The editor photo panel is now a gallery. sighting-log: samples per airline x type class are deduplicated by registration (newest sighting first), at most 20 (MAX_SAMPLES), sightings without registration are no samples. airspace: CommonsPhotoSource requests the upload timestamp too, sorts photos newest first by DateTimeOriginal (fallback upload timestamp) and sets the optional Photo.date (ISO 8601); a photo with neither carries no date and sorts last. livery-editor: tools/livery-editor/src/main.ts renders prev/next buttons, "n / total" (suffix "+" while unresolved registrations remain), caption with registration and date, loads sequentially (first immediately, next prefetched), skips registrations without a photo; "Kein Foto" / "Foto nicht verfügbar" semantics kept; switching airline/type cancels via photoRequest. The panel stays below the board. The contract change is recorded in ADR 0039 (amends ADR 0033 section 1 and 2).

Tests: unit for sample dedupe/limit/order, Commons date sorting, fallback and the undated case; editor E2E for "1 / 2" with one photo-less registration plus prev/next and caption, and sequential loading (max 1 in flight, only current+next asked). The former E2E assertion "third sample is not asked" became "third is prefetched". Full editor E2E suite (30 tests, default viewport, temp config, removed), vitest (891) and typecheck green. No config.yaml change. The [human-eye] criterion is for the operator.
