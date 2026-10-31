---
id: 0036
title: CSS-Lackierungen einmalig importieren, Pixelvergleich als Gate, Umstellung in einem Commit
scope: liveries
status: accepted
date: 2026-10-31
supersedes: []
superseded_by: []
related_adrs: [0002, 0003, 0009, 0010, 0029, 0030, 0031, 0032, 0034]
related_tasks: [liveries-ptm0c]
related_research: []
---

# ADR 0036: CSS-Lackierungen einmalig importieren, Pixelvergleich als Gate, Umstellung in einem Commit

Setzt Punkt 6 von ADR 0031 (Umstellung einmalig und vollständig) in ein Verfahren um. Bis zur Umstellung bleibt ADR 0009 in Kraft.

## Context
Die 42 heutigen Lackierungen sind CSS-Variablen-Farbsätze (ADR 0009). ADR 0031 und ADR 0032 legen als Ziel eine JSON-Datei je Airline × Typklasse mit Ebenen, Farbfeldern und einer gemeinsamen Render-Funktion `renderLiverySvg` fest. Offen ist, wie die alten Lackierungen ins neue Format kommen, wie beide Formate bis dahin nebeneinander leben und wie der Schalter umgelegt wird. Kräfte: Der Heimserver läuft wartungsfrei auf dem iPad-Weg Commit, Image, Watchtower (ADR 0030); ein Laufzeit-Schalter wäre Code, der nur für einen einzigen Übergang existiert. Der Import ist verlustbehaftet, weil CSS-Pfade Bögen und Kurven kennen, das Ebenenmodell nur Punkte mit optionaler Rundung.

## Decision
1. **Ein Importskript, einmalig:** `scripts/import-css-liveries.mjs` übersetzt jeden `paint-*`-Pfad einer CSS-Lackierung in eine Pfad-Ebene der neuen Datei. M und L werden Punkte, Q wird ein Punkt mit `via` bei t=0,5, Bögen und kubische Kurven werden zu Punktfolgen abgeflacht (verlustbehaftet, bewusst). Logo-Ankerpunkte werden zu Transformationen einer Logo-Ebene. Die Farben der Triebwerkskörper, Flügel und Höhenleitwerke werden zu den Farbfeldern (ADR 0031, 4a); Pfade landen nur auf Rumpf und Finne.
2. **Deterministisch und nicht zerstörend:** Gleiche Eingabe liefert byte-gleiche Ausgabe. Das Skript überschreibt eine vorhandene Datei, etwa eine von Hand gezeichnete, nur mit `--force`. `--import-only-seen` begrenzt den Import auf Kombinationen, die in den Sichtungen vorkommen (ob dieser Schalter benutzt wird, ist ein offener Punkt).
3. **Zwei Formate nebeneinander, ohne Laufzeit-Mischung:** Bis zur Umstellung liegen die importierten Dateien im Repo und zeigen sich nur in Storybook; die Himmelsszene rendert weiter das CSS-Format. Es gibt kein Laufzeit-Flag und keinen Mischbetrieb je Lackierung.
4. **Gate ist ein Pixelvergleich:** Ein Playwright-Test rendert jede Lackierung alt (CSS) und neu (`renderLiverySvg`) und vergleicht sie mit einer Toleranz von etwa 1 %. Abweichungen kommen als Liste an den Betreiber (Papa), der sie nachzeichnet oder akzeptiert. Die Liste blockiert die Umstellung nicht; blockierend ist nur, dass der Test läuft und die Liste vorliegt.
5. **Umstellung in einem Commit:** Die Himmelsszene wechselt auf `renderLiverySvg`; entfernt werden das CSS-Format, die `--skin-*`-Variablen, der zugehörige Test und das Importskript selbst. ADR 0009 wird für Lackierungen als superseded markiert. Eine Typklasse oder Airline ohne Datei zeigt die weiße Standard-Lackierung (ADR 0031, 1).
6. **Rückweg:** `git revert` des Umstellungs-Commits plus Watchtower. Es braucht keinen zweiten Mechanismus.

## Consequences
### Positive
- Der Wechsel ist ein einzelner, nachvollziehbarer und umkehrbarer Commit; im Betrieb gibt es nie zwei Wahrheiten.
- Der Pixelvergleich macht sichtbar, was der verlustbehaftete Import verändert hat, ohne den Betreiber zum Warten zu zwingen.
- Nach der Umstellung bleibt kein Übergangscode zurück: kein Flag, kein Importskript, keine `--skin-*`.

### Negative
- Abweichungen bei Bögen und kubischen Kurven sind zu erwarten und müssen von Hand nachgezeichnet werden.
- Bis zur Umstellung hält das Repo zwei Formate; Pflege der CSS-Lackierungen kostet in dieser Zeit doppelt oder wird eingefroren.
- Das Importskript wird nach einmaliger Benutzung gelöscht; ein erneuter Import erfordert den Git-Verlauf.

### Neutral
- Der Pixelvergleich gehört zum Übergang und wird mit der Umstellung nicht Teil der Dauer-Testsuite; ob die Story-Abnahme nach ADR 0034 ihn ersetzt, regelt dieser ADR nicht.

## Alternatives considered
- **Laufzeit-Flag (altes oder neues Format wählbar)** — Code und Konfiguration nur für einen Übergang, zwei Renderwege dauerhaft zu testen; der Rückweg per Revert genügt.
- **Mischbetrieb je Lackierung** — verlängert die Zeit mit zwei Formaten und macht die Himmelsszene abhängig von einer Tabelle, welche Lackierung wo steht.
- **Kein Import, alles neu zeichnen** — verwirft Arbeit, die in 42 Lackierungen steckt, und lässt den Betreiber ohne Basis starten.

## Offene Punkte
- Import für alle Typklassen je Airline oder nur für die gesehenen (`--import-only-seen`)? Alle Typklassen halten die Dateien vollständig, erzeugen aber Kombinationen ohne Nutzen (ADR 0031: Pflege ohne Nutzen). Nur die gesehenen schließen den Editor-Lücken-Filter früher, lassen den Rest weiß.

## References
- ADR 0031 (Entscheidung zur Umstellung, Punkt 6), ADR 0032 (Dateiformat, `renderLiverySvg`), ADR 0034 (Storybook-Gate), ADR 0009 (CSS-Lackierungen), ADR 0010, ADR 0030, ADR 0002, ADR 0003, ADR 0029
- Task liveries-ptm0c, Architekten-Entwurf 2026-10-31

