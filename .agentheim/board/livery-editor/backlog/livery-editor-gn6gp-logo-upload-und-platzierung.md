---
id: livery-editor-gn6gp
title: Logo hochladen (SVG/PNG) und als Ebene platzieren, skalieren, drehen; Ablage im Repo über das Schreib-Plugin
status: backlog
type: feature
context: livery-editor
created: 2026-11-01
completed:
depends_on: [livery-editor-nxdzh]
blocks: []
tags: [editor-feedback, logo, ebenen]
related_adrs: [0031, 0032, 0035]
related_research: []
prior_art: [livery-editor-nxdzh, livery-editor-rtnx3]
---

## Why
Lackierungen brauchen Airline-Logos auf Finne und Rumpf. Laut ADR 0031/0032 kommen Logos fertig als Datei von außen; der Editor platziert sie nur (README: „Logo“). Heute gibt es `LogoLayer` nur im Schema, nicht im Editor.

## What
Upload eines SVG oder PNG im Panel, Ablage über das Schreib-Plugin in einem Allow-List-Verzeichnis für Logo-Assets (ADR 0035 §3; Dateiname aus Lackierungs-ID + Logo-Name, nie aus freien Pfaden), Anlegen einer `LogoLayer` (`src`, `x`, `y`, `scale`, `rotation`) im Ebenenstapel, Platzieren per Ziehen, Skalieren und Drehen über Griffe, Rendering in `renderLiverySvg` (zugeschnitten wie Pfade). Bestehende Logos (`assets/svg/logos`, `assets/logos`) als Vorlage anbieten.

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured 2026-11-01 aus Betreiber-Feedback. Braucht Refine: Allow-List-Verzeichnis und Dateinamensschema (ADR 0032 offen gelassen), PNG-Größenlimit, Darstellung in der Himmelsszene (Konsument liveries), Umgang mit den vorhandenen Logo-Assets, Zuschnitt vs. Logo über Farbfeldern (Finne ist Pfadfläche, Flügel Farbfeld).
