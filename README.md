# The Eye in the Sky

Professional monorepo for the slot-style simulation, player shell, and engine tooling.

## Quick Start

### Development
- **Player app:** `corepack pnpm dev:player` (localhost:3000)
- **Admin panel:** `corepack pnpm --filter admin-web dev` (localhost:3100)
- **Simulation (math validation):** `corepack pnpm simulate`

### API Server
- **Backend:** `corepack pnpm dev:api` (localhost:3200)
  - Handles authentication, sessions, and game logic
  - Requires SQL Server (see [apps/api/README.md](apps/api/README.md))


### Build & Lint
- **Full build:** `corepack pnpm build`
- **Full lint:** `corepack pnpm lint`

⚠️ **Important:** Never run `pnpm build` while `pnpm dev:*` is active. See [DEVELOPER_WORKFLOW.md](DEVELOPER_WORKFLOW.md) for safe dev/build patterns.
---

## Database (SQL Server)

### Connection Details — SSMS / Azure Data Studio

| Field | Value |
|---|---|
| Server | `localhost,1433` |
| Authentication | SQL Server Authentication |
| Login | `sa` |
| Password | `<sa_password>` |
| Database | `TheEyeInTheSky` |
| Encrypt | No (dev only) |
| Trust Server Certificate | Yes |

> **SSMS:** Server name `localhost,1433` (comma, not colon). Check "Trust server certificate" under Connection Properties.  
> **Azure Data Studio:** Same settings, untick SSL/encrypt.

### Connection String
```
sqlserver://localhost:1433;database=TheEyeInTheSky;user=sa;password=<sa_password>;encrypt=false;trustServerCertificate=true
```

### Key Tables

| Table | Contents |
|---|---|
| `User` | All registered accounts (email, role, passwordHash) |
| `AuthSession` | Active sessions (tokenHash, expiresAt, authSource) |
| `ExternalIdentity` | External platform → game user mappings |
| `AuthNonceReplay` | Used nonces/JTIs for replay protection |
| `Wallet` | Player balances (EUR) |
| `LedgerEntry` | Transaction log (bet, win, bonus, deposit, withdraw) |
| `Round` | Every completed spin |
| `GameSession` | Active game sessions per user/game |
| `GameMathProfile` | Available math configs (v2.0, simple, legacy) |
| `AppSetting` | Runtime config (active math profile, auth mode) |
| `AdminAction` | Admin operation audit trail |
| `AuditLog` | Entity-level change log |
| `AnalyticsRound` | Aggregated analytics per spin |

### Useful Queries
```sql
-- All users
SELECT id, email, displayName, role, isActive, createdAt FROM [User];

-- Active sessions
SELECT s.id, u.email, s.authSource, s.createdAt, s.expiresAt
FROM AuthSession s JOIN [User] u ON s.userId = u.id
WHERE s.expiresAt > GETUTCDATE();

-- Current auth mode config
SELECT [key], [value] FROM AppSetting WHERE [key] LIKE 'auth:%';

-- Active math profile
SELECT [key], [value] FROM AppSetting WHERE [key] LIKE 'game:%';

-- Player balances
SELECT u.email, w.balance, w.currencyCode
FROM Wallet w JOIN [User] u ON w.userId = u.id;

-- Recent rounds
SELECT u.email, r.chargedBet, r.totalWin, r.profileId, r.createdAt
FROM Round r JOIN [User] u ON r.userId = u.id
ORDER BY r.createdAt DESC;
```

---

## Development Authentication

### Default Test Credentials

⚠️ **These accounts are automatically created for testing. Remove before production.**

#### Standard Player
- **Email:** `user@example.com`
- **Password:** `Changeme123`
- **Role:** Player (base game access)
- **Starting Balance:** €100.00

#### Admin User
- **Email:** `admin@example.com`
- **Password:** `Channgeme123` (intentional typo)
- **Role:** Admin (full panel access)
- **Starting Balance:** €0.00

### Login Instructions

1. **Start all services:**
   ```bash
   # Terminal 1: API backend
  corepack pnpm dev:api
   
   # Terminal 2: Player frontend
   corepack pnpm dev:player
   
   # Terminal 3: Admin panel (optional)
   corepack pnpm --filter admin-web dev
   ```

2. **Access applications:**
   - Player: http://localhost:3000 (or :3001 if port busy)
   - Admin: http://localhost:3100
   - API: http://localhost:3200

3. **Login with test credentials:**
   - Use email + password at the login screen
   - Session automatically persists via secure cookie

### Security Note

**Before production deployment:**
1. ⚠️ Disable default credentials in `.env` (remove `PLAYER_SEED_*` and `ADMIN_SEED_*` variables)
2. Generate strong `AUTH_COOKIE_SECRET` (see [apps/api/README.md](apps/api/README.md))
3. Use HTTPS only
4. Update database credentials
5. Review access control policies

For detailed authentication documentation, see [apps/api/README.md](apps/api/README.md).

---

## Repository Index
- [docs/INDEX.md](docs/INDEX.md): documentation map and reading order
- [apps/api/README.md](apps/api/README.md): **API authentication and backend documentation** ⭐ START HERE
- [apps/player-web/README.md](apps/player-web/README.md): player shell structure and UX components
- [packages/game-engine/README.md](packages/game-engine/README.md): engine structure and math config

## Top-Level Structure

### Apps
- **player-web:** Next.js player shell for live gameplay (localhost:3000)
  - Board rendering with PixiJS
  - State management with Zustand
  - Responsive layout: desktop / tablet / mobile / portrait modes
  
- **admin-web:** Internal admin panel for configuration and diagnostics (localhost:3100)
  - Game config viewer and selector
  - Math profile analysis and win-tier preview
  - RTP/volatility monitoring
  
- **api:** NestJS backend for authentication, sessions, and game state (localhost:3200)
  - Session-based authentication with role-based access control
  - Player wallet and ledger management
  - Game math profile and configuration service
  - Analytics ingestion endpoint

### Packages
- **game-engine:** Pure TypeScript slot engine with deterministic RNG
  - Math config, symbol weights, paytable
  - Board, cascade, cluster, and payout resolution
  - Simulation harness for RTP validation
  
- **shared-types:** Cross-app TypeScript contracts
- **ui:** Reusable UI component library

### Docs & Assets
- **docs/:** PRD, architecture, math models, asset reference
- **assets/:** Ignored external working files
