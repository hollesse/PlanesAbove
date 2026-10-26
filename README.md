# PlanesAbove

Der Himmel über dem Haus: eine Anzeige, die zeigt, welches Flugzeug gerade über dem Haus fliegt (siehe `.agentheim/knowledge/vision.md`).

## Design-System (Storybook)

Alle visuellen Bausteine entstehen zuerst als Story in Storybook (ADR 0002) und werden vom Betreiber abgenommen.

```
npm install
npm run storybook          # Entwicklungsserver, http://localhost:6006
npm run build-storybook    # statische Seite nach storybook-static/
npm test                   # Unit-Tests (Vitest, jsdom)
npm run typecheck
npm run e2e                # Playwright: alle Stories rendern fehlerfrei (WebKit + Chromium)
npm run e2e:chromium       # nur Chromium (falls WebKit lokal nicht startet)
```

`npm run e2e` baut Storybook vorher selbst. Die Asset-Module werden von `npm run assets` erzeugt (läuft automatisch vor `test`, `storybook`, `build-storybook`).

### Layout

```
src/client/ui/            Framework-freie Komponenten; Storybook UND spaeter die App importieren genau diese Module
  index.ts                oeffentliche Oberflaeche (Barrel)
  domain/                 Katalog (Typklassen, Himmel, Lackierungen), Flugdaten-Formatierung, Beispieldaten
  atoms/ molecules/ organisms/ templates/ pages/   eine Ebene = ein Ordner
  transitions/            Uebergaenge (Spezifikation + Player), Keyframes in styles/transitions.css
  styles/                 tokens.css (lokale Schriften), ui.css, transitions.css
  tokens/fonts/           Archivo 900, IBM Plex Mono 400/500 (woff2, lokal)
  assets/svg/             bereinigte SVG-Assets aus den Entwuerfen (Quelle der Wahrheit)
  assets/generated/       von scripts/build-assets.mjs erzeugt (git-ignoriert)
  stories/                Stories, Titel Atoms/ Molecules/ Organisms/ Templates/ Pages/
tests/unit  tests/e2e     Vitest bzw. Playwright
.storybook/               Storybook-Konfiguration (html-vite, Viewports iPad Pro 12,9" / iPad 9,7" / Entwurf 5:3)
```

Spaeter kommen `src/server/` (Heimserver-Dienst) und `src/client/app/` (App-Client, bundelt mit esbuild `--target=es2020,safari16`) daneben.
