# Operator Guide

How to run, configure and operate The Eye in the Sky platform. Deployment
mechanics live in [DEPLOYMENT.md](DEPLOYMENT.md); this guide covers what an
operator switches on, when, and what each switch does.

## 1. Feature flags

Every commercial feature ships built and tested but **off by default**. Flags
are plain env vars on the API container; a container recreate applies them.

| Flag | Default | What it enables |
|---|---|---|
| `PROVABLY_FAIR_ENABLED` | `false` | Server-authoritative spins (`POST /player/spin`) + commit-reveal fairness endpoints (`/player/fairness*`) + the Fairness panel in the player menu. Legacy client-resolved play keeps working for guests. |
| `RG_TOOLS_ENABLED` | `false` | Responsible-gambling endpoints and enforcement: deposit/loss limits, session time limit, cool-off, self-exclusion. Enforced server-side inside the round/deposit transactions. |
| `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | empty | Cloudflare Turnstile on registration. **Both set or both empty** — never only one. Site key is public; secret stays server-only. |
| `SWAGGER_ENABLED` | `false` (prod) | `/swagger` API docs. Always on outside production. |
| `METRICS_ENABLED` | `false` (prod) | Prometheus `GET /metrics`. Always on outside production. See [observability/README.md](observability/README.md). |
| `AUTH_MODE` | `INTERNAL_ONLY` | `INTERNAL_ONLY` (own accounts), `EXTERNAL_ONLY` (platform JWT exchange), `HYBRID`. |
| `COOKIE_SECURE` | `true` (compose) | Secure/SameSite=None cookies for HTTPS/iframe embedding; set `false` only for plain-HTTP LAN testing. |
| `LOG_FORMAT` | `json` (prod) | `json` or `pretty` request logs. |

## 2. Enabling provably-fair play

1. Set `PROVABLY_FAIR_ENABLED=true`, recreate the API container.
2. Verify: `curl -s <api>/auth/mode` → `"provablyFairEnabled": true`.
3. Player flow: the in-game menu gains a **Fairness** panel — commitment hash,
   player-editable client seed, nonce, and **rotate** (reveals the previous
   server seed for verification).
4. Any round can be reproduced offline:
   `corepack pnpm --filter api exec tsx ../../scripts/verify-fairness.ts <revealedServerSeed> <clientSeed> <nonce> <bet>`
   Details: [PROVABLY_FAIR.md](PROVABLY_FAIR.md).

## 3. Enabling responsible gambling

1. Set `RG_TOOLS_ENABLED=true`, recreate the API.
2. Players manage limits from the in-game menu; all enforcement is
   server-side and transactional:
   - deposit limits (daily/weekly/monthly) block the deposit,
   - loss limits block the round before it resolves,
   - cool-off / self-exclusion block play with stable error codes
     (`SELF_EXCLUDED`), minimum self-exclusion 24h,
   - session time limit ends play (`SESSION_LIMIT_REACHED`).
3. Error codes are machine-readable so a host lobby can render its own UX.

## 4. Registration protection (Turnstile)

1. Cloudflare dashboard → Turnstile → widget with your player hostname.
2. Copy **both** keys from the **same widget** into the API env; recreate.
3. Verify `turnstileSiteKey` appears in `/auth/mode`, then run one real
   registration. Failure logs show up as `Turnstile verification failed: …`.
4. To disable: clear both keys, recreate. The API-level rate limits
   (register 10/min/IP) remain active either way.

## 5. Math profiles

- Admin panel (port 3100) → math profile selector; or
  `POST /game-config/select` as admin. Selection is persisted and audited
  (`adminAction` + `auditLog`).
- Shipped profiles: `math_base_v2_0` (default), `constellation_simple_v0_1`
  (variant), `legacy_v1_3` (reference). Numbers and reproducible PAR sheets:
  [MATH_SPEC.md](MATH_SPEC.md).
- Rounds persist their `configVersion`, so historical rounds always verify
  against the math they were played under.

## 6. Monitoring

- `GET /health/live` (process), `GET /health/ready` (DB), `GET /health`
  (combined; used by the compose healthcheck).
- `GET /metrics` + importable Grafana dashboard + alert rules:
  [observability/](observability/).
- Request logs are single-line JSON with `requestId` correlation; every
  response carries `X-Request-Id`.

## 7. Routine operations

| Task | How |
|---|---|
| Update to latest release | `./update.sh` on the host (pulls `:latest`, recreates, healthchecks) |
| Pin to a specific version | edit compose image tags to the release tag, `docker compose up -d` |
| DB migration | runs automatically on API start (`prisma migrate deploy`) |
| Verify a player round | Fairness rotate → `verify-fairness.ts` (section 2) |
| Rotate Turnstile secret | dashboard rotate → update env → recreate API |
| Session revocation | sessions are server-side; deleting the row invalidates the cookie |

## 8. Incident quick reference

| Symptom | First checks |
|---|---|
| Register fails | Browser console for Turnstile `400020` (bad site key) / `110200` (hostname not allowed); API logs for `invalid-input-secret`. Rule: both keys from the same widget, or both empty. |
| API unhealthy | `docker logs eye-api`, `GET /health/ready` (503 = DB), postgres container health. |
| High latency | Grafana p95 panel; event-loop-lag alert usually means CPU starvation on the host. |
| Player claims wrong outcome | Round row has `seedUsed`, `clientSeed`, `serverSeedHash`, `nonce` — reproduce with the verifier; the engine is deterministic. |
