#!/bin/sh
# Docker entrypoint for The Eye in the Sky API
# Purpose:
#   1. Wait for PostgreSQL to be ready
#   2. Run Prisma migrations
#   3. Validate schema
#   4. Start the application

set -e

API_PORT=${PORT:-3200}

echo "=== The Eye in the Sky API - Startup ==="
echo "Port: $API_PORT"
echo "NODE_ENV: ${NODE_ENV:-development}"

# ─────────────────────────────────────────────────────────────
# Step 1: Verify DATABASE_URL is set
# ─────────────────────────────────────────────────────────────
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable not set"
  exit 1
fi

echo "✓ Database URL configured"

# ─────────────────────────────────────────────────────────────
# Step 2: Wait for PostgreSQL to be ready (retry logic)
# ─────────────────────────────────────────────────────────────
echo "Waiting for PostgreSQL to be ready..."

attempt=1
max_attempts=30
wait_seconds=2

while [ $attempt -le $max_attempts ]; do
  # Extract host/port from DATABASE_URL and check with pg_isready
  # Format: postgresql://user:password@host:port/database
  if pg_isready -h postgres -U app_user -d eye_db > /dev/null 2>&1; then
    echo "✓ PostgreSQL is ready (attempt $attempt/$max_attempts)"
    break
  fi
  
  echo "⏳ PostgreSQL not ready yet (attempt $attempt/$max_attempts, waiting ${wait_seconds}s...)"
  sleep $wait_seconds
  attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
  echo "❌ ERROR: PostgreSQL did not become ready within $((max_attempts * wait_seconds)) seconds"
  exit 1
fi

# ─────────────────────────────────────────────────────────────
# Step 3: Run Prisma migrations
# ─────────────────────────────────────────────────────────────
echo "Running Prisma migrations..."

if npx prisma migrate deploy; then
  echo "✓ Migrations completed successfully"
else
  echo "❌ ERROR: Prisma migrations failed"
  exit 1
fi

# ─────────────────────────────────────────────────────────────
# Step 4: Validate Prisma schema
# ─────────────────────────────────────────────────────────────
echo "Validating Prisma schema..."

if npx prisma validate; then
  echo "✓ Schema validation passed"
else
  echo "❌ ERROR: Schema validation failed"
  exit 1
fi

# ─────────────────────────────────────────────────────────────
# Step 5: Start the application
# ─────────────────────────────────────────────────────────────
echo ""
echo "=== Starting API Server ==="
echo "Listening on http://0.0.0.0:$API_PORT"
echo "Swagger docs: http://0.0.0.0:$API_PORT/swagger"
echo ""

exec node dist/main.js
