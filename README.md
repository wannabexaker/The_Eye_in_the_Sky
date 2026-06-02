# The Eye in the Sky

Private pnpm monorepo for a fake-money slot prototype: player shell, admin panel, NestJS API, and deterministic TypeScript game engine.

## Overview

The project is built for math validation, engine development, and full-cycle gameplay testing. It is not a real-money gambling product. The shared game engine can be exercised through the player, the API, or the simulation harness.

## Features

- Playable PixiJS slot board in a Next.js player shell.
- Runtime-selectable math profiles backed by API settings.
- Session-based auth with role-based player/admin access.
- Server-side wallet, ledger, round, and bonus-state persistence.
- Admin panel for math-profile selection and diagnostics.
- Simulation harness for RTP and volatility validation.
- Build guard that prevents `next build` while the player dev server owns `.next`.

## Architecture

pnpm workspace with two apps and three shared packages. The API uses Prisma against PostgreSQL. The player renders the board with PixiJS and keeps UI state in Zustand.

Data flow:

```text
player-web -> /_api proxy -> api -> game-engine -> PostgreSQL -> player-web presentation
```

| Component | Role |
|---|---|
| `apps/player-web/` | Next.js 15 player shell, PixiJS board, Zustand state, localhost:3000 |
| `apps/admin-web/` | Admin panel, math profile config, RTP monitoring, localhost:3100 |
| `apps/api/` | NestJS 11 REST API, auth, sessions, wallet, rounds, analytics, localhost:3200 |
| `packages/game-engine/` | Pure TypeScript slot engine, math configs, payout resolution, simulation |
| `packages/shared-types/` | Cross-app TypeScript contracts |
| `packages/ui/` | Shared UI component package |

## Tech Stack

| Technology | Role |
|---|---|
| Next.js 15 | player-web and admin-web |
| React 19 | Frontend component model |
| PixiJS 8 | Slot board rendering |
| Zustand 5 | Player-web state management |
| NestJS 11 | API framework |
| Prisma 6 | ORM and migrations |
| PostgreSQL | Primary database |
| TypeScript | All packages |
| Zod | API request validation |
| pnpm 10 | Package manager via corepack |

## Setup

```bash
git clone https://github.com/wannabexaker/The_Eye_in_the_Sky
cd The_Eye_in_the_Sky
corepack pnpm install
```

PostgreSQL must be running. Copy the env examples and set local secrets:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Then run API migrations and seed only if local seed accounts are configured:

```bash
corepack pnpm --filter api prisma:migrate
corepack pnpm --filter api prisma:seed
```

## Development

Fast local path when Docker is available:

```bash
corepack pnpm dev:full
```

This starts PostgreSQL, generates the Prisma client, applies migrations, seeds configured local accounts, and runs the API, player, and admin apps together.

```bash
# Terminal 1 - API
corepack pnpm dev:api

# Terminal 2 - Player shell
corepack pnpm dev:player

# Terminal 3 - Admin panel
corepack pnpm dev:admin
```

| App | URL |
|---|---|
| Player | `http://localhost:3000` |
| Admin | `http://localhost:3100` |
| API | `http://localhost:3200` |

Run the math simulation without starting the apps:

```bash
corepack pnpm simulate
```

Run the full build only after stopping dev servers:

```bash
corepack pnpm build
```

## Notes

- Do not run `pnpm build` while `pnpm dev:*` is active. The player build guard aborts when port `3000` is busy to avoid `.next` cache corruption.
- On Windows, standalone Next builds may compile and then fail on symlink creation with `EPERM`. Enable Windows Developer Mode or run build signoff in Docker/WSL/Linux; do not remove `output: "standalone"` to work around it.
- Seed credentials are local-only. Keep `PLAYER_SEED_*` and `ADMIN_SEED_*` blank in committed examples and set them only in ignored local env files.
