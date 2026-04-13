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

# ============================================================
# Stage 2: Runtime
# ============================================================
FROM node:20-alpine

WORKDIR /build/apps/api

# Install dumb-init, curl, bash, and postgresql-client (for pg_isready)
RUN apk add --no-cache dumb-init curl bash postgresql-client

# Keep pnpm available at runtime for workspace-safe prisma execution.
RUN npm install -g pnpm@10.6.3

# Copy the full workspace build tree so pnpm workspace symlinks stay valid.
COPY --from=builder /build /build

# Ensure entrypoint is executable
RUN chmod +x /build/apps/api/docker-entrypoint.sh

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
CMD ["/build/apps/api/docker-entrypoint.sh"]
