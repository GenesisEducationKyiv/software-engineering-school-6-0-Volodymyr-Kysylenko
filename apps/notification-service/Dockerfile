# Build stage
FROM node:22-alpine AS builder

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/notification-service/package.json ./apps/notification-service/

RUN pnpm install --filter notification-service --frozen-lockfile

COPY apps/notification-service/src ./apps/notification-service/src
COPY apps/notification-service/tsconfig.json ./apps/notification-service/

RUN pnpm --filter notification-service build

# Production stage
FROM node:22-alpine AS production

RUN corepack enable

RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs appuser

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/notification-service/package.json ./apps/notification-service/

RUN pnpm install --filter notification-service --frozen-lockfile --prod --ignore-scripts && \
    pnpm store prune && \
    rm -rf "$(pnpm store path --silent)"

COPY --from=builder --chown=appuser:nodejs /app/apps/notification-service/dist ./apps/notification-service/dist

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:4000/api/health').then(r=>r.ok?process.exit(0):process.exit(1))"

CMD ["node", "apps/notification-service/dist/server.js"]
