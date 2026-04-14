# Multi-stage Dockerfile for The Eye in the Sky Player Web (Next.js + React + Pixi.js)
# Stage 1: Builder — compile Next.js application
# Stage 2: Runtime — lightweight Node container

# ============================================================
# Stage 1: Builder
# ============================================================
# Build on the native CI platform (amd64) to avoid QEMU SIGILL on arm64.
# The runtime stage uses the target platform (arm64 for RPi4).
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

WORKDIR /build

# Install pnpm matching workspace packageManager version
RUN npm install -g pnpm@10.6.3

# Copy root-level workspace files (package.json required for pnpm workspace root)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./

# Copy apps/player-web and packages
COPY apps/player-web ./apps/player-web
COPY packages/game-engine ./packages/game-engine
COPY packages/shared-types ./packages/shared-types
COPY packages/ui ./packages/ui

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build Next.js application
WORKDIR /build/apps/player-web
RUN pnpm exec next build

# Remove build cache and development files
RUN rm -rf .next/cache .next/static/webpack .next/server/chunks/webpack

# ============================================================
# Stage 2: Runtime
# ============================================================
FROM node:20-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy Next.js standalone build output (includes traced runtime deps)
# In a monorepo, standalone output preserves the full path: apps/player-web/server.js
COPY --from=builder /build/apps/player-web/.next/standalone ./
COPY --from=builder /build/apps/player-web/.next/static ./apps/player-web/.next/static
COPY --from=builder /build/apps/player-web/public ./apps/player-web/public

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Expose player web port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start standalone Next server (monorepo path)
CMD ["node", "apps/player-web/server.js"]
