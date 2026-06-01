# Architecture Overview

## Runtime Shape

`The Eye in the Sky` is a pnpm monorepo with three app surfaces and shared packages.

```text
player-web -> /_api proxy -> api -> Prisma -> PostgreSQL
admin-web  -> /_api proxy -> api
api        -> game-engine for deterministic spin resolution
```

## Apps

- `apps/player-web`: Next.js player shell, PixiJS board, Zustand UI/runtime state, auth overlay, wallet flows, and iframe embed mode.
- `apps/admin-web`: Next.js operator panel for runtime profile control and analytics views.
- `apps/api`: NestJS API for auth, sessions, wallet/ledger state, round persistence, runtime config, and analytics.

## Packages

- `packages/game-engine`: deterministic slot math, config registry, payout resolution, and simulation harness.
- `packages/shared-types`: TypeScript contracts shared by API and web apps.
- `packages/ui`: shared UI package placeholder.

## Persistence

PostgreSQL is the active database. Prisma schema lives at `apps/api/prisma/schema.prisma`.

Core tables:

- `User`, `AuthSession`, `PasswordResetToken`
- `Wallet`, `LedgerEntry`
- `Round`, `GameSession`, `BonusState`
- `AppSetting`, `GameMathProfile`, `AdminAction`, `AuditLog`
- `AnalyticsRound`

## Player Web

The browser talks to the API through `/_api`, handled by `apps/player-web/middleware.ts`. This keeps the browser on the player origin and preserves cookie-based sessions.

The player shell owns:

- responsive viewport state through `useViewport()`
- one wake-lock controller instance
- auth/guest runtime selection
- Pixi board presentation
- floating dock controls
- `?embed=1` iframe shell trimming

## API

Auth is session-based. The raw cookie token is never stored; only a hash is persisted. Password reset uses one-time token hashes. Reset-password invalidates all sessions; change-password keeps existing sessions valid.

Spin resolution remains engine-owned. The API persists player state, ledger entries, round results, and runtime profile settings.

## Deployment Notes

- Docker Compose uses the `postgres` service and `postgres_data` volume.
- Player builds use `output: "standalone"`.
- Do not run `player-web` production builds while a dev server is active on port `3000`.
- On Windows, standalone trace copy can fail on symlink creation with `EPERM`; rerun build signoff in a symlink-capable environment.
