# cavoti-web — container for Railway (or any host with a persistent volume).
# SQLite DB + encrypted uploads live on a mounted volume (see README "Deploy").

FROM node:20-bookworm-slim

# Prisma needs openssl; ca-certificates for outbound TLS to the Cavoti relay.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install all deps (incl. dev) — needed for the build and for the Prisma CLI
# at runtime (db push on start). NODE_ENV is left unset here so dev deps install.
COPY package.json package-lock.json ./
RUN npm ci

# App source.
COPY . .

# Placeholder DATABASE_URL so PrismaClient construction during `next build`
# never fails on a missing env var. Railway overrides this at runtime.
ENV DATABASE_URL="file:/tmp/build.db"
RUN npm run build

# Runtime config (these only affect the running container, not the build above).
ENV NODE_ENV=production
# PORT is injected by Railway at runtime; next falls back to 3000 if unset
EXPOSE 3000

# Sync the schema to the volume-backed DB, then start the server.
CMD ["sh", "-c", "echo BOOT_PORT=[$PORT]; npx prisma db push --skip-generate; echo STARTING_NEXT_NOW; npx next start -H 0.0.0.0 -p 3000; echo NEXT_EXITED_CODE=$?"]
