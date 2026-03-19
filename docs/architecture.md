# Architecture

## Principles
- Engine first, UI second
- Server-authoritative design path
- Clean monorepo boundaries
- Fake-money wallet still uses ledger concepts
- React components render state only; business logic lives outside UI

## Monorepo Structure
```text
apps/
  api/
  player-web/
  admin-web/

packages/
  game-engine/
  shared-types/
  ui/

docs/
  INDEX.md
  architecture.md
  assets.md
  game-math.md
  game-economy.md
  roadmap.md
  tasks.md
```

## Runtime Responsibilities
### apps/player-web
- Next.js player shell
- PixiJS board renderer
- Zustand UI/session state
- Calls deterministic `resolveSpin` path
- Renders outcomes only
- grouped by runtime concern:
  - `components/board/`
  - `components/controls/`
  - `components/layout/`
  - `components/modals/`
  - `components/presentation/`
  - `components/debug/`
  - `hooks/gameplay/`
  - `lib/assets/`
  - `lib/audio/`
  - `lib/presentation/`
  - `lib/state/`
- viewport contract:
  - fixed `100dvh` game shell
  - top HUD, central board area, bottom control bar
  - no-scroll gameplay policy
  - compact inline rounds only, full details in overlays

### apps/admin-web
- Internal balancing/config tooling
- Simulation runner UI
- Config/profile comparison
- Audit and round inspection

### apps/api
- NestJS HTTP API
- Swagger docs
- JWT auth shell
- wallet / ledger / rounds / config endpoints
- future job orchestration via BullMQ

### packages/game-engine
- Pure TypeScript game logic
- Seeded RNG
- board generation
- win evaluation
- cascades
- modifiers
- bonus logic
- simulation and reporting

### packages/shared-types
- Cross-app contracts
- round shapes
- API DTO-like interfaces
- config profile types

### packages/ui
- shared UI primitives
- design tokens
- reusable shell components

## Phase 1 Flow
1. Player chooses bet and multiplier.
2. Player calls local or backend-ready round resolver.
3. Engine resolves deterministic outcome from input + seed + config.
4. Engine returns round payload with audit-friendly fields.
5. Wallet abstraction applies fake-money delta.
6. Player UI renders the pre-decided result.

## Deterministic Round Model
- input:
  - player id/session id
  - bet
  - win multiplier selection
  - game state
  - seed or seed source
  - config version
- output:
  - initial board
  - evaluated wins
  - cascades
  - modifiers
  - bonus state before/after
  - wallet delta
  - ending board
  - debug metadata

Required round payload fields:
- `seedUsed`
- `configVersion`
- `initialBoard`
- `endingBoard`
- `evaluatedWins`
- `cascades`
- `multipliersTriggered`
- `modifiersTriggered`
- `meterProgress`
- `bonusTriggered`
- `bonusStateBefore`
- `bonusStateAfter`
- `totalWin`
- `walletDelta`
- `roundSummary`
- `debugMetadata`

## Engine Pipeline Contract
Recommended engine flow:
1. `resolveSpin(input)`
2. seed normalization
3. config load by version
4. board generation
5. modifier pre-processing
6. cluster evaluation
7. payout aggregation
8. cascade loop
9. bonus state update
10. wallet delta calculation
11. audit-friendly response shaping

Recommended boundary:
- `packages/game-engine` owns all outcome logic
- `apps/player-web` owns only playback and feedback sequencing
- `apps/api` will eventually own persistence, auth, and server-authoritative orchestration

## Backend Module Plan
- `auth`
- `users`
- `wallet`
- `ledger`
- `game-catalog`
- `game-engine`
- `rounds`
- `bonus-state`
- `admin`
- `audit-logs`

## Data Layer Direction
- PostgreSQL for wallet/ledger/round storage
- Prisma as schema and client
- Redis for caching, sessions, queues, and simulation job state
- BullMQ for async simulations and admin tasks

## API Draft
### Public / player-facing
- `POST /api/v1/auth/guest`
- `GET /api/v1/me`
- `GET /api/v1/games`
- `POST /api/v1/games/:gameKey/spin`
- `GET /api/v1/wallet`
- `GET /api/v1/rounds`
- `POST /api/v1/wallet/reset`

### Admin/internal
- `GET /api/v1/admin/math-profiles`
- `POST /api/v1/admin/math-profiles/:profileId/simulate`
- `GET /api/v1/admin/rounds`
- `PUT /api/v1/admin/games/:gameKey/config`

## Round History Contract Direction
Recommended persisted round fields:
- round id
- user id
- game key
- config version
- seed used
- bet
- total win
- wallet delta
- mode
- initial board
- ending board
- cascades
- multipliers/modifiers triggered
- bonus state before
- bonus state after
- debug metadata in dev/internal contexts

## Current Gaps
- API app exists as health + Swagger bootstrap only
- Prisma schema draft not yet wired to runtime
- shared-types package needs wider adoption across engine and UI
- Tailwind and Zustand are present directionally but not yet adopted as the primary UI/state layers everywhere
- Pixi board currently handles presentation and playback, but effect depth and pooling still need more polish
- responsive viewport compression rules still need implementation validation across 1600x900, 1366x768, and 1280x720
- backend config loading by `configVersion` is documented but not yet wired to storage/runtime selection

## Change Log
- `2026-03-15`
  - Created initial architecture notes aligned with PRD and current repo state
  - Updated notes after adding api/admin/shared/ui skeletons and Pixi/Zustand direction
- `2026-03-16`
  - Documented final Phase 1 engine round payload contract, deterministic seed usage, config version propagation, and simulation/reporting requirements
