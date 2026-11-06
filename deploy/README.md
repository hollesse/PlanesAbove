# Deployment

Dieses Repo wird im Homelab automatisch über Doco-CD deployt. Du musst dafür nichts
außerhalb dieses Repos tun.

## Konventionen

- `deploy/compose.yaml` beschreibt den Stack. Image: `ghcr.io/hollesse/planesabove:main`.
- Subdomain und Traefik-Router heißen wie das Repo, klein geschrieben mit Bindestrichen:
  `planesabove.jtoepfer.de`. Zweiter Name im Heimnetz: `planesabove.lan.jtoepfer.de`.
- Keine `ports:`. Jeder Service, der erreichbar sein soll, hängt im externen Netz `proxy`
  und bekommt Traefik-Labels (siehe Vorlage).
- Persistente Daten nur unter `/DATA/AppData/homelab/apps/planesabove/`.
- Secrets stehen in der Compose-Datei nur als `${NAME}`. Der Wert liegt verschlüsselt in
  `deploy/secrets/NAME.sops.env` (SOPS, age). Nie Klartext ins Repo schreiben.
- Du darfst neue Secret-Namen einführen, aber keine Werte setzen. Nenne am Ende deiner
  Arbeit alle Secrets, die in ZimaDeploy noch ergänzt werden müssen.
- `${NAME:-default}` gilt als optional und blockiert das Deployment nicht.
- Das Repo trägt das GitHub-Topic `homelab`. Der Build-Workflow in
  `.github/workflows/build.yml` baut bei jedem Push auf `main` das Image.

## Ablauf

1. Push auf `main` baut `ghcr.io/hollesse/planesabove:main` und `:sha-<commit>`.
2. ZimaDeploy findet das Repo über das Topic und trägt es in die Registry ein.
3. Fehlende Secrets werden in ZimaDeploy eingetragen (nicht hier).
4. Doco-CD pollt, entschlüsselt die Secrets und startet den Stack.
5. Rollback: Image-Tag vorübergehend auf `sha-<älterer commit>` setzen.
