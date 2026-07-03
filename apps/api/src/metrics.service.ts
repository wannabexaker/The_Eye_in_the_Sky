/*
Purpose: Prometheus metrics registry for the API.
Layer: backend (api)
Exposure: GET /metrics (see metrics.controller.ts). Enabled by default outside
production; in production it is opt-in via METRICS_ENABLED=true so the
operator decides whether the scrape endpoint is reachable.
*/

import { Injectable } from "@nestjs/common";
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  private readonly httpRequestDuration: Histogram<"method" | "route" | "status">;
  private readonly httpRequestsTotal: Counter<"method" | "route" | "status">;

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: "eye_api_" });

    this.httpRequestDuration = new Histogram({
      name: "eye_api_http_request_duration_seconds",
      help: "HTTP request duration in seconds, labeled by route template.",
      labelNames: ["method", "route", "status"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry]
    });

    this.httpRequestsTotal = new Counter({
      name: "eye_api_http_requests_total",
      help: "Total HTTP requests, labeled by route template.",
      labelNames: ["method", "route", "status"],
      registers: [this.registry]
    });
  }

  isEnabled(): boolean {
    if (process.env.METRICS_ENABLED === "true") {
      return true;
    }
    if (process.env.METRICS_ENABLED === "false") {
      return false;
    }
    return process.env.NODE_ENV !== "production";
  }

  observeHttpRequest(method: string, route: string, status: number, durationSeconds: number) {
    const labels = { method, route, status: String(status) };
    this.httpRequestDuration.observe(labels, durationSeconds);
    this.httpRequestsTotal.inc(labels);
  }

  contentType(): string {
    return this.registry.contentType;
  }

  metrics(): Promise<string> {
    return this.registry.metrics();
  }
}
