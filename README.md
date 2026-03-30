# The Eye in the Sky

Professional monorepo for the slot-style simulation, player shell, and engine tooling.

## Quick Start

### Development
- **Player app:** `corepack pnpm dev:player` (localhost:3000)
- **Admin panel:** `corepack pnpm --filter admin-web dev` (localhost:3100)
- **Simulation (math validation):** `corepack pnpm simulate`

### API Server
- **Backend:** `corepack pnpm --filter api dev` (localhost:3200)
  - Handles authentication, sessions, and game logic
  - Requires SQL Server (see [apps/api/README.md](apps/api/README.md))


### Build & Lint
- **Full build:** `corepack pnpm build`
- **Full lint:** `corepack pnpm lint`

⚠️ **Important:** Never run `pnpm build` while `pnpm dev:*` is active. See [DEVELOPER_WORKFLOW.md](DEVELOPER_WORKFLOW.md) for safe dev/build patterns.
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
   corepack pnpm --filter api dev
   
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
