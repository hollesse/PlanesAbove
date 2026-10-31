---
id: livery-editor-zc7hk
title: Spike: Editor-Durchstich — Narrowbody-Silhouette, Lackierungsdatei, Render-Funktion, Pfad zeichnen, speichern, in Storybook sehen
status: todo
type: spike
context: livery-editor
created: 2026-10-31
completed:
depends_on: [liveries-w35k0, livery-editor-rv382, infrastructure-cc9gq, liveries-ptm0c, infrastructure-nwwcq, infrastructure-m6nj3]
blocks: []
tags: [spike, foundation, walking-skeleton]
related_adrs: [0031]
related_research: []
prior_art: []
---

## Why
Der erste Beweis, dass die Kette steht: leere Silhouette im Editor, ein Pfad gezeichnet, als Datei gespeichert, in Storybook identisch gerendert, nichts davon im Client-Bundle. Feature-dünn, Architektur-dick. Erst danach lohnt der Ausbau zu Ebenen, Rundung, Logos, Lückenliste und Referenzfoto.

## What
Nur Narrowbody, keine Serverdaten, keine Logos, keine Rundung, eine Farbe:
1. `silhouette.svg` und `details.svg` für narrowbody mit `<g id="body">` (Triebwerkskörper in der Silhouette, Einlass/Fan in den Details).
2. Schema `livery-file.ts`, Funktion `renderLiverySvg`, eine erzeugte Story „Liveries/Pfade“.
3. `npm run editor`: Typklassen-Auswahl, Zeichenbrett mit Deckkraft-Regler für Silhouette/Details, Pfadwerkzeug (Klicks setzen Punkte, Pfad schließen), eine Farbe, Speichern mit Lackierungs-ID.
4. Vite-Schreib-Plugin mit Validierung und Pfadschutz.

## Acceptance criteria
- [ ] `npm run editor` öffnet http://127.0.0.1:5174 mit sichtbarer Narrowbody-Silhouette und Detailschicht.
- [ ] Vier Klicks plus Schließen ergeben ein gefärbtes Viereck; wo es über die Silhouette hinausgeht, ist es sichtbar zugeschnitten; bei Silhouetten-Deckkraft 0 % ist es ungeschnitten zu sehen.
- [ ] Speichern als `spike` erzeugt genau `src/client/ui/assets/liveries/spike/narrowbody.json` mit 4 Punkten und der gewählten Farbe; eine ID mit `../` liefert 400 und schreibt nichts.
- [ ] Ohne Neustart zeigt Storybook die Story „Liveries/Pfade/spike – narrowbody“ mit demselben Bild wie das Zeichenbrett (Playwright-Chromium-Pixelvergleich innerhalb der Toleranz).
- [ ] `npm run build` gefolgt von `grep -r livery-editor dist/` findet nichts; der Docker-Kontext enthält kein `tools/`.
- [ ] Unit-Tests für Schema-Roundtrip, clipPath-ID-Eindeutigkeit und Schreibschutz sind grün, ebenso der WebKit-Story-Lauf.
- [ ] Der Betreiber hat den Durchstich am Mac ausprobiert und bestätigt, dass sich das Zeichnen richtig anfühlt. [human-eye]

## Notes
- **Stop-loss (ADR 0065):** Wenn sich mitten im Spike zeigt, dass die Minderung bereits bekannt und billig ist, aufschreiben und stoppen (record it and stop). Gleiches gilt, wenn sich der Zuschnitt (Flügel hinter dem Rumpf, Umriss-Stroke) als untauglich erweist: Befund notieren, nicht weiterbauen.
- Der Spike beantwortet die offene Frage, ob der hintere Flügel einen eigenen Zuschnittbereich braucht.
- Reale config.yaml anpassen: nein.
