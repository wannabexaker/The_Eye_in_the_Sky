# Database Migration Guide: SQL Server → PostgreSQL

## Overview

This guide explains how to migrate existing data from SQL Server to PostgreSQL for RPi deployment.

**Timeline**: ~30 minutes for a fresh database, ~1+ hour for large datasets

---

## Important Notes

1. **Backup First**: Always backup your SQL Server database before migrating
2. **Test First**: Test migration on a test database first
3. **Downtime**: Plan downtime - the API should be stopped during migration
4. **Data Validation**: Validate data integrity after migration

---

## Option A: Fresh Database (Recommended for RPi)

If you don't have existing data or want a clean start:

```bash
# Start fresh with PostgreSQL
docker-compose down -v  # Remove old volumes
docker-compose up -d   # PostgreSQL will initialize automatically

# API will run migrations on startup
docker-compose logs -f api

# Seed test data (if configured in .env.docker)
# - ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD
# - PLAYER_SEED_EMAIL / PLAYER_SEED_PASSWORD
```

**Done!** Your database is ready.

---

## Option B: Migrate Existing SQL Server Data

### Step 1: Export Data from SQL Server

```sql
-- Connect to SQL Server with SQL Server Management Studio (SSMS)
-- or sqlcmd

-- Backup the database first
BACKUP DATABASE TheEyeInTheSky 
TO DISK = 'C:\Backups\eye_backup_2026_04_13.bak';

-- Export each table as CSV (or use SSMS Export Wizard)
-- Example for User table:

SELECT 
    id, email, passwordHash, displayName, role, isActive, 
    welcomeBonusClaimed, createdAt, updatedAt
INTO #UserExport
FROM [User];

-- Use BCP to export to file
-- In Command Prompt:
-- bcp "SELECT * FROM #UserExport" queryout "C:\temp\users.csv" -S localhost -U sa -P <password> -c -t,
```

### Step 2: Prepare PostgreSQL

```bash
# Ensure PostgreSQL container is running
docker-compose up -d postgres

# Wait for it to be ready
docker-compose logs postgres | grep "database system is ready"

# Create app_user if not already created
docker exec eye-postgres psql -U postgres -d eye_db -c \
  "CREATE USER app_user WITH PASSWORD 'your_password'; GRANT ALL PRIVILEGES ON DATABASE eye_db TO app_user;"
```

### Step 3: Migrate Tables

#### Using pg_restore (if you have SQL Server backup)

```bash
# On Windows, convert SQL Server backup to PostgreSQL dump
# This requires pg_dump to be available

# Step 1: Export SQL Server database to SQL script
# (Use SSMS or SQL Server Native Client SQL Scripting)

# Step 2: Convert SQL syntax from T-SQL to PostgreSQL
# (Manual review or tools like Flyway, Liquibase)

# Step 3: Import into PostgreSQL
docker exec eye-postgres psql -U app_user -d eye_db < migrated_schema.sql
```

#### Using CSV Import (More Reliable)

This is the manual but reliable approach:

```bash
# Export each table from SQL Server as CSV

# Example: Export User table
# In SSMS Query Results → rightclick → Export Results to File → users.csv

# Then import to PostgreSQL:
docker exec -i eye-postgres psql -U app_user -d eye_db <<'EOF'
COPY "User" (id, email, "passwordHash", "displayName", role, "isActive", "welcomeBonusClaimed", "createdAt", "updatedAt")
FROM stdin
WITH (FORMAT csv, DELIMITER ',', HEADER);
EOF < /path/to/users.csv
```

**Table import order** (respect foreign key constraints):

1. `User`
2. `AuthSession`
3. `Wallet`
4. `LedgerEntry`
5. `Game`
6. `GameMathProfile`
7. `AppSetting`
8. `GameSession`
9. `Round` (requires `User`, `Game`, `GameSession`)
10. `BonusState` (requires `User`, `Round`)
11. `AdminAction` (requires `User`)
12. `AuditLog`
13. `ExternalIdentity` (requires `User`)
14. `AuthNonceReplay`
15. `AnalyticsRound`

### Step 4: Update Sequences (IDs)

If using auto-increment IDs, reset sequences to match highest ID:

```bash
docker exec eye-postgres psql -U app_user -d eye_db <<'EOF'
-- For each table with auto-increment, reset the sequence
-- (CUID primary keys don't need this)

-- But if any table has bigint/int IDs:
SELECT MAX(id) FROM "AnalyticsRound";
-- Then set sequence (if applicable)
EOF
```

### Step 5: Validate Data

```bash
# Check row counts match
docker exec eye-postgres psql -U app_user -d eye_db <<'EOF'
SELECT 'User' AS table_name, COUNT(*) FROM "User"
UNION ALL
SELECT 'AuthSession', COUNT(*) FROM "AuthSession"
UNION ALL
SELECT 'Wallet', COUNT(*) FROM "Wallet"
UNION ALL
SELECT 'Round', COUNT(*) FROM "Round";
EOF

# Spot-check data integrity
docker exec eye-postgres psql -U app_user -d eye_db <<'EOF'
-- Verify relationships
SELECT u.email, COUNT(r.id) as rounds
FROM "User" u
LEFT JOIN "Round" r ON u.id = r."userId"
GROUP BY u.id, u.email
ORDER BY rounds DESC
LIMIT 10;
EOF
```

### Step 6: Start API with PostgreSQL

```bash
# Stop API if running against old SQL Server
docker-compose stop api

# Update DATABASE_URL in .env.docker to PostgreSQL
# DATABASE_URL=postgresql://app_user:password@postgres:5432/eye_db

# Run migrations (in case any new schemas are needed)
docker-compose exec api npx prisma migrate deploy

# Start API
docker-compose up -d api

# Check logs
docker-compose logs -f api
```

---

## Option C: Using Migration Tools

### Tool: Flyway

```bash
# Install Flyway CLI
# https://flywaydb.org/documentation/usage/commandline/

# Create migration scripts in migrations/ directory
mkdir -p flyway/sql

# Run migration
flyway -url=jdbc:postgresql://localhost:5432/eye_db \
       -user=app_user \
       -password=password \
       -locations=filesystem:./flyway/sql \
       migrate
```

### Tool: Prisma Migrate

Prisma handles schema migrations automatically, but for existing data:

```bash
# If schema structure matches Prisma schema:
docker-compose exec api npx prisma db seed

# If you modified data outside of Prisma:
docker-compose exec api npx prisma migrate resolve --rolled-back [migration-name]
docker-compose exec api npx prisma migrate deploy
```

---

## Troubleshooting Migration

### Issue: Foreign Key Constraint Violation

```bash
# Disable constraints during import
docker exec eye-postgres psql -U app_user -d eye_db <<'EOF'
SET CONSTRAINTS ALL DEFERRED;
-- Import data here
COMMIT;
EOF
```

### Issue: Encoding Problems (Unicode)

```bash
# Ensure UTF-8 encoding
docker exec eye-postgres psql -U app_user -d eye_db -c "SHOW server_encoding;"

# If not UTF-8, restart container with correct locale:
# Modify docker-compose.yml PostgreSQL environment variables
```

### Issue: Decimal/Number Precision Loss

SQL Server `DECIMAL(18,2)` → PostgreSQL `DECIMAL(18,2)` (no loss)

But verify:
```bash
docker exec eye-postgres psql -U app_user -d eye_db <<'EOF'
SELECT SUM("balance") FROM "Wallet";
EOF
```

### Issue: DateTime Offset Problems

SQL Server stores timezone offsets; PostgreSQL uses UTC.

```bash
-- In SQL Server, export with explicit conversion:
SELECT 
  id,
  CONVERT(datetime2, GETUTCDATE()) as createdAt  -- Convert to UTC
FROM "User";

-- Import to PostgreSQL (which stores in UTC by default)
```

---

## Validation Checklist

After migration, verify:

- [ ] Row counts match between SQL Server and PostgreSQL
- [ ] No NULL values in required fields
- [ ] Foreign key relationships intact
- [ ] Decimal/currency values accurate (no rounding)
- [ ] Passwords still hash correctly (bcrypt/argon2)
- [ ] DateTime values in UTC
- [ ] Indexes created on expected columns
- [ ] Unique constraints enforced
- [ ] API starts without migration errors
- [ ] Authentication works (login with migrated credentials)
- [ ] Player can view wallet balance
- [ ] Admin can view analytics

---

## Rollback Plan

If something goes wrong:

```bash
# Option 1: Restore from SQL Server backup
# Use SSMS Restore Database wizard

# Option 2: Keep old SQL Server running as fallback
docker-compose down
# Temporarily revert docker-compose.yml to SQL Server version
docker-compose up -d sqlserver  # Old version

# Option 3: Restore PostgreSQL volume backup
docker volume ls | grep postgres_data
docker volume rm tsogos_postgres_data
# Restore from backup if available
```

---

## Performance After Migration

On RPi, you might notice:

- PostgreSQL is lighter than SQL Server ✅
- Queries should be faster (no remote connection) ✅
- More memory available for Node.js ✅

If queries are slow:

```bash
# Analyze query performance
docker exec eye-postgres psql -U app_user -d eye_db <<'EOF'
EXPLAIN ANALYZE
SELECT * FROM "Round" WHERE "userId" = 'some-user-id' ORDER BY "createdAt" DESC;
EOF

# Add indexes if needed
docker exec eye-postgres psql -U app_user -d eye_db <<'EOF'
CREATE INDEX idx_round_userid_created ON "Round"("userId", "createdAt" DESC);
EOF
```

---

## Questions?

Refer to:
- PostgreSQL documentation: https://www.postgresql.org/docs
- Prisma migrations: https://www.prisma.io/docs/concepts/components/prisma-migrate
- SQL Server to PostgreSQL guide: https://wiki.postgresql.org/wiki/Migrating_from_Microsoft_SQL_Server_to_PostgreSQL

