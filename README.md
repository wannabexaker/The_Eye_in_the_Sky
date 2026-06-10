# The Eye in the Sky

A complete, production-deployed slot game built from scratch: deterministic TypeScript math engine, PixiJS presentation layer, NestJS backend, admin panel, and a full CI/CD pipeline shipping multi-arch Docker images to a live server.

**Live demo:** [eye.olamov.com](https://eye.olamov.com) — play instantly as guest, no signup needed.

> ## 💰 This game is for sale
>
> The Eye in the Sky is available for **acquisition or commercial licensing** — full source code, game math, artwork, and infrastructure included. The current build is a complete fake-money product: real-money integration, jurisdiction compliance, and operator-specific math tuning can be discussed as part of a deal.
>
> Interested? Contact **[dimos.is.dev@gmail.com](mailto:dimos.is.dev@gmail.com)** or open an issue / DM [@wannabexaker](https://github.com/wannabexaker).

## Overview

The project covers the full cycle of a slot title: math design and validation, engine development, presentation, account/wallet backend, analytics, and deployment. It currently runs as a fake-money product — it is not a real-money gambling product.

## Features

### Gameplay
- 6×5 cluster-pays board with cascades, rendered in PixiJS 8 inside a Next.js shell.
- Samsara bonus meter and "Sky Opens" free-spins bonus with its own presentation flow.
- Runtime-selectable math profiles (RTP / volatility variants) backed by API settings.
- Win choreography system: tiered win presentation, multiplier cues, cascade chains.

### Player experience
- Fully responsive, board-first shell: phone portrait, tablet, near-square and landscape layouts each get a dedicated grid so the board always claims the available space.
- Luxury SVG spin dock, ritual log with session history, and one-tap Session Analytics (RTP trend, win distribution, cascade histogram, CSV export) — tracked for guests and registered players alike.
- Guest mode works fully offline from the API; registered accounts get server-side wallet, ledger, and resumable game state.
- WebP-optimized art pipeline (symbols ~60 KB each), capped render DPR, and adaptive graphics quality for smooth loading on mobile.

### Platform
- Session-based auth (HTTP-only cookies, server-side revocation) with player/admin roles.
- Admin panel for math-profile selection and RTP monitoring.
- Simulation harness for long-run RTP and volatility validation, with regression bands in CI.
- CI/CD: lint + typecheck + unit/e2e tests, multi-arch (amd64 + arm64) Docker images published to GHCR, live-site verification — currently deployed on a Raspberry Pi behind Cloudflare.

## Architecture

pnpm workspace with three apps and three shared packages. The API uses Prisma against PostgreSQL. The player renders the board with PixiJS and keeps UI state in Zustand.

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
| Docker + GHCR | Multi-arch images (amd64/arm64), compose deployment |

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

This starts PostgreSQL, generates the Prisma client, applies migrations, seeds configured local accounts, and runs the API, player, and admin apps together. On Windows, `start-game.bat` does the same in three terminal windows.

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

## Testing

| Command | Scope |
|---|---|
| `corepack pnpm -r --if-present test` | Unit tests (game-engine RTP regression bands, API validators) |
| `corepack pnpm --filter api test:e2e` | API end-to-end (auth, security, sessions) |
| `corepack pnpm --filter player-web exec playwright test` | Player UI end-to-end (auth flow, fluid responsive shell) |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, API e2e, and build on every push and pull request.

## Deployment

`.github/workflows/build.yml` builds and publishes per-app Docker images to GHCR on every push to `main` and on release tags (`v*`), for both `linux/amd64` and `linux/arm64`. Production runs from `docker-compose.prod.yml`:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

The reference deployment is a Raspberry Pi behind a Cloudflare tunnel serving [eye.olamov.com](https://eye.olamov.com).

## Notes

- Do not run `pnpm build` while `pnpm dev:*` is active. The player build guard aborts when port `3000` is busy to avoid `.next` cache corruption.
- On Windows, standalone Next builds may compile and then fail on symlink creation with `EPERM`. Enable Windows Developer Mode or run build signoff in Docker/WSL/Linux; do not remove `output: "standalone"` to work around it.
- Seed credentials are local-only. Keep `PLAYER_SEED_*` and `ADMIN_SEED_*` blank in committed examples and set them only in ignored local env files.

## License

Free Personal Use License (FPUL) — free for personal, non-commercial use; all rights reserved. **Any commercial use requires a license or acquisition** — see the for-sale notice above and [LICENSE](LICENSE) for the full terms.
