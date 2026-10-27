---
id: ADR-0009
title: Design-system layout, livery variable standard, 4:3 default and asset pipeline
scope: design-system
status: accepted
date: 2026-10-26
related_tasks: [design-system-001]
related_adrs: [0002, 0003, 0004]
---

# ADR-0009: Design-system layout, livery variable standard, 4:3 default and asset pipeline

## Context
The first package.json of the repo is created by the styleguide task. Layout, the livery-definition variant, the format default and how SVG assets reach components had to be fixed once (ADR 0002: Storybook and app import the same modules; ADR 0004: Storybook `html` renderer, esbuild target es2020/safari16).

## Decision
- **Layout.** Framework-free components in `src/client/ui/` (folders `atoms`, `molecules`, `organisms`, `templates`, `pages`, `transitions`, `domain`, `styles`, `tokens`, `assets`), `src/client/ui/index.ts` is the public surface the app client imports. Stories sit in `src/client/ui/stories/` and are not imported by the app. The server will live in `src/server/`, the app client in `src/client/app/`. Tests: `tests/unit` (Vitest, jsdom), `tests/e2e` (Playwright).
- **Components** are functions returning `HTMLElement` (props in, DOM out), styled by classes in `styles/ui.css` and `cqw` units like the drafts; no framework, no Storybook import.
- **Livery variant.** `Flugzeugmodelle.html` and `Screens.html` carry an identical livery table; the plane SVGs reference `--skin-aft-sweep-N`, `--skin-fin-*` etc. and nowhere `--skin-tailband`. The standard is that table, verbatim, as `domain/liveries.ts`; a unit test asserts every livery variable is used by some plane SVG.
- **Format.** Templates, pages and transitions default to 4:3; 5:3 is an `aspect` control plus an "Entwurf 5:3" viewport. Story viewports: iPad Pro 12,9" and iPad 9,7" landscape.
- **Assets.** Cleaned SVGs (c2pa metadata and the empty `d="M Z"` path removed) are committed in `src/client/ui/assets/svg/`; `scripts/build-assets.mjs` generates git-ignored string modules (`assets/generated/*.ts`) before test/storybook builds. Logos whose PNG is missing in the repo are rendered as dashed placeholders until the PNGs are added.
- **Safari 16 guard.** A unit test bundles `ui/index.ts` with esbuild `--target=es2020,safari16`.
- **E2E.** One Playwright test renders every story from the built Storybook's `index.json` and fails on page/console errors. Projects: `webkit` (required) and `chromium` (fallback where WebKit cannot launch).

## Consequences
- Generated asset modules (~600 KB) are part of any client bundle importing `ui/index.ts`; code-splitting per asset kind can follow if needed.
- Adding a UI element = new component module + story + unit test; nothing is copied between Storybook and app.
- The 13 missing logo PNGs must be supplied for those logos to look like the drafts.

## Note on ADR numbering

Minted provisionally as ADR-0007 in its worker worktree. A sibling task's ADR already claimed that number (or the guess overshot the true count) by the time this task's conductor finalized numbering at squash-merge integration (`lib/adr-allocation.mjs`'s `finalizeAdrNumbering`, ADR-0058) — this ADR was renumbered to **ADR-0009**, the true next-free number on `main` at that moment. No content besides this identity changed.
