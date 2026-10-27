---
id: infrastructure-d3v7k
title: Geräteabnahme des Walking Skeletons auf ZimaOS-Heimserver und echtem iPad
status: backlog
type: chore
context: infrastructure
created: 2026-10-27
completed:
depends_on: [infrastructure-001-walking-skeleton]
blocks: []
tags: [walking-skeleton, operator, device]
related_adrs: [0004, 0005, 0008, 0011, 0012]
related_research: [free-flight-weather-tts-apis-2026-10-26]
prior_art: [infrastructure-001-walking-skeleton]
---

## Why
Der Walking Skeleton wurde in der Cloud gebaut und dort im Mock-Modus und per E2E geprüft. Die Kriterien, die echte Hardware, den echten Standort und echte Ohren brauchen, kann nur der Betreiber vor Ort prüfen.

## What
Der Betreiber deployt den Skeleton auf den ZimaOS-Heimserver, öffnet ihn auf dem iPad und hält die Befunde fest. Die genaue Schritt-für-Schritt-Anleitung steht im README bzw. Outcome von infrastructure-001-walking-skeleton.

## Acceptance criteria
- [ ] Mit `config.yaml` auf dem echten Standort und Default-Radius 30 km startet der Dienst per `docker compose up` auf dem Heimserver; `/healthz` meldet OK; das iPad zeigt die Szene unter der LAN-URL. [human-eye]
- [ ] Innerhalb von 60 s erscheinen die real im Umkreis fliegenden Flugzeuge (gegengeprüft mit einem öffentlichen Tracker): korrekte Typklasse, höchstens die 2 nächsten, Callsign/Typ/Höhe in der Info-Leiste. [human-eye]
- [ ] Tippen spricht eine verständliche deutsche Zeile über den iPad-Lautsprecher (Piper-Container). [human-eye]
- [ ] Playwright-E2E laufen auf dem Betreiber-Rechner auch unter WebKit grün (`npx playwright test --project=webkit`).
- [ ] Befunde festgehalten: (a) iPad-Modell, iPadOS- und Safari-Version, Bestätigung der Mindestgrenze Safari 16; (b) deutsche Sprachausgabe über Server-Audio / `speechSynthesis` / beides / keins; (c) Anteil der Callsigns mit brauchbarer Route in einer Stunde Stichprobe.

## Notes
- Ausgelagert aus infrastructure-001-walking-skeleton (Betreiber-Entscheidung 2026-10-27), weil die Cloud-Umgebung weder Heimserver noch iPad noch den echten Standort hat.
- Die Befunde (b) und (c) beantworten offene Fragen der Vision (Vorlesestimme, Routen-Abdeckung).
