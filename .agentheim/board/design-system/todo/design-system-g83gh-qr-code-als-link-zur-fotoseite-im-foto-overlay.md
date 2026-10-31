---
id: design-system-g83gh
title: QR-Code als Link zurück zur Fotoseite im Foto-Overlay (Planespotters-Terms: URL als Text genügt nicht, QR-Code oder Anker Pflicht)
status: todo
type: feature
context: design-system
created: 2026-10-31
completed:
depends_on: [design-system-001-styleguide, design-system-pawdq]
blocks: [sky-scene-xw8jv]
tags: [foto, overlay, attribution, lizenz, qr]
related_adrs: [0029]
related_research: [aircraft-photo-sources-2026-10-31]
prior_art: [design-system-pawdq]
---

## Why
Die Planespotters Photo API Terms of Use (Primärtext vom Betreiber am 2026-10-31 vorgelegt) verlangen, dass das Foto auf seine Seite bei Planespotters zurückführt: im Browser als Anker auf dem Bild, auf einem Kiosk-Display per QR-Code oder NFC. Wörtlich: „Printing or displaying the URL as text does not“ genügen; der Weg zum Original muss „obvious to the person in front of the display“ sein. Das Foto-Overlay (design-system-pawdq) zeigt `pageUrl` bisher nur als Text. Ohne diese Änderung darf Planespotters im Betrieb nicht aktiv sein.

## What
Im Foto-Overlay zeigt jede Foto-Ansicht neben der Attributionszeile einen **QR-Code**, der `pageUrl` unverändert kodiert, groß genug zum Scannen vom Zimmer aus (mindestens 10cqw Kantenlänge), mit kurzer Beschriftung („Foto-Seite“ o. ä.). Der QR-Code wird clientseitig ohne Netzwerk erzeugt (kleiner, eingebetteter Encoder; keine externe QR-API, kein Request an Dritte). Die URL darf zusätzlich als Text stehen, aber der QR-Code ist das Pflichtelement. Gilt für alle Quellen gleich (ein Bildweg, eine Attributionsform). Das Bild selbst bleibt ohne Anker (Kiosk: kein Navigieren weg von der Szene).

## Acceptance criteria
- [ ] Jede Foto-Ansicht (Ein Foto, Galerie) rendert ein `<svg>`/`<canvas>`-Element `.pa-photo-qr`, dessen Inhalt `pageUrl` unverändert kodiert; ein Unit-Test dekodiert den erzeugten QR (z. B. mit `jsqr` als Dev-Dependency) und vergleicht mit `pageUrl`.
- [ ] Der QR-Code wechselt beim Blättern mit dem Foto (Test: nach `next` kodiert er die `pageUrl` des zweiten Fotos).
- [ ] Kantenlänge mindestens `10cqw`, ruhiger Rand (Quiet Zone) vorhanden; Position und feste Textzone so, dass Bild und Pfeile sich nicht verschieben (bestehender Stabilitäts-Befund bleibt gültig).
- [ ] Der Encoder ist eingebettet (eigenes Modul oder vendored, Safari-16-tauglich, keine Laufzeit-Abhängigkeit mit Netzwerk); Bundle-Guard-Test (esbuild safari16) bleibt grün.
- [ ] Zustände „Lädt“ und „Kein Foto“ zeigen keinen QR-Code.
- [ ] Story `Organisms/Foto-Overlay` zeigt den QR-Code in „Ein Foto“ und „Galerie“; der Betreiber kann ihn mit dem Handy scannen und landet auf der Beispiel-URL. [human-eye]

## Notes
- Terms-Auszug (Planespotters, 2026-10-31): „On a device with no clickable surface — an e-ink frame, an embedded display, a kiosk — the link back may take another form, as long as it resolves to the same link URL and the viewer can follow it in a single action. An NFC tag or a QR code satisfies this. Printing or displaying the URL as text does not.“
- Nicht Teil dieses Tasks: NFC. Der QR-Code ist die einfachere, von den Terms ausdrücklich genannte Form.
- Siehe ADR 0029 (Amendment 2026-10-31) und den Research-Bericht, Abschnitt „Nachtrag: Terms verifiziert“.
