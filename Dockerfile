# PlanesAbove service: Node LTS, one container serving the API and the static kiosk client (ADR 0004, 0008).
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
# better-sqlite3 is the only native module; it ships prebuilt binaries for linux x64/arm64.
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 8080
USER node
CMD ["node", "dist/server/server.mjs"]
