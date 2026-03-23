# The Eye in the Sky

Professional monorepo for the slot-style simulation, player shell, and engine tooling.

## Quick Start

### Development
- **Player app:** `corepack pnpm dev:player` (localhost:3000)
- **Admin panel:** `corepack pnpm --filter admin-web dev` (localhost:3100)
- **Simulation (math validation):** `corepack pnpm simulate`

### Build & Lint
- **Full build:** `corepack pnpm build`
- **Full lint:** `corepack pnpm lint`

## Repository Index
- [docs/INDEX.md](docs/INDEX.md): documentation map and reading order
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
  
- **api:** Reserved NestJS backend (placeholder for future services)

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
