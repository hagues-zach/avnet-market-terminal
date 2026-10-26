# Container build for hosting outside Vercel (Azure, AWS or on premises).
# Uses Next's standalone output, so the final image holds only the server and
# the files it reads at runtime.
#
#   docker build -t avnet-market-terminal .
#   docker run -p 3002:3002 --env-file .env.local avnet-market-terminal

ARG NODE_IMAGE=node:22-bookworm-slim

# Install dependencies from the lockfile only, so this layer is cached until it changes.
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN npm install -g pnpm@10.33.2
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build. No secrets are needed; AI features say they are off until a key is set at runtime.
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx next build

# Runtime: the standalone server plus static files, the PowerPoint template and data/.
FROM ${NODE_IMAGE} AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3002 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nextjs && useradd --system --uid 1001 --gid nextjs nextjs

COPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nextjs /app/public ./public
# Read through process.cwd() at runtime, so they are copied whole rather than
# left to file tracing: the Avnet template for exports, and the cycle engine
# output and line card snapshots.
COPY --from=build --chown=nextjs:nextjs /app/assets ./assets
COPY --from=build --chown=nextjs:nextjs /app/data ./data
# The file store writes saved AI results here. Mount a volume on /app/.cache to
# keep them across container restarts.
RUN mkdir -p .cache && chown nextjs:nextjs .cache

USER nextjs
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3002/login').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]
