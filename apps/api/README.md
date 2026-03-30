# The Eye in the Sky - API Backend

NestJS backend for "The Eye in the Sky" slot game. Handles authentication, player sessions, game state management, and analytics.

## Quick Start

```bash
# Install dependencies
corepack pnpm install

# Run database migrations
corepack pnpm prisma migrate deploy

# Start development server
corepack pnpm dev
```

API runs on `http://localhost:3200` (or port specified in environment)

---

## Authentication System

### Overview

The API implements a session-based authentication system with role-based access control (RBAC):

- **Roles:**
  - `player`: Standard player account (base game access)
  - `admin`: Administrator account (full system access)

- **Session Management:**
  - HTTP-only cookies store session tokens
  - Sessions expire after 24 hours
  - Auto-renewal on activity

### Development Credentials

#### ⚠️ IMPORTANT: These are temporary development credentials only

For rapid testing without registration, two default accounts are automatically seeded on first run:

**Standard Player Account:**
- Username/Email: `user@example.com`
- Password: `Changeme123`
- Role: `player`
- Default Balance: €100.00

**Admin Account:**
- Username/Email: `admin@example.com`
- Password: `Channgeme123` (note: typo is intentional)
- Role: `admin`
- Default Balance: €0.00

#### Enabling Development Credentials

Edit `.env.development` (or `.env` for local testing):

```env
# ⚠️ DEVELOPMENT ONLY
PLAYER_SEED_EMAIL="user@example.com"
PLAYER_SEED_PASSWORD="Changeme123"
ADMIN_SEED_EMAIL="admin@example.com"
ADMIN_SEED_PASSWORD="Channgeme123"
```

These credentials are seeded during application bootstrap (`BootstrapService`). To disable them, remove/comment out the environment variables.

---

## Authentication API

### Login Endpoint

**POST** `/auth/login`

Request body:
```json
{
  "email": "user@example.com",
  "password": "Changeme123"
}
```

Response (on success):
```json
{
  "authenticated": true,
  "user": {
    "id": "clm4xyz...",
    "email": "user@example.com",
    "displayName": "Test Player",
    "role": "player"
  },
  "sessionId": "sess_abc123..."
}
```

Session token is automatically set in HTTP-only cookie (`auth_session`).

### Logout Endpoint

**POST** `/auth/logout`

Invalidates current session and clears cookie.

### Get Current Session

**GET** `/auth/me`

Returns current authenticated user info (requires valid session cookie).

### Register New Player

**POST** `/auth/register`

Request body:
```json
{
  "email": "newplayer@example.com",
  "password": "SecurePassword123!",
  "displayName": "My Nickname"
}
```

Requirements:
- Email must be valid and unique
- Password minimum 8 characters
- Display name is optional (defaults to "Temple Initiate")

---

## Role-Based Access Control

### Player Role (`player`)
- Access to player-web frontend
- Can play games and manage own wallet
- Cannot access admin panel or system settings
- Cannot view other players' data

### Admin Role (`admin`)
- Full access to admin-web dashboard
- Can view game configurations
- Can access analytics and reports
- Can manage system settings
- Can view audit logs

Access is enforced via:
- `@AuthGuard()` decorator on protected routes
- Type checking at `CurrentAuthUser` level
- Permission validation in route handlers

---

## Security Considerations

### Password Security
- Passwords are hashed using bcrypt with 12 salt rounds (see `auth.crypto.ts`)
- Plain-text passwords never stored in database
- Hash verified using timing-safe comparison

### Session Security
- Sessions use cryptographic tokens (bcrypt + random salt)
- Token hashes stored, not raw tokens
- HTTP-only cookies prevent XSS access
- SameSite=Lax prevents CSRF attacks
- Secure flag enforced on HTTPS

### Production Deployment

**Before going live:**

1. ⚠️ **Remove development credentials:**
   ```env
   # Delete or comment out:
   # PLAYER_SEED_EMAIL=...
   # PLAYER_SEED_PASSWORD=...
   # ADMIN_SEED_EMAIL=...
   # ADMIN_SEED_PASSWORD=...
   ```

2. **Generate strong cookie secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Set as `AUTH_COOKIE_SECRET` in production environment

3. **Enable HTTPS only:**
   - All requests must use HTTPS
   - Secure cookie flag automatically enforced
   - Update CORS_ALLOWED_ORIGINS to HTTPS origins

4. **Database security:**
   - Use strong SQL Server credentials
   - Enable encryption for database connection
   - Regular backups and disaster recovery plan

5. **Monitoring:**
   - Log all authentication attempts
   - Alert on failed login patterns
   - Monitor session duration anomalies

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | SQL Server connection string | `sqlserver://...` |
| `API_DEV_KEY` | Development API identifier | `local-dev-key` |
| `AUTH_COOKIE_SECRET` | Secret for session token signing | Long random string |
| `PLAYER_SEED_EMAIL` | Default player email (dev only) | `user@example.com` |
| `PLAYER_SEED_PASSWORD` | Default player password (dev only) | `Changeme123` |
| `ADMIN_SEED_EMAIL` | Default admin email (dev only) | `admin@example.com` |
| `ADMIN_SEED_PASSWORD` | Default admin password (dev only) | `Channgeme123` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000,...` |

---

## Architecture

### Key Files

- **`auth.service.ts`** - Core authentication logic (login, register, session management)
- **`auth.controller.ts`** - HTTP endpoints for auth operations
- **`auth.crypto.ts`** - Password hashing, token generation, verification
- **`auth.helpers.ts`** - Utility functions (email normalization, IP extraction)
- **`auth.guard.ts`** - Route guard for protected endpoints
- **`bootstrap-data.ts`** - Initial data seeding (including default users)
- **`auth.types.ts`** - TypeScript interfaces for auth data

### Database Schema

See `prisma/schema.prisma`:
- `User` - Player and admin accounts
- `AuthSession` - Active sessions with expiry
- `Wallet` - Player balances and transactions

---

## Development Workflow

### Local Testing

1. Ensure SQL Server is running and DATABASE_URL is configured
2. Run migrations: `corepack pnpm prisma migrate deploy`
3. Start dev server: `corepack pnpm dev`
4. Login with seeded credentials:
   - User: `user@example.com` / `Changeme123`
   - Admin: `admin@example.com` / `Channgeme123`

### Creating New Migrations

```bash
# After modifying schema.prisma
corepack pnpm prisma migrate dev --name description_of_change
```

### Resetting Database

```bash
# Full reset (deletes all data)
corepack pnpm prisma migrate reset
```

---

## Troubleshooting

### "Invalid credentials" on login
- Verify email and password match exactly (case-sensitive for email)
- Check that user account is marked as `isActive = true`
- Ensure PLAYER_SEED_PASSWORD matches what's in bootstrap (if using seeded user)

### Session not persisting
- Verify `AUTH_COOKIE_SECRET` is set and consistent
- Check browser cookie settings (allow HTTP-only, third-party cookies)
- Confirm SameSite cookie policy isn't blocking requests

### Admin panel shows "Unauthorized"
- Verify logged-in user has `role = "admin"`
- Check admin-web is sending session cookie with requests
- Confirm CORS_ALLOWED_ORIGINS includes admin frontend origin

---

## License

Proprietary - The Eye in the Sky
