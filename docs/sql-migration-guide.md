## SQL Server + Auth Rollout Guide

### Current state
- Prisma datasource has been switched to `sqlserver`.
- A first SQL-compatible schema exists in [apps/api/prisma/schema.prisma](/c:/Projects/MyTests/Tsogos/apps/api/prisma/schema.prisma).
- An initial offline migration has been generated in [migration.sql](/c:/Projects/MyTests/Tsogos/apps/api/prisma/migrations/20260327193000_init_sqlserver_auth/migration.sql).
- API bootstrap now seeds:
  - the primary game row
  - all engine math profiles
  - the active profile app setting
  - one optional seeded admin account from env
- Auth/session endpoints and protected player/admin routes are already implemented.

### What is persisted in v1
- Users
- Auth sessions
- Wallets
- Wallet ledger entries
- Active/resumable game session state
- Rounds
- Bonus state snapshots
- Admin actions
- Active game-config profile selection

Analytics are intentionally still file-backed in `apps/api/.runtime` for now. They are not blocked by this SQL rollout.

### Env contract
Use:
- [.env.example](/c:/Projects/MyTests/Tsogos/.env.example)
- [apps/api/.env.example](/c:/Projects/MyTests/Tsogos/apps/api/.env.example)

Required API-side values:
- `DATABASE_URL`
- `API_DEV_KEY`
- `AUTH_COOKIE_SECRET`
- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_PASSWORD`

### Local Docker boot
Use the root compose file:
- [docker-compose.yml](/c:/Projects/MyTests/Tsogos/docker-compose.yml)

Expected local flow:
1. Start Docker Desktop.
2. Run `docker compose up -d sqlserver`.
3. Ensure the container becomes healthy.
4. Create the target DB if it does not already exist.

Example:
```powershell
docker compose up -d sqlserver
docker exec eye-sky-sqlserver /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "YourStrong!Passw0rd" -Q "IF DB_ID('TheEyeInTheSky') IS NULL CREATE DATABASE [TheEyeInTheSky];"
```

### Prisma workflow
After the container and database exist:

1. Generate client
```powershell
corepack pnpm --filter api prisma:generate
```

2. Apply the first migration
```powershell
$env:DATABASE_URL="sqlserver://localhost:1433;database=TheEyeInTheSky;user=sa;password=YourStrong!Passw0rd;encrypt=false;trustServerCertificate=true"
corepack pnpm --dir apps/api exec prisma migrate deploy
```

3. Seed base data
```powershell
$env:DATABASE_URL="sqlserver://localhost:1433;database=TheEyeInTheSky;user=sa;password=YourStrong!Passw0rd;encrypt=false;trustServerCertificate=true"
$env:ADMIN_SEED_EMAIL="admin@example.com"
$env:ADMIN_SEED_PASSWORD="ChangeMe123!"
corepack pnpm --filter api prisma:seed
```

### API/auth smoke checklist
After DB boot:
1. Start the API.
2. Register a player with `/auth/register`.
3. Verify `/auth/me`.
4. Claim welcome bonus.
5. Deposit and withdraw.
6. Spin once and confirm `/player/rounds` persists the round/session state.
7. Refresh `player-web` and verify wallet + game-state restore.
8. Login in `admin-web` with the seeded admin and verify:
   - analytics reads work
   - profile switching works
   - `/game-config/select` is blocked for non-admin users

Repeatable local smoke script:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sql-auth-smoke.ps1
```

### Live status from the latest pass
- Docker Desktop was started successfully and the local SQL Server container now boots healthy.
- `TheEyeInTheSky` database was created inside the container.
- The initial Prisma migration was applied successfully against the live SQL Server database.
- Seed completed successfully, including:
  - primary game row
  - all engine math profiles
  - active profile app setting
  - seeded admin account
- Manual HTTP smoke passed for:
  - public `/game-config`
  - player `/auth/register`
  - player `/auth/me`
  - player `/player/bootstrap`
  - player welcome bonus
  - player deposit / withdraw
  - player round persistence + resumable session snapshot
  - admin `/auth/login`
  - admin-only `/game-config/select`
  - non-admin rejection on `/game-config/select`

### Local API runtime note
- For this monorepo, the reliable local smoke path is:
```powershell
corepack pnpm --filter api exec node --import tsx dist/apps/api/src/main.js
```
- Reason:
  - plain compiled `node dist/...` needs the `tsx` loader to resolve workspace package sources such as `@eye/game-engine`
  - plain `tsx src/main.ts` is not a safe substitute for Nest here because constructor DI metadata becomes unreliable for the bootstrap path

### Simulator mode note
- `player-web` now has a dev-only `Skip Login` path.
- `Skip Login` is strictly local:
  - no auth session
  - no player bootstrap/deposit/withdraw/round persistence calls
  - no server stats/session writes
- Only local wallet money state is persisted for simulator continuity.
- Round analytics/history and resumable game state are intentionally not persisted in simulator mode.

### Important implementation notes
- SQL Server support in Prisma does not support native JSON the same way PostgreSQL does, so structured payloads are stored as serialized text.
- The gameplay resolver remains client-side in v1.
- The API is the authoritative persisted source for wallet/session/round state, but not yet for server-authoritative RNG or analytics aggregation.

### Follow-up after the successful live rollout
- Decide whether payment methods remain client-only or move into DB persistence.
- Migrate analytics from file-backed storage to DB-backed aggregation after auth/persistence stabilizes.
- Decide later whether spin resolution remains client-side or moves to server-authoritative round resolution.
