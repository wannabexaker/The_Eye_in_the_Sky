# Security & Authentication Guide

## Overview

"The Eye in the Sky" implements a secure authentication system with role-based access control (RBAC). This guide covers essential security practices for development and production.

---

## Authentication Architecture

### Flow Diagram

```
User Login
    ↓
POST /auth/login (email, password)
    ↓
Verify email exists & isActive
    ↓
Verify password (bcrypt timing-safe)
    ↓
Generate session token (cryptographic random)
    ↓
Hash token → store in database
    ↓
Set HTTP-only cookie
    ↓
Return session info
    ↓
User authenticated
```

### Session Lifecycle

1. **Creation**: User logs in, receives secure token
2. **Storage**: Token hash stored in `AuthSession` table
3. **Transmission**: Token in HTTP-only cookie (never JavaScript-accessible)
4. **Expiry**: 24-hour TTL on sessions
5. **Renewal**: Auto-renewed on activity within window
6. **Revocation**: Deleted on explicit logout

---

## Development vs. Production

### Development (Default Behavior)

**Enabled by .env.development:**
- Default user: `user@example.com` / `Changeme123` (€100 balance)
- Default admin: `admin@example.com` / `Channgeme123` (€0 balance)
- HTTP cookies allowed (for localhost testing)
- CORS permissive (all localhost origins)

**Use for:**
- Local testing without registration flow
- Admin functionality validation
- Session management debugging

### Production (Security-First)

**Required configuration changes:**

1. **Remove seeded credentials:**
   ```env
   # ❌ DELETE or comment out:
   PLAYER_SEED_EMAIL=...
   PLAYER_SEED_PASSWORD=...
   ADMIN_SEED_EMAIL=...
   ADMIN_SEED_PASSWORD=...
   ```

2. **Set strong cookie secret:**
   ```bash
   # Generate 32-byte random hex
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Set in production:
   AUTH_COOKIE_SECRET="abc123def456..." # Your 64-char hex string
   ```

3. **Enable HTTPS only:**
   - All requests must use HTTPS
   - Secure cookie flag automatically enforced
   - Mixed HTTP/HTTPS traffic will fail

4. **Restrict CORS:**
   ```env
   CORS_ALLOWED_ORIGINS="https://yourdomain.com,https://admin.yourdomain.com"
   ```

5. **Database hardening:**
   - Use strong SQL Server credentials (minimum 12 chars, mixed case/numbers/symbols)
   - Enable connection encryption
   - Restrict IP access to application servers only
   - Regular automated backups

---

## Password Security

### Password Policy

- **Minimum 8 characters** (enforced at registration)
- **No length maximum** (support passphrases)
- **No character restrictions** (allow all Unicode)
- **Hashing**: bcrypt with 12 salt rounds (expensive timing)

### Storage

```typescript
// Password never stored in plain text
passwordHash = await hash(password, 12) // bcrypt with 12 rounds
// Takes ~250ms per hash (brute-force resistant)
```

### Verification

```typescript
// Timing-safe comparison prevents timing attacks
const isValid = await verify(providedPassword, storedHash)
// Comparison time is independent of password position matching
```

### User Guidelines

For development credentials and user-created passwords:
- Avoid common patterns (birth dates, sequential numbers)
- Use mixture of uppercase, lowercase, numbers
- Unique passwords per service (don't reuse across sites)

---

## Session Security

### Secure Cookie Implementation

```typescript
response.cookie(AUTH_SESSION_COOKIE, token, {
  httpOnly: true,           // ✓ JavaScript cannot access
  sameSite: "Lax",          // ✓ CSRF protection (cross-site POST blocked)
  secure: isSecureRequest,  // ✓ HTTPS only in production
  expires: expiresAt,       // ✓ 24-hour expiry
  path: "/"                 // ✓ Sent to all app routes
})
```

### Token Security

- **Generation**: 32 bytes of cryptographic randomness
- **Transmission**: In HTTP-only cookie (not URL or JSON)
- **Storage**: Hashed with bcrypt before database insert
- **Comparison**: Timing-safe (constant-time) lookup

### Prevention

- **XSS Protection**: HTTP-only cookie prevents JavaScript theft
- **CSRF Protection**: SameSite=Lax prevents cross-site form forging
- **Session Fixation**: New token issued on re-login
- **Replay Attack**: Token hash checked (not transmitted plaintext)

---

## Role-Based Access Control (RBAC)

### Roles

| Role | Access | Use Case |
|------|--------|----------|
| `player` | Base game only | End users |
| `admin` | Full system access | Operators, support |

### Enforcement Points

1. **Guard Decorator**: Route-level protection
   ```typescript
   @Post("admin/settings")
   @roleRequired("admin")  // Enforced here
   updateSettings() { }
   ```

2. **Type System**: TypeScript catches role mismatches
   ```typescript
   if (user.role === "admin") {
     // TypeScript narrows to admin capabilities
   }
   ```

3. **Database Queries**: User data isolated by ID
   ```sql
   WHERE userId = @currentUserId  -- Can't access other users' data
   ```

### Admin Panel Access

- Direct URL access without auth → redirects to login
- Login with non-admin credentials → "Unauthorized" error
- Login with admin credentials → Full access granted

---

## Attack Prevention

### SQL Injection
- **Defense**: Prisma ORM with parameterized queries
- **Never**: Build queries with string concatenation
- **Result**: Database queries are safe from user input

### XSS (Cross-Site Scripting)
- **Defense**: HTTP-only cookies + React auto-escaping
- **Never**: Set tokens in localStorage (JavaScript accessible)
- **Result**: Malicious scripts can't steal session tokens

### CSRF (Cross-Site Request Forgery)
- **Defense**: SameSite=Lax cookies + origin validation
- **How**: POST from external site won't include valid cookie
- **Result**: Attacker can't forge authenticated requests

### Brute Force
- **Defense**: Expensive bcrypt hashing (12 salt rounds)
- **Time**: ~250ms per login attempt
- **Rate Limit**: (Optional future enhancement) - not currently implemented
- **Result**: ~400 attempts per hour per IP

### Session Hijacking
- **Defense**: HTTPS enforcement + secure cookie flags
- **Prevention**: Token transmitted only over encrypted connection
- **Result**: Attacker can't intercept valid tokens

---

## Monitoring & Audit Logging

### Recommended Alerts

Log and alert on:
- Repeated failed login attempts from same IP
- Admin user login from unusual location/time
- Session activity from multiple concurrent IPs
- Unusual wallet transaction patterns
- Unauthorized API access (4xx/5xx errors)

### Current Logging

Basic logging via NestJS console output:
- Login attempts (success/failure)
- Registration events
- Session creation/deletion
- Role-based access decisions

### Future Enhancements

Implement:
- Structured logging (JSON format)
- Centralized log aggregation (ELK stack, CloudWatch)
- Real-time anomaly detection
- Admin action audit trail with timestamps + IP

---

## Compliance & Standards

### Password Security
- ✓ OWASP Top 10: Prevention of A2 (Broken Auth)
- ✓ NIST: Bcrypt with strong salt rounds
- ✓ Industry: 8+ character minimum, no restrictions

### Data Protection
- ✓ Session tokens encrypted in transit (HTTPS)
- ✓ Passwords hashed (bcrypt)
- ✓ SQL Server encryption for data at rest (configurable)

### Access Control
- ✓ Role-based access model
- ✓ Principle of least privilege
- ✓ User data isolation (userId filtering)

---

## Incident Response

### If credentials are leaked

1. **Rotate immediately:**
   - Generate new AUTH_COOKIE_SECRET
   - Force all users to re-login
   - Invalidate all AuthSession records

2. **Audit:**
   - Review login logs for suspicious activity
   - Check for unauthorized admin access
   - Verify no wallet transfers to unknown accounts

3. **Notify:**
   - Inform affected users
   - Document timeline
   - Update security policies

### If database is compromised

1. **Immediate:**
   - Take systems offline
   - Enable full HTTPS for all connections
   - Generate new database credentials
   - Rotate AUTH_COOKIE_SECRET

2. **Recovery:**
   - Restore from clean backup
   - Update all user passwords (force re-registration)
   - Audit transaction logs for fraud

3. **Post-incident:**
   - Implement rate limiting on login
   - Add two-factor authentication
   - Implement intrusion detection
   - Regular penetration testing

---

## Checklist: Before Production

- [ ] **Credentials**: Removed PLAYER_SEED_EMAIL/PASSWORD and ADMIN_SEED_EMAIL/PASSWORD
- [ ] **Cookie Secret**: Generated strong AUTH_COOKIE_SECRET (64+ char hex)
- [ ] **HTTPS**: All origins use HTTPS URLs
- [ ] **CORS**: CORS_ALLOWED_ORIGINS restricted to production domains
- [ ] **Database**: Changed default SQL Server credentials
- [ ] **Backups**: Database backup schedule configured
- [ ] **Logging**: Structured logging configured + monitored
- [ ] **Monitoring**: Alerts set for suspicious auth patterns
- [ ] **Documentation**: Team trained on security procedures
- [ ] **Testing**: Security test suite passes (pen testing recommended)

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/)
- [bcrypt Security Analysis](https://en.wikipedia.org/wiki/Bcrypt)
- [HTTP Cookies Security](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [SQL Server Security](https://docs.microsoft.com/en-us/sql/relational-databases/security/sql-server-security)

---

## Contact & Questions

- Report security bugs: (Define your process here)
- Security policy questions: (Define your contact here)
- Compliance audits: (Define your process here)
