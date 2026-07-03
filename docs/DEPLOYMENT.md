# Deployment

Portable deployment reference for The Eye in the Sky. The stack is four
containers behind any HTTPS edge — nothing is Raspberry-Pi-specific; the Pi is
simply the reference host that runs the public demo.

## Topology

```
edge (Cloudflare tunnel / nginx / caddy, HTTPS)
  └── player-web  :3000   Next.js (standalone) — game + /lobby
  └── admin-web   :3100   Next.js (standalone) — operator panel
        └── /_api/* proxied server-side → api
  └── api         :3200   NestJS + Prisma
        └── postgres :5432  postgres:15-alpine (volume-backed)
```

- Web apps never expose the API origin to the browser; they proxy `/_api/*`
  server-side using `API_INTERNAL_URL` (runtime env, not baked at build).
- Images are multi-arch (amd64 + arm64), published to GHCR by the Build
  workflow on every push to `main` (`:latest`) and on tags (`:vX.Y.Z`).

## Fresh install (any Linux host)

```bash
mkdir eye && cd eye
curl -O https://raw.githubusercontent.com/wannabexaker/The_Eye_in_the_Sky/main/docker-compose.prod.yml
cat > .env <<'ENV'
POSTGRES_PASSWORD=<strong-random>
AUTH_COOKIE_SECRET=<long-random>
COOKIE_SECURE=true
# optional flags — see docs/OPERATOR_GUIDE.md
ENV
docker compose -f docker-compose.prod.yml up -d
curl -s http://localhost:3200/health   # {"status":"ok",...,"database":"up"}
```

Prisma migrations run automatically on API start. First boot seeds the
primary game row and default settings.

## HTTPS edge

Any reverse proxy works; requirements:

1. Forward `X-Forwarded-Proto: https` (secure cookies key off it).
2. Point the public hostname at **player-web:3000** (and, if exposed at all,
   a separate restricted hostname at admin-web:3100).
3. Cloudflare Tunnel is what the reference deployment uses:
   `cloudflared tunnel --url http://localhost:3000` bound to the site
   hostname. Recommended edge extras: Bot Fight Mode + a rate-limit rule on
   `/_api/auth/*`.

## Upgrades & rollback

| Action | Command |
|---|---|
| Upgrade to latest | `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d` (the reference host wraps this in `update.sh` with healthchecks) |
| Pin a version | change image tags `:latest` → `:v0.2.0`, `up -d` |
| Rollback | pin the previous tag, `up -d` — migrations are additive; no destructive rollbacks have shipped |
| Verify after deploy | `GET /health`, `GET /auth/mode`, one guest spin on the site |

## Sizing

The reference host is a Raspberry Pi 4 (4 GB, arm64) running the full stack
plus Cloudflare tunnel comfortably. Any 1-vCPU/2 GB x86 VPS (e.g. smallest
Hetzner) has headroom; postgres is the only stateful component
(`./data` volume — back it up with `pg_dump` on a cron).

## CI/CD pipeline

- **CI** (`.github/workflows/ci.yml`): typecheck, lint, unit + e2e tests,
  full Linux build, production dependency audit (fails on high/critical).
- **Build** (`.github/workflows/build.yml`): multi-arch images → GHCR.
  Pushing a tag additionally publishes version-tagged images. The arm64 API
  build under QEMU is slow (up to ~90 min on tag runs) — the `:latest`
  images from the main-push run are unaffected.

Historical Pi provisioning walkthrough (OS, Docker install, tunnel setup):
[docker-rpi-setup.md](docker-rpi-setup.md).
