# Docker & Raspberry Pi Deployment Guide

## Table of Contents

1. [Quick Start (Local Development)](#quick-start)
2. [Docker Architecture](#architecture)
3. [Building Images](#building)
4. [Raspberry Pi Deployment](#rpi-deployment)
5. [Troubleshooting](#troubleshooting)
6. [Advanced Configuration](#advanced)

---

## Quick Start (Local Development) {#quick-start}

### Prerequisites

- Docker & Docker Compose installed
- 4GB+ free disk space
- Linux, macOS, or Windows with WSL2

### Start the Stack

```bash
# Clone repo (if not already done)
git clone <repo-url> && cd Tsogos

# Copy environment template and customize
cp .env.docker.template .env.docker

# Edit .env.docker if needed (passwords, secrets)
# nano .env.docker

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs (API service)
docker-compose logs -f api

# View logs (all services)
docker-compose logs -f
```

### Verify Everything is Running

```bash
# Test API health
curl http://localhost:3200/health

# Access services
- Player Web: http://localhost:3000
- Admin Web: http://localhost:3100
- API: http://localhost:3200
```

### Stop the Stack

```bash
# Stop all services (keep data)
docker-compose down

# Full cleanup (removes volumes, loses data)
docker-compose down -v
```

---

## Docker Architecture {#architecture}

### Services Overview

| Service | Port | Type | Purpose | Memory |
|---------|------|------|---------|--------|
| **postgres** | 5432 | Database | PostgreSQL database | 1GB |
| **api** | 3200 | Backend | NestJS API server | 512MB |
| **player-web** | 3000 | Frontend | Player game board | 768MB |
| **admin-web** | 3100 | Frontend | Admin dashboard | 512MB |

### Multi-Stage Dockerfiles

Each service uses a **two-stage build** to minimize image size:

1. **Builder Stage**: Installs dependencies, compiles source code
2. **Runtime Stage**: Copies only compiled output + production dependencies

**Benefits:**
- Smaller final images (60% reduction)
- Faster RPi deployment
- Security: avoids shipping build tools

### Network & Storage

- **Network**: All services communicate via `services` bridge network
- **Database Volume**: `postgres_data` - persists between restarts
- **Analytics Volume**: `./data/analytics` - mounted from host

---

## Building Images {#building}

### Build on Your Development Machine (x86)

```bash
cd /path/to/Tsogos

# Build all images
docker-compose build

# Build specific service
docker-compose build api

# Build with custom tag
docker build -t tsogos-api:custom apps/api/

# View built images
docker image ls | grep tsogos
```

**Build Times (x86 machine):**
- API: ~15-30s
- Player Web: ~60-120s (webpack + PixiJS compilation)
- Admin Web: ~30-60s
- **Total: ~2-3 minutes**

### Build on Raspberry Pi (Not Recommended)

```bash
# On RPi4 8GB: expect 20-30 minutes
docker-compose build

# With limited RAM (RPi3 1GB): may fail due to OOM
# Solution: Use swap or pre-build on x86
```

**Recommendation**: Pre-build on x86 machine and push to registry.

---

## Raspberry Pi Deployment {#rpi-deployment}

### Prerequisites

- Raspberry Pi 4 with 8GB RAM (minimum: 4GB with swap)
- 64GB SD card (or larger external SSD)
- Docker & Docker Compose installed
- Network connectivity

### Installation Steps

#### 1. Install Docker on RPi

```bash
# Using official script (recommended)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (avoid sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
```

#### 2. Install Docker Compose

```bash
# Install latest version
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version
```

#### 3. Clone Repository

```bash
git clone <repo-url> /home/pi/Tsogos
cd /home/pi/Tsogos
```

#### 4. Configure Environment

```bash
# Copy and edit environment
cp .env.docker.template .env.docker
nano .env.docker

# Critical settings for RPi:
# - POSTGRES_PASSWORD: Set strong password
# - NODE_ENV: production
# - USE_CANVAS_RENDERER: true (for headless RPi without GPU)
```

#### 5. Pre-Build or Pull Images (Recommended)

**Option A: Pre-build on x86 and transfer**

```bash
# On your development machine:
docker-compose build

# Tag for registry
docker tag tsogos-api:latest myregistry.azurecr.io/tsogos-api:latest
docker tag tsogos-player-web:latest myregistry.azurecr.io/tsogos-player-web:latest
docker tag tsogos-admin-web:latest myregistry.azurecr.io/tsogos-admin-web:latest

# Push to registry
docker push myregistry.azurecr.io/tsogos-api:latest
# ... push other images

# On RPi:
docker pull myregistry.azurecr.io/tsogos-api:latest
# ... pull other images
```

**Option B: Export and transfer images**

```bash
# On x86 machine:
docker save tsogos-api:latest | gzip > tsogos-api.tar.gz
scp tsogos-api.tar.gz pi@rpi-ip:/home/pi/

# On RPi:
gunzip < /home/pi/tsogos-api.tar.gz | docker load
```

#### 6. Start Services

```bash
# First time: may take a few minutes
docker-compose up -d

# Check status
docker-compose ps

# Monitor logs (especially API startup)
docker-compose logs -f api

# Wait for healthy status
watch 'docker-compose ps'  # Press Ctrl+C when all are "Up"
```

#### 7. Enable Auto-Start

```bash
# Save docker-compose service file
sudo tee /etc/systemd/system/eye-docker-compose.service > /dev/null <<EOF
[Unit]
Description=The Eye in the Sky - Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
WorkingDirectory=/home/pi/Tsogos
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
RemainAfterExit=yes
User=pi

[Install]
WantedBy=multi-user.target
EOF

# Enable service
sudo systemctl enable eye-docker-compose.service

# Start service
sudo systemctl start eye-docker-compose.service

# Check status
sudo systemctl status eye-docker-compose.service
```

### Access Services from Another Device

```bash
# From your laptop/desktop:
# Player Web:  http://<rpi-ip>:3000
# Admin Web:   http://<rpi-ip>:3100
# API:         http://<rpi-ip>:3200

# Example (if RPi IP is 192.168.1.100)
curl http://192.168.1.100:3200/health
```

### Database Backups

```bash
# Backup PostgreSQL data
docker exec eye-postgres pg_dump -U app_user eye_db | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# List backups
ls -lah backup_*.sql.gz

# Transfer to external storage
scp backup_*.sql.gz external-storage:/backups/
```

---

## Troubleshooting {#troubleshooting}

### Issue: Container stuck in "starting" state

```bash
# Check logs
docker-compose logs api

# Check database connectivity
docker exec eye-api curl -v http://postgres:5432

# Manually check database readiness
docker exec eye-postgres pg_isready -U app_user -d eye_db
```

### Issue: PostgreSQL fails to start

```bash
# Check volumes
docker volume ls | grep postgres

# Inspect volume
docker volume inspect tsogos_postgres_data

# Remove and recreate (⚠️ DELETES DATA)
docker volume rm tsogos_postgres_data
docker-compose up -d postgres
```

### Issue: API crashes on startup

```bash
# Check detailed logs
docker-compose logs --tail=50 api

# Common causes:
# 1. DATABASE_URL not set → Fix: check .env.docker
# 2. PostgreSQL not ready → Wait: docker logs postgres
# 3. Migration failed → Check: docker exec eye-api npx prisma migrate status

# Retry manually
docker-compose restart api
```

### Issue: Player Web shows white screen

```bash
# Check console for errors
docker-compose logs player-web

# Verify API is accessible from web app
docker exec eye-player-web curl -v http://api:3200/health

# Verify NEXT_PUBLIC_API_URL is set correctly
docker-compose exec player-web env | grep NEXT_PUBLIC_API_URL
```

### Issue: RPi out of memory

```bash
# Check current memory
free -h

# Check container limits
docker stats

# If OOM: enable swap
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile  # Increase CONF_SWAPSIZE to 2048
sudo dphys-swapfile swapon

# Or manually kill heavy processes
docker-compose down
# Wait 30 seconds
docker-compose up -d
```

### Issue: Port already in use

```bash
# Find process using port
lsof -i :3200

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml:
# - Change "3200:3200" to "3201:3200"
```

---

## Advanced Configuration {#advanced}

### Reverse Proxy (Nginx)

To expose all services on port 80 with SSL:

```yaml
# Add to docker-compose.yml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - ./ssl:/etc/nginx/ssl:ro
  depends_on:
    - api
    - player-web
    - admin-web
  networks:
    - services
```

### External Database

To use an external PostgreSQL server instead of Docker:

```bash
# In .env.docker, set DATABASE_URL to external server:
DATABASE_URL=postgresql://user:pass@external.example.com:5432/eye_db

# In docker-compose.yml, comment out postgres service
# docker-compose up -d (skip postgres)
```

### Monitoring & Logging

```bash
# Real-time container stats
docker stats

# Save logs to file
docker-compose logs > combined-logs.txt

# Follow logs with timestamps
docker-compose logs -t -f

# Export logs for analysis
docker-compose logs --no-color > logs.json
```

### Performance Tuning on RPi

```bash
# Increase Node.js memory limit
# In .env.docker:
NODE_OPTIONS=--max-old-space-size=512

# Or in docker-compose.yml service definition:
environment:
  - NODE_OPTIONS=--max-old-space-size=512

# Monitor memory usage
docker exec eye-api node -e "console.log(Math.round(require('os').freemem() / 1024 / 1024) + 'MB free')"
```

---

## File Structure

```
Tsogos/
├── docker-compose.yml           # Service orchestration
├── .dockerignore                 # Build context exclusions
├── .env.docker.template         # Environment template
├── .env.docker                  # Local config (git-ignored)
│
├── apps/
│   ├── api/
│   │   ├── Dockerfile           # NestJS multi-stage build
│   │   ├── docker-entrypoint.sh # Migration & startup script
│   │   └── prisma/
│   │       ├── schema.prisma    # PostgreSQL schema
│   │       └── migrations/
│   │
│   ├── player-web/
│   │   └── Dockerfile           # Next.js multi-stage build
│   │
│   └── admin-web/
│       └── Dockerfile           # Next.js multi-stage build
│
└── data/
    └── analytics/               # Analytics JSON storage (volume mount)
```

---

## Next Steps

1. **Test locally**: `docker-compose up` on your development machine
2. **Pre-build images**: Follow "Building Images" section
3. **Deploy to RPi**: Follow "Raspberry Pi Deployment" section
4. **Monitor**: Use `docker-compose logs`, `docker stats`
5. **Backup regularly**: Automate PostgreSQL backups

---

## Need Help?

- Check logs: `docker-compose logs -f <service>`
- Inspect container: `docker exec -it <container> bash`
- Check network: `docker network inspect tsogos_services`
- Rebuild from scratch: `docker-compose down -v && docker-compose build && docker-compose up`

