# Security Guide

## Scope

`The Eye in the Sky` is a fake-money prototype. It still treats authentication, sessions, wallet state, and operator access as production-style security boundaries.

## Authentication

- Passwords are hashed with bcrypt in `apps/api/src/auth.crypto.ts`.
- Raw session tokens are stored only in HTTP-only cookies.
- The database stores session token hashes in `AuthSession`.
- Logout deletes the current session.
- Password reset uses one-time `PasswordResetToken` rows.
- Reset-password invalidates all sessions for that user.
- Change-password keeps existing sessions valid.

## Cookies

Local development defaults to `SameSite=Lax` cookies.

For HTTPS iframe deployments, set:

```env
COOKIE_SECURE=true
```

That emits `SameSite=None; Secure` auth cookies for third-party iframe use.

## Seed Accounts

Committed examples must keep seed account variables blank. Set `PLAYER_SEED_*` and `ADMIN_SEED_*` only in ignored local env files when a local seed run needs them.

## Database

PostgreSQL is the active database. Use least-privilege runtime credentials and keep owner/admin credentials out of the API runtime environment.

See `docs/security/db-user-setup.sql` for a PostgreSQL runtime-user template.

## Production Checklist

- [ ] Real `.env` files are ignored and not committed.
- [ ] `AUTH_COOKIE_SECRET` is a long random value.
- [ ] Seed account env vars are blank or absent.
- [ ] `COOKIE_SECURE=true` behind HTTPS.
- [ ] CORS origins are exact production origins.
- [ ] PostgreSQL runtime user is least-privilege.
- [ ] Database backups are scheduled and restore-tested.
- [ ] Security tests pass.

## Incident Response

If credentials or session secrets leak:

1. Rotate `AUTH_COOKIE_SECRET`.
2. Delete all `AuthSession` rows.
3. Rotate database credentials.
4. Review audit and auth logs.
5. Force affected users through password reset.

## Reporting

Define the private reporting process before any public release. Until then, treat security issues as private repository issues and do not publish exploit details.
