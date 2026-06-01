# PostgreSQL Persistence Guide

## Current Database

The active API database is PostgreSQL. Prisma datasource provider is `postgresql` in `apps/api/prisma/schema.prisma`.

Use this local connection shape:

```env
DATABASE_URL="postgresql://app_user:<postgres_password>@localhost:5432/eye_db?schema=public"
```

Docker Compose uses the `postgres` service and the `postgres_data` volume.

## Local Setup

1. Copy env templates:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

2. Set `POSTGRES_PASSWORD` in `.env`.
3. Set `DATABASE_URL` in `apps/api/.env`.
4. Start PostgreSQL:

```bash
docker compose up -d postgres
```

5. Apply migrations:

```bash
corepack pnpm --filter api prisma:migrate
```

6. Seed only when local seed env vars are intentionally set:

```bash
corepack pnpm --filter api prisma:seed
```

## Migration History

The current PostgreSQL migration baseline lives under:

```text
apps/api/prisma/migrations/20260413000001_migrate_sqlserver_to_postgresql/
```

Password-reset support was added later under:

```text
apps/api/prisma/migrations/20260601000001_password_reset_tokens/
```

Historical SQL Server rollout notes are superseded for current development. If old SQL Server data must be imported, use `docs/database-migration-sqlserver-to-postgresql.md` as the legacy-data migration reference.

## Verification

```bash
corepack pnpm --filter api prisma:generate
corepack pnpm --filter api lint
corepack pnpm --filter api test
corepack pnpm --filter api test:e2e
```

## Rollback

For local development, rollback is a PostgreSQL volume restore or a fresh database reset. Do not switch Prisma provider back to SQL Server for rollback; that is a separate migration project.
