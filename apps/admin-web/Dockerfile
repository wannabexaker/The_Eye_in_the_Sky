# Multi-stage Dockerfile for The Eye in the Sky Admin Web (Next.js)
# Stage 1: Builder — compile Next.js application
# Stage 2: Runtime — lightweight Node container

# ============================================================
# Stage 1: Builder
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /build

# Install pnpm matching workspace packageManager version
RUN npm install -g pnpm@10.6.3

# Copy root-level workspace files (package.json required for pnpm workspace root)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./

# Copy apps/admin-web and packages
COPY apps/admin-web ./apps/admin-web
COPY packages/shared-types ./packages/shared-types
COPY packages/ui ./packages/ui

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build Next.js application
WORKDIR /build/apps/admin-web
RUN pnpm exec next build

# Remove build cache
RUN rm -rf .next/cache .next/static/webpack .next/server/chunks/webpack

# ============================================================
# Stage 2: Runtime
# ============================================================
FROM node:20-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application from builder
COPY --from=builder /build/apps/admin-web/.next ./.next
COPY --from=builder /build/apps/admin-web/public ./public
COPY --from=builder /build/apps/admin-web/package.json ./package.json
COPY --from=builder /build/apps/admin-web/next.config.ts ./next.config.ts

# Install production dependencies only
RUN npm install --only=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Expose admin web port
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3100 || exit 1

# Start application
CMD ["npm", "start"]
