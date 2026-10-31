---
id: 0035
title: Lackierungs-Editor als lokaler Vite-Dev-Server mit Schreib-Plugin unter tools/, nie im Client-Bundle oder Docker-Image
scope: livery-editor
status: accepted
date: 2026-10-31
supersedes: []
superseded_by: []
related_adrs: [0002, 0003, 0031, 0032, 0033, 0034]
related_tasks: [livery-editor-rv382]
related_research: []
---

# ADR 0035: Lackierungs-Editor als lokaler Vite-Dev-Server mit Schreib-Plugin unter tools/, nie im Client-Bundle oder Docker-Image

Baut auf ADR 0031 (Editor läuft auf dem Mac und schreibt Dateien ins Repo), ADR 0032 (Dateiformat und gemeinsame Render-Funktion), ADR 0033 (zwei lesende Heimserver-Endpunkte über `server.proxy`) und ADR 0034 (Betreiber-Werkzeug ist vom Storybook-Gate ausgenommen).

## Context
Der Editor läuft auf dem Mac aus dem Repo heraus und schreibt Lackierungsdateien ins Repo, die Papa committet (ADR 0031). Offen war: wie er gestartet und bedient wird, wie er auf die Platte schreibt und wie sichergestellt ist, dass nichts davon aufs iPad oder in das Server-Image gelangt.

Kräfte: Ein Browser darf nicht frei ins Dateisystem schreiben, also braucht der Editor einen kleinen lokalen Schreibdienst. Format, Renderer und Assets existieren schon in `src/client/ui` (ADR 0032) und dürfen nicht kopiert werden, sonst driften Editor und iPad auseinander. Vite ist über Storybook bereits Abhängigkeit. Das Server-Image baut aus `npm run build` den Client (Entry `main.ts`) und den Server; alles andere im Repo-Stamm gelangt über `COPY . .` in die Build-Stufe, wenn es nicht ausgeschlossen ist.

## Decision
1. **Ein Vite-Dev-Server, nur lokal.** Der Code liegt unter `tools/livery-editor/`. Start mit `npm run editor`. Der Server bindet an `127.0.0.1:5174`, nie an eine andere Schnittstelle. Es gibt keinen Produktions-Build des Editors.
2. **Keine Kopien.** Der Editor importiert Dateiformat, Render-Funktion und Assets (Silhouetten, Detailschichten) aus `src/client/ui`. Der Editor besitzt kein eigenes Format und keinen eigenen Renderer.
3. **Das Schreib-Plugin ist der einzige Schreibweg.** Ein Vite-Plugin im Editor-Verzeichnis nimmt Speicheraufträge entgegen und
   - validiert die Lackierungsdatei mit zod gegen das Format aus ADR 0032,
   - erlaubt nur Zielverzeichnisse einer festen Allow-List (Lackierungsdateien, Logo-Assets) und leitet Zielpfad und Dateiname aus Airline-Präfix und Typklasse ab, nie aus freien Pfadangaben des Clients,
   - schützt gegen Path-Traversal (aufgelöster Pfad muss unter einem Allow-List-Verzeichnis liegen),
   - schreibt atomar (temporäre Datei, dann Umbenennen),
   - stößt danach `build-assets` an, damit Storybook und Himmelsszene die neue Datei sehen.
4. **Pfadgeometrie selbst geschrieben.** Punkte, Shift-Zwang, Rundung über den Mittelpunkt eines Segments und Treffertest sind eigener, getesteter Code. Keine Zeichenbibliothek (kein paper.js, kein fabric).
5. **Nichts wird ausgeliefert.** Der Client-Build-Entry bleibt `main.ts`; der Editor ist von dort nicht erreichbar. `tools/` kommt in `.dockerignore`, damit der Editor weder in Build-Stufe noch Image landet.
6. **Server-Zugriff.** Der Editor erreicht den Heimserver nur über `server.proxy` (ADR 0033) auf `PLANESABOVE_HOME_URL`. Die URL kommt aus der Mac-Umgebungsvariable oder aus der git-ignorierten Datei `tools/livery-editor/.env.local`. Die reale `config.yaml` ändert sich nicht.
7. **Storybook-Gate.** Nach ADR 0034 braucht die Betreiber-Werkzeug-Oberfläche keine Storybook-Story; die gezeigte Lackierung (Render-Funktion) behält ihre.

## Consequences
### Positive
- Kein Zusatzserver, keine neue Laufzeitabhängigkeit: Vite ist durch Storybook schon da, Start ist ein Befehl.
- Eine einzige Quelle für Format, Renderer und Assets; Editor zeigt exakt, was das iPad zeigt.
- Der Schreibweg ist klein, prüfbar und eng: Allow-List, zod und Traversal-Schutz verhindern, dass ein Fehler im Editor beliebige Dateien überschreibt.
- Heimserver und Image bleiben unberührt und ohne Schreib-Oberfläche.

### Negative
- Pfadgeometrie und Treffertest sind eigener Code und eigener Testaufwand.
- Der Editor lebt nur, solange der Dev-Server läuft; ohne Mac, Node und Heimserver-Erreichbarkeit gibt es keine Lücken-Ansicht.
- `tools/` muss bei Typprüfung und Tests bewusst berücksichtigt werden (siehe offene Punkte).

### Neutral
- Der Weg aufs iPad bleibt Commit, Image, Watchtower (ADR 0031).
- Port 5174 liegt neben Storybook (6006) und der App; Kollisionen sind lokal lösbar.

## Alternatives considered
- **Node-Skript plus esbuild-Watch** — eigener Dev-Server und eigene HMR-Mechanik nachgebaut, obwohl Vite vorhanden ist; mehr Eigenbau, kein Gewinn.
- **Editor innerhalb von Storybook** — vermischt Anzeige-Katalog und Betreiber-Werkzeug, Storybook hat keinen Schreibweg und wird auch statisch gebaut; Schreib-Endpunkt gehörte dann in einen öffentlich gebauten Katalog.
- **File System Access API** — nur Chromium, Verzeichniszugriff muss je Sitzung erteilt werden, keine serverseitige Validierung, kein Anstoß von `build-assets`.
- **paper.js oder fabric** — große Abhängigkeit für wenig Nutzen; die benötigte Geometrie (Polygone, Bézier über einen Mittelpunkt, Treffertest) ist klein und muss ohnehin das Dateiformat treffen.
- **Schreibender Endpunkt im Heimserver** — erste schreibende Oberfläche auf einem wartungsfreien System, widerspricht ADR 0031.

## Offene Punkte
- Der Betreiber hat den Entwurf noch nicht ausdrücklich bestätigt; Akzeptanzkriterium „[human-eye]" der Task bleibt bis zu seiner Antwort offen.
- Genaue Allow-List-Verzeichnisse (Lackierungsdateien, Logo-Assets) und Dateinamensschema legt das Format-Task (ADR 0032) fest; das Plugin übernimmt sie.
- Ob `tools/` in `tsconfig`/`npm run typecheck` und in die Vitest-Läufe (`npm test`) aufgenommen wird: Vorschlag ja, bei der Umsetzung entscheiden.
- Ob der Port 5174 fest ist (Start schlägt bei Belegung fehl) oder ausweicht: Vorschlag fest, damit die URL stabil bleibt.

## References
- ADR 0002 und 0034 (Storybook-first, Gate-Grenze), ADR 0031 (Editor auf dem Mac), ADR 0032 (Format, Render-Funktion), ADR 0033 (`server.proxy`, lesende Endpunkte), ADR 0030 (Konfigurationsschichten)
- `package.json` (Skripte `assets`, `storybook`), `Dockerfile` (`COPY . .`, `npm run build`), `.dockerignore`

