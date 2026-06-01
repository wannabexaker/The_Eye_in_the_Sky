# The Eye in the Sky API

NestJS backend for auth, player sessions, wallet/ledger persistence, game state, runtime math config, and analytics.

## Quick Start

```bash
corepack pnpm install
corepack pnpm --filter api prisma:migrate
corepack pnpm --filter api start:dev
```

The API listens on `http://localhost:3200` by default.

## Database

Prisma is configured for PostgreSQL in `apps/api/prisma/schema.prisma`.

```env
DATABASE_URL="postgresql://app_user:<postgres_password>@localhost:5432/eye_db?schema=public"
```

Use ignored local env files for real credentials. The committed `.env.example` files must stay placeholder-only.

## Auth

- Session tokens are stored in HTTP-only cookies.
- Session rows are stored in `AuthSession` so server-side revocation is possible.
- Passwords are hashed in `auth.crypto.ts`.
- Player/admin access is enforced with Nest guards and `CurrentAuthUser`.
- Password reset uses one-time `PasswordResetToken` rows.

For HTTPS iframe deployments, set:

```env
COOKIE_SECURE=true
```

That emits auth cookies as `SameSite=None; Secure`. Local HTTP development should leave it `false`.

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `API_DEV_KEY` | Development API identifier | `local-dev-key` |
| `AUTH_COOKIE_SECRET` | Secret for session token signing | long random string |
| `COOKIE_SECURE` | Enables `SameSite=None; Secure` cookies | `false` locally, `true` behind HTTPS |
| `PLAYER_SEED_EMAIL` / `PLAYER_SEED_PASSWORD` | Optional local seed player | leave blank in committed examples |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | Optional local seed admin | leave blank in committed examples |
| `CORS_ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000,...` |

## Key Files

- `auth.controller.ts` - auth endpoints
- `auth.service.ts` - login, register, sessions, password reset
- `auth.helpers.ts` - cookie/session helpers
- `auth.guard.ts` - route guards
- `player.controller.ts` / `player.service.ts` - wallet, bootstrap, rounds
- `game-config.controller.ts` - runtime math-profile config
- `prisma/schema.prisma` - PostgreSQL schema

## Development Workflow

```bash
# Generate Prisma client
corepack pnpm --filter api prisma:generate

# Apply local migrations
corepack pnpm --filter api prisma:migrate

# Run unit tests
corepack pnpm --filter api test

# Run e2e tests
corepack pnpm --filter api test:e2e
```

## Security Notes

- Never commit `.env` files or real database URLs.
- Keep seed account env vars blank outside local development.
- Rotate `AUTH_COOKIE_SECRET` before any non-local deployment.
- Use least-privilege PostgreSQL credentials for the runtime API user.
- Keep CORS origins exact; do not use broad wildcards.
