# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json ./
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./
COPY packages/broker-contracts/package.json ./packages/broker-contracts/

# Install all dependencies (including dev dependencies for build)
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM node:22-alpine AS production

# Install pnpm
RUN npm install -g pnpm

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs appuser

WORKDIR /app

# Copy package files
COPY package.json ./
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./
COPY packages/broker-contracts/package.json ./packages/broker-contracts/

# Install only production dependencies
# --ignore-scripts skips lifecycle hooks (prepare → husky) that require
# devDependencies not present in a production install.
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && \
    pnpm store prune && \
    rm -rf ~/.pnpm-store

# Copy built application from builder stage
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/packages/broker-contracts/package.json ./packages/broker-contracts/package.json
COPY --from=builder --chown=appuser:nodejs /app/packages/broker-contracts/dist ./packages/broker-contracts/dist

# Copy other necessary files
COPY --from=builder --chown=appuser:nodejs /app/proto ./proto
COPY --from=builder --chown=appuser:nodejs /app/swagger.yaml ./swagger.yaml
COPY --from=builder --chown=appuser:nodejs /app/migrations ./migrations
COPY --from=builder --chown=appuser:nodejs /app/public ./public

# Switch to non-root user
USER appuser

# Expose ports
EXPOSE 3000 50051

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/api/health').then(r=>r.ok?process.exit(0):process.exit(1))"

# Start the application
CMD ["node", "dist/server.js"]
