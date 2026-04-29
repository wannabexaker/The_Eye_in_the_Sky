# The Eye in the Sky

pnpm monorepo — slot simulation platform with a playable player shell, admin panel, NestJS API, and a deterministic TypeScript game engine

## Overview

Full-stack slot simulation system built for math validation, engine development, and full-cycle gameplay testing. Not a real-money product. The game engine is a shared package imported by both the player shell and the API, allowing the same math logic to be exercised in isolation via a simulation harness without running a server.

## Features

- Playable slot UI rendered with PixiJS 8 inside a Next.js shell — board, spin, win/loss display
- Deterministic game engine with configurable math profiles (v2.0, simple, legacy) selectable at runtime via `AppSetting`
- Simulation harness (`pnpm simulate`) for RTP and volatility validation without a running server
- Session-based authentication with role-based access (Player, Admin); server-side session table enables revocation
- Player wallet with EUR balance; every bet and win recorded in `LedgerEntry`
- Admin panel: math profile selector, win-tier preview, RTP/volatility monitoring
- Analytics ingestion endpoint with per-spin aggregation into `AnalyticsRound`
- Swagger API documentation served by NestJS
- Build guard script prevents `next build` from running while a dev server holds the `.next` cache

## Architecture

pnpm workspace with two apps (`player-web`, `admin-web`) and three shared packages (`game-engine`, `shared-types`, `ui`). The API uses Prisma as the ORM against SQL Server. The player shell renders the slot board with PixiJS inside a React component and manages game state with Zustand.

Data flow: player spin → `player-web` → `api` (session check + wallet debit) → `game-engine` (spin resolution) → `api` persists `Round` + `LedgerEntry` → response → `player-web` renders outcome.

### Components

| Component | Role |
|---|---|
| `apps/player-web/` | Next.js 15 player shell; PixiJS board renderer; Zustand state; localhost:3000 |
| `apps/admin-web/` | Admin panel; math profile config, RTP monitoring; localhost:3100 |
| `apps/api/` | NestJS 11 REST API; auth, sessions, wallet, game logic, analytics; localhost:3200 |
| `packages/game-engine/` | Pure TypeScript slot engine; math configs, paytable, payout resolution, simulation harness |
| `packages/shared-types/` | Cross-app TypeScript contracts |
| `packages/ui/` | Shared UI component library |

## Tech Stack

| Technology | Role |
|---|---|
| Next.js 15 | player-web and admin-web |
| React 19 | Frontend component model |
| PixiJS 8 | Slot board rendering |
| Zustand 5 | Player-web state management |
| NestJS 11 | API framework |
| Prisma 6 | ORM and schema migrations |
| SQL Server | Primary database |
| TypeScript | All packages |
| Zod | API request validation |
| pnpm 10 (corepack) | Package manager |

## Installation

```bash
git clone https://github.com/wannabexaker/The_Eye_in_the_Sky
cd The_Eye_in_the_Sky
corepack pnpm install
```

SQL Server must be running. Configure the connection string in `apps/api/.env` (see `apps/api/README.md` for schema and required vars).

```bash
cd apps/api
corepack pnpm prisma:migrate
corepack pnpm prisma:seed
```

## Usage

```bash
# Terminal 1 — API
corepack pnpm dev:api

# Terminal 2 — Player shell
corepack pnpm dev:player

# Terminal 3 — Admin panel (optional)
corepack pnpm dev:admin
```

| App | URL |
|---|---|
| Player | `http://localhost:3000` |
| Admin | `http://localhost:3100` |
| API | `http://localhost:3200` |

Run the math simulation without a running server:

```bash
corepack pnpm simulate
```

```bash
# Full build (all packages)
corepack pnpm build
```

Do not run `pnpm build` while a `pnpm dev:*` process is active — the `.next` cache will conflict. Use `pnpm dev:player:clean` to wipe the cache before starting dev if needed.

## Project Structure

```
The_Eye_in_the_Sky/
├── apps/
│   ├── player-web/            — Next.js player shell (PixiJS board, Zustand)
│   ├── admin-web/             — Admin panel
│   └── api/                   — NestJS API (auth, wallet, game, analytics)
│       └── prisma/
│           ├── schema.prisma  — DB schema
│           └── seed.ts        — test user seeding
├── packages/
│   ├── game-engine/           — deterministic slot engine + simulation harness
│   ├── shared-types/          — cross-app TypeScript contracts
│   └── ui/                    — shared UI components
├── docs/                      — PRD, architecture, math model docs
├── pnpm-workspace.yaml        — workspace definition
└── package.json               — root scripts
```

## Notes

The seed script (`prisma:seed`) creates default test accounts. Remove `PLAYER_SEED_*` and `ADMIN_SEED_*` from the API `.env` before any non-development deployment.

The `game-engine` package is imported directly by the API — spin resolution happens in the same process as the HTTP handler, not in a separate worker. This simplifies the stack but means CPU-intensive simulation runs block the API event loop if triggered over HTTP.

Never run `pnpm build` while `pnpm dev:*` is active. The build script includes a guard (`apps/player-web/scripts/guard-no-dev-server.cjs`) that detects a running dev server and aborts, but the check is heuristic — use `pnpm dev:player:clean` to wipe `.next` before building if you encounter stale-cache issues.
