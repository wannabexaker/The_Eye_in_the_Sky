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
- Every published port is bound to `127.0.0.1`. Docker bypasses the host
  firewall, so `0.0.0.0` would mean "open to the whole local network"; the
  reverse proxy / tunnel on the host is the only way in. The admin panel is
  therefore reachable only from the host — from another machine use an SSH
  tunnel: `ssh -L 3100:127.0.0.1:3100 <host>` and open `http://localhost:3100`.

## Fresh install (any Linux host)

```bash
mkdir -p ~/projects/eye-in-the-sky && cd ~/projects/eye-in-the-sky
curl -fsSLO https://raw.githubusercontent.com/wannabexaker/The_Eye_in_the_Sky/main/scripts/deploy-pi.sh
curl -fsSL https://raw.githubusercontent.com/wannabexaker/The_Eye_in_the_Sky/main/.env.example -o .env
chmod +x deploy-pi.sh && chmod 600 .env
nano .env                 # POSTGRES_PASSWORD, AUTH_COOKIE_SECRET, …
./deploy-pi.sh            # latest release; or ./deploy-pi.sh v0.2.2
```

The script fetches `docker-compose.prod.yml` for the release, pins
`EYE_VERSION` in `.env`, pulls, starts, and waits until `/healthz` reports
that version. One `.env` holds all configuration; compose loads it itself.

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
| Upgrade to the latest release | `./deploy-pi.sh` |
| Deploy a specific release | `./deploy-pi.sh v0.2.2` (pins `EYE_VERSION` in `.env`) |
| Rollback | `./deploy-pi.sh <previous tag>` — migrations are additive; no destructive rollbacks have shipped |
| Verify after deploy | the script waits for `/healthz`; then one guest spin on the site |

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
