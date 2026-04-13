# Multi-stage Dockerfile for The Eye in the Sky API (NestJS)
# Stage 1: Builder — compile TypeScript & install production dependencies
# Stage 2: Runtime — lightweight Node container with only dist/ + node_modules

# ============================================================
# Stage 1: Builder
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /build

# Install pnpm matching workspace packageManager version
RUN npm install -g pnpm@10.6.3

# Copy root-level workspace files (package.json required for pnpm workspace root)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./

# Copy apps/api and packages
COPY apps/api ./apps/api
COPY packages/game-engine ./packages/game-engine
COPY packages/shared-types ./packages/shared-types

# Install all dependencies (includes dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Build API: compile TypeScript → JavaScript
WORKDIR /build/apps/api
# Ensure Prisma client is generated in CI/build containers before tsc.
RUN pnpm exec prisma generate
RUN pnpm exec tsc --project tsconfig.json

# Prune dev dependencies (keep only production deps)
RUN pnpm prune --prod --config.ignore-scripts=true

# ============================================================
# Stage 2: Runtime
# ============================================================
FROM node:20-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init curl bash

# Copy dist from builder
COPY --from=builder /build/apps/api/dist ./dist

# Copy node_modules with only production deps
COPY --from=builder /build/apps/api/node_modules ./node_modules

# Copy package.json for reference
COPY --from=builder /build/apps/api/package.json ./package.json

# Copy Prisma schema and migrations (required for prisma migrate deploy at runtime)
COPY --from=builder /build/apps/api/prisma ./prisma

# Copy docker entrypoint script
COPY apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Expose API port
EXPOSE 3200

# Health check: verify API is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3200/health || exit 1

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start application via entrypoint script
CMD ["/app/docker-entrypoint.sh"]
