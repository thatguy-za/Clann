# syntax=docker/dockerfile:1

# --- Build stage --------------------------------------------------------
# Debian slim (glibc) so better-sqlite3 uses its prebuilt binary instead of
# compiling from source (which Alpine/musl would force).
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Install all deps (incl. dev) for the build. Each target platform in a
# buildx run installs its own better-sqlite3 binary.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Drop dev dependencies so we ship a lean, correct node_modules (keeps the
# platform-matched better-sqlite3 binary).
RUN npm prune --omit=dev

# --- Runtime stage ------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/app.db \
    UPLOAD_DIR=/data/uploads

# App server, production deps, and the migrations applied at startup.
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json ./package.json

# SQLite file + uploaded photos persist here.
VOLUME /data
EXPOSE 3000

# Migrations run automatically on boot (src/hooks.server.ts imports migrate).
CMD ["node", "build"]
