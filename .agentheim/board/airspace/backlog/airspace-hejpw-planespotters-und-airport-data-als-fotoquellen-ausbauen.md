---
id: airspace-hejpw
title: Planespotters und Airport-Data als Fotoquellen ausbauen — Bildqualität zu schlecht, nur Wikimedia Commons bleibt
status: backlog
type: feature
context: airspace
created: 2026-10-31
completed:
depends_on: [airspace-vcytm]
blocks: []
tags: [foto, qualitaet, planespotters, airport-data, commons, lizenz]
related_adrs: [0029]
related_research: [aircraft-photo-sources-2026-10-31]
prior_art: [airspace-gw6w9, airspace-vcytm]
---

## Why
Planespotters liefert über die kostenlose API nur 280 px hohe Vorschauen, Airport-Data ebenfalls nur kleine Thumbnails. Auf dem iPad im Vollbild-Overlay wirken beide unscharf (Betreiber-Befund 2026-10-31 am laufenden Dienst). Wikimedia Commons liefert Vorschauen in beliebiger Größe (aktuell 1600 px) und ist zudem die einzige lizenzklare Quelle. Zwei Quellen mitzuschleppen, deren Bilder nicht gezeigt werden sollen, kostet Requests, Terms-Pflichten (Planespotters: QR-Link-back, User-Agent-Regeln) und Code.

## What
Die Adapter `planespotters` und `airport-data` samt Fixtures, Tests und Einträgen in `PHOTO_SOURCE_NAMES`, Config-Schema und `config.example.yaml` entfernen; Default-Kette `[commons]`. Der Port, die Kette, der Cache und der Endpunkt bleiben, damit eine weitere Quelle später wieder einhängbar ist. Stichproben-Skript entsprechend verschlanken. README-Einträge (Fotoquelle, Fotoquellen-Kette) und ADR 0029 (Amendment: Quellen entfernt, Begründung Bildqualität) nachziehen.

## Acceptance criteria
- [ ] Keine Referenz auf planespotters/airport-data mehr in `src/`, `tests/`, `scripts/`, `config.example.yaml`; Config-Schema akzeptiert nur noch `commons` in `sources.photo.order`; eine alte config.yaml mit `planespotters` in `order` ergibt eine klare Validierungsmeldung.
- [ ] Ketten-/Cache-/Endpunkt-Tests laufen mit Commons als einziger Quelle grün; `/healthz` zeigt nur noch `commons` unter `photo.sources[]`.
- [ ] `npm test`, `npm run typecheck` grün.

## Notes
- Offen für REFINE: Entfernen oder nur per Default abschalten? Der Betreiber hat „Ausbau“ gesagt; dieser Task entfernt. Falls später doch gewünscht, ist der Adapter aus der Git-Historie (airspace-gw6w9) wiederherstellbar.
- Folge: Trefferquote sinkt (Stichprobe 2026-10-31: Commons 19/30, mind. eine Quelle 24/30). Kleinflugzeuge haben bei Commons kaum Fotos — Kein Foto wird häufiger.
- Design-System: der QR-Link-back (design-system-g83gh) bleibt sinnvoll (Commons-Attribution mit Link), muss nicht zurückgebaut werden. Prüfen, ob Terms-spezifische Prosa (Planespotters) in README/ADR 0029 als historisch markiert wird.
