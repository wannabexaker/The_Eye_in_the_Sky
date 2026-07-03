# Observability

The API ships with structured request logging, request-id correlation, and a
Prometheus scrape endpoint. Everything is env-driven; nothing phones home.

## Structured logs

One line per request (health/metrics excluded):

```json
{"ts":"2026-07-04T12:00:00.000Z","level":"info","msg":"http_request","requestId":"…","method":"POST","route":"/player/spin","path":"/player/spin","status":201,"durationMs":42.1,"userId":"cuser…"}
```

- `LOG_FORMAT=json` forces JSON anywhere; `LOG_FORMAT=pretty` forces the
  human-readable single line. Default: JSON in production, pretty in dev.
- Every response carries `X-Request-Id`. Inbound `X-Request-Id` values are
  kept when they match `[A-Za-z0-9._-]{1,128}` (so a reverse proxy /
  Cloudflare Ray ID can drive correlation), otherwise a UUID is generated.
- Ship the container's stdout wherever you aggregate (Loki, CloudWatch, …) —
  the lines are single-object JSON, no parser config needed.

## Metrics — `GET /metrics`

| Env | Behavior |
|---|---|
| (unset), dev | enabled |
| production | disabled unless `METRICS_ENABLED=true` |
| `METRICS_ENABLED=false` | always disabled (endpoint 404s) |

Exposed series (prefix `eye_api_`):
- `eye_api_http_requests_total{method,route,status}` — counter, route template
  labels (bounded cardinality)
- `eye_api_http_request_duration_seconds_*` — histogram, same labels
- Node/process defaults: CPU, RSS, GC, event-loop lag, handles

Prometheus scrape config:

```yaml
scrape_configs:
  - job_name: eye-api
    scrape_interval: 30s
    static_configs:
      - targets: ["<host>:3200"]
```

## Health probes

| Endpoint | Meaning | Use |
|---|---|---|
| `GET /health/live` | process serving, no dependencies | container liveness |
| `GET /health/ready` | database reachable (503 when not) | load-balancer readiness |
| `GET /health` | combined legacy report | existing docker-compose healthcheck |

## Dashboards & alerts

- [grafana-dashboard.json](grafana-dashboard.json) — import as-is (request
  rate, p50/p95/p99, error share, process health, spin/round traffic).
- [prometheus-alerts.yml](prometheus-alerts.yml) — ApiDown, HighErrorRate,
  SlowRequestsP95, EventLoopLag, HighMemory.

## Error tracking (Sentry-ready)

No SDK is bundled — request-ids in every log line and the stable error shapes
from the global filters are the integration points. To add Sentry:
`pnpm --filter api add @sentry/node`, initialize it in `main.ts` behind
`SENTRY_DSN` (leave unset to keep it inert), and forward `requestId` from the
request object as a tag for correlation with the structured logs.
