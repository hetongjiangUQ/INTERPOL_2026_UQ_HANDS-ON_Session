# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS builder

WORKDIR /build
ENV CI=1

# Corepack reads the exact pnpm release from package.json. Keep the lockfile and
# workspace settings in this early layer so dependency installation is cached.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable \
    && test "$(node -p "require('./package.json').packageManager")" = "pnpm@11.19.0" \
    && corepack prepare "$(node -p "require('./package.json').packageManager")" --activate \
    && test "$(pnpm --version)" = "11.19.0"
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build


FROM node:22-bookworm-slim AS runtime

ARG WRANGLER_VERSION=4.92.0
ENV NODE_ENV=production \
    HOME=/tmp/evidence-lab-home \
    XDG_CONFIG_HOME=/tmp/evidence-lab-home/.config \
    WRANGLER_SEND_METRICS=false \
    WRANGLER_WRITE_LOGS=false \
    WRANGLER_LOG_PATH=/tmp/evidence-lab-home/wrangler-logs \
    MINIFLARE_REGISTRY_PATH=/tmp/evidence-lab-home/miniflare-registry

RUN npm install --global --omit=dev --no-audit --no-fund "wrangler@${WRANGLER_VERSION}" \
    && npm cache clean --force \
    && groupadd --gid 10001 evidence-lab \
    && useradd --uid 10001 --gid 10001 --create-home \
       --home-dir /home/evidence-lab --shell /usr/sbin/nologin evidence-lab \
    && install -d -o evidence-lab -g evidence-lab \
       /app /app/.wrangler /data/wrangler /run/evidence-lab /tmp/evidence-lab-home

WORKDIR /app

# The runtime receives only the compiled site, schema migrations, deployment
# configuration and entrypoint. Source, local state and model files stay out.
COPY --from=builder --chown=evidence-lab:evidence-lab /build/dist ./dist
COPY --chown=evidence-lab:evidence-lab slides ./slides
COPY --chown=evidence-lab:evidence-lab drizzle ./drizzle
COPY --chown=evidence-lab:evidence-lab wrangler.docker.jsonc ./wrangler.docker.jsonc
COPY --chown=evidence-lab:evidence-lab scripts/start-container.mjs ./scripts/start-container.mjs
RUN install -d -o evidence-lab -g evidence-lab /app/dist/server/.wrangler

USER evidence-lab
EXPOSE 3001
VOLUME ["/data/wrangler"]

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=4 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

ENTRYPOINT ["node", "scripts/start-container.mjs"]
