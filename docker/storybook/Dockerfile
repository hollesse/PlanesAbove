# Storybook-Designsystem (ADR 0002) als statische Seite: Build im Node-Image, Auslieferung per nginx.
# Build-Kontext ist das Repo-Root (siehe .github/workflows/deploy.yml), damit src/ und .storybook/ vorhanden sind.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build-storybook

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build /app/storybook-static /usr/share/nginx/html
EXPOSE 8080
