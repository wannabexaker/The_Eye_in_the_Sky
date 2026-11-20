#!/usr/bin/env bash
# Deploy a tagged release of The Eye in the Sky on the host (the Pi).
#
# Usage (on the host, from anywhere):
#   ./deploy-pi.sh            # latest vX.Y.Z tag on GitHub
#   ./deploy-pi.sh v0.2.2     # a specific release (also how you roll back)
#
# Steps: fetch docker-compose.prod.yml at that tag → pin EYE_VERSION in .env →
# pull images (abort here on failure, nothing running is touched) → up -d
# (migrations run in the API entrypoint) → wait until /healthz reports the
# requested version → print it. Releases from v0.2.2 on expose /healthz.
#
# Environment overrides: DEPLOY_DIR, HEALTH_URL, PUBLIC_URL.
set -euo pipefail

REPO="wannabexaker/The_Eye_in_the_Sky"
COMPOSE="docker-compose.prod.yml"
DEPLOY_DIR="${DEPLOY_DIR:-$HOME/projects/eye-in-the-sky}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/healthz}"
PUBLIC_URL="${PUBLIC_URL:-https://eye.olamov.com/healthz}"

step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

version="${1:-}"
if [ -z "$version" ]; then
  version="$(curl -fsSL "https://api.github.com/repos/${REPO}/tags?per_page=100" \
    | grep -oE '"name": *"v[0-9]+\.[0-9]+\.[0-9]+"' \
    | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | sort -V | tail -1)"
fi
[[ "$version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "Not a release tag: '${version}'"

cd "$DEPLOY_DIR" || fail "Deploy directory not found: ${DEPLOY_DIR}"
[ -f .env ] || fail "No .env in ${DEPLOY_DIR} — copy .env.example from the repo and fill it in."
chmod 600 .env

step "[1/5] Fetching ${COMPOSE} at ${version}"
tmp="$(mktemp)"
curl -fsSL "https://raw.githubusercontent.com/${REPO}/${version}/${COMPOSE}" -o "$tmp" \
  || fail "Could not download ${COMPOSE} for ${version}"
if [ -f "$COMPOSE" ] && ! cmp -s "$tmp" "$COMPOSE"; then
  backup="${COMPOSE}.bak-$(date +%Y%m%d-%H%M%S)"
  cp "$COMPOSE" "$backup"
  echo "  previous compose kept as ${backup}"
fi
mv "$tmp" "$COMPOSE"

step "[2/5] Pinning EYE_VERSION=${version} in .env"
if grep -q '^EYE_VERSION=' .env; then
  sed -i "s/^EYE_VERSION=.*/EYE_VERSION=${version}/" .env
else
  printf '\nEYE_VERSION=%s\n' "$version" >> .env
fi

step "[3/5] Pulling images (running containers are untouched if this fails)"
docker compose -f "$COMPOSE" pull

step "[4/5] Starting ${version}"
docker compose -f "$COMPOSE" up -d

step "[5/5] Waiting for ${HEALTH_URL} to report ${version#v}"
body=""
for _ in $(seq 1 36); do
  body="$(curl -fsS --max-time 5 "$HEALTH_URL" 2>/dev/null || true)"
  if [[ "$body" == *'"status":"ok"'* && "$body" == *"\"version\":\"${version#v}\""* ]]; then
    printf '\033[32m  healthy: %s\033[0m\n' "$body"
    public="$(curl -fsS --max-time 10 -o /dev/null -w '%{http_code}' "$PUBLIC_URL" 2>/dev/null || true)"
    echo "  public ${PUBLIC_URL} → HTTP ${public:-unreachable}"
    exit 0
  fi
  sleep 5
done

docker compose -f "$COMPOSE" ps
fail "Not healthy after 180s. Last /healthz: ${body:-no response}. Roll back with: $0 <previous tag>"
