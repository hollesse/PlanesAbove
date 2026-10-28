# PlanesAbove service: Node LTS, one container serving the API and the static kiosk client (ADR 0004, 0008).
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
# better-sqlite3 is the only native module; it ships prebuilt binaries for linux x64/arm64 inside its npm tarball.
# --ignore-scripts: the lockfile (written by a newer npm) requests no install step, but npm 10 (bundled with node:22) would
# fall back to a node-gyp source build, which this slim image cannot do.
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist
EXPOSE 8080
USER node
CMD ["node", "dist/server/server.mjs"]
