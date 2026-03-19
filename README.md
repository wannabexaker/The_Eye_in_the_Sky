# The Eye in the Sky

Professional monorepo for the slot-style simulation, player shell, and engine tooling.

## Quick Start
- Player app: `corepack pnpm dev:player`
- Full lint: `corepack pnpm lint`
- Full build: `corepack pnpm build`
- Simulation: `corepack pnpm simulate`

## Repository Index
- [docs/INDEX.md](/c:/Projects/MyTests/Tsogos/docs/INDEX.md): documentation map and reading order
- [apps/player-web/README.md](/c:/Projects/MyTests/Tsogos/apps/player-web/README.md): player shell structure
- [packages/game-engine/README.md](/c:/Projects/MyTests/Tsogos/packages/game-engine/README.md): engine structure

## Top-Level Structure
```text
apps/
  player-web/        Next.js player shell
  admin-web/         internal tooling
  api/               reserved backend shell

packages/
  game-engine/       deterministic slot engine
  shared-types/      shared cross-app contracts
  ui/                reusable UI package

docs/                product, architecture, math, and asset docs
assets/              ignored external working assets
```
