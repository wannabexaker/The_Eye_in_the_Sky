-- ============================================================
-- The Eye in the Sky — Database Least-Privilege Setup
-- ============================================================
-- Purpose: Create the runtime application user (app_slot_game)
--          with SELECT/INSERT/UPDATE/DELETE permissions only.
--          This user is used by the NestJS API (DATABASE_URL).
--
-- Execution: Run ONCE, manually, by a DBA or sysadmin.
--            Requires: sysadmin or securityadmin role on the SQL Server instance.
--
-- IMPORTANT: Change the password before running.
--            Do NOT commit the real password to version control.
--
-- Migration user (DATABASE_ADMIN_URL in .env) remains 'sa' or a separate
-- admin account. The runtime user must never have ALTER/DROP/CREATE.
-- ============================================================

USE master;
GO

-- ────────────────────────────────────────────────────────────
-- Step 1: Create the SQL Server Login
-- ────────────────────────────────────────────────────────────
-- Replace the password below with a strong, unique secret.
-- Minimum: 12 chars, upper + lower + digit + symbol.
IF NOT EXISTS (
    SELECT 1 FROM sys.server_principals WHERE name = N'app_slot_game'
)
BEGIN
    CREATE LOGIN app_slot_game
        -- PLACEHOLDER: replace locally before execution; never commit a real password.
        WITH PASSWORD = N'__SET_APP_SLOT_GAME_PASSWORD__',
             CHECK_POLICY   = ON,
             CHECK_EXPIRATION = OFF;
    PRINT 'Login [app_slot_game] created.';
END
ELSE
BEGIN
    PRINT 'Login [app_slot_game] already exists — skipped creation.';
END
GO

-- ────────────────────────────────────────────────────────────
-- Step 2: Switch to the application database
-- ────────────────────────────────────────────────────────────
-- Current project database name:
USE TheEyeInTheSky;
GO

-- ────────────────────────────────────────────────────────────
-- Step 3: Create the database user mapped to the login
-- ────────────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.database_principals WHERE name = N'app_slot_game'
)
BEGIN
    CREATE USER app_slot_game FOR LOGIN app_slot_game;
    PRINT 'User [app_slot_game] created in database.';
END
ELSE
BEGIN
    PRINT 'User [app_slot_game] already exists — skipped creation.';
END
GO

-- ────────────────────────────────────────────────────────────
-- Step 4: Grant DML permissions on the dbo schema ONLY
-- ────────────────────────────────────────────────────────────
-- Grants: SELECT, INSERT, UPDATE, DELETE
-- Omits:  ALTER, DROP, CREATE, EXECUTE, TRUNCATE, REFERENCES
GRANT SELECT ON SCHEMA::dbo TO app_slot_game;
GRANT INSERT ON SCHEMA::dbo TO app_slot_game;
GRANT UPDATE ON SCHEMA::dbo TO app_slot_game;
GRANT DELETE ON SCHEMA::dbo TO app_slot_game;
PRINT 'DML permissions granted on schema [dbo] to [app_slot_game].';
GO

-- ────────────────────────────────────────────────────────────
-- Step 5: Explicitly deny DDL and elevated operations
-- ────────────────────────────────────────────────────────────
-- Belt-and-suspenders: deny even if inherited via role later.
DENY ALTER  ON SCHEMA::dbo TO app_slot_game;
DENY CONTROL ON SCHEMA::dbo TO app_slot_game;
PRINT 'DDL DENY applied to [app_slot_game].';
GO

-- ────────────────────────────────────────────────────────────
-- Step 6: Verify the result
-- ────────────────────────────────────────────────────────────
SELECT
    dp.name                  AS principal_name,
    dp.type_desc             AS principal_type,
    perm.permission_name,
    perm.state_desc          AS grant_or_deny,
    sch.name                 AS schema_name
FROM sys.database_permissions AS perm
JOIN sys.database_principals  AS dp
    ON perm.grantee_principal_id = dp.principal_id
JOIN sys.schemas              AS sch
    ON perm.major_id = sch.schema_id
WHERE dp.name = N'app_slot_game'
ORDER BY perm.state_desc, perm.permission_name;
GO

-- Expected output:
-- ┌─────────────────┬────────────────┬─────────────────┬───────────────┬─────────────┐
-- │ principal_name  │ principal_type │ permission_name │ grant_or_deny │ schema_name │
-- ├─────────────────┼────────────────┼─────────────────┼───────────────┼─────────────┤
-- │ app_slot_game   │ SQL_USER       │ ALTER           │ DENY          │ dbo         │
-- │ app_slot_game   │ SQL_USER       │ CONTROL         │ DENY          │ dbo         │
-- │ app_slot_game   │ SQL_USER       │ DELETE          │ GRANT         │ dbo         │
-- │ app_slot_game   │ SQL_USER       │ INSERT          │ GRANT         │ dbo         │
-- │ app_slot_game   │ SQL_USER       │ SELECT          │ GRANT         │ dbo         │
-- │ app_slot_game   │ SQL_USER       │ UPDATE          │ GRANT         │ dbo         │
-- └─────────────────┴────────────────┴─────────────────┴───────────────┴─────────────┘

-- ────────────────────────────────────────────────────────────
-- Step 7: Update .env (do NOT commit real credentials)
-- ────────────────────────────────────────────────────────────
-- After running this script, update your local .env:
--
-- DATABASE_URL="sqlserver://localhost;database=TheEyeInTheSky;user=app_slot_game;password=<app_slot_game_password>;trustServerCertificate=true"
-- DATABASE_ADMIN_URL="sqlserver://localhost;database=TheEyeInTheSky;user=sa;password=<sa_password>;trustServerCertificate=true"
--
-- The NestJS API reads DATABASE_URL.
-- Prisma migrations run with DATABASE_ADMIN_URL (run manually, never in CI/prod auto-deploy).
