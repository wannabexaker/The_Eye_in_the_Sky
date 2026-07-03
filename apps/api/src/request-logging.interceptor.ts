/*
Purpose: request-id propagation + one structured log line per request + HTTP
metrics feed.
Layer: backend (api), registered as a global interceptor.

- Respects an inbound X-Request-Id (sanitized) or generates a UUID; echoes it
  back on the response and attaches it to the request for downstream logs.
- Emits a single JSON log line per request (method, route, status, duration,
  requestId, userId when authenticated). LOG_FORMAT=pretty switches to a
  human-readable line; production defaults to JSON.
- Feeds the Prometheus histogram with the ROUTE TEMPLATE (req.route.path), not
  the raw URL, to keep label cardinality bounded.
- /health* and /metrics are excluded from logs and metrics — container
  healthchecks and scrapers would otherwise dominate the signal.
*/

import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { MetricsService } from "./metrics.service";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

type HttpRequestLike = {
  method?: string;
  originalUrl?: string;
  url?: string;
  route?: { path?: string };
  baseUrl?: string;
  headers?: Record<string, string | string[] | undefined>;
  authUser?: { id?: string };
  requestId?: string;
};

type HttpResponseLike = {
  statusCode?: number;
  setHeader?: (name: string, value: string) => void;
};

const useJsonLogs = () =>
  process.env.LOG_FORMAT === "json" ||
  (process.env.NODE_ENV === "production" && process.env.LOG_FORMAT !== "pretty");

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<HttpRequestLike>();
    const response = http.getResponse<HttpResponseLike>();

    const inboundId = request.headers?.["x-request-id"];
    const candidate = Array.isArray(inboundId) ? inboundId[0] : inboundId;
    const requestId =
      candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();
    request.requestId = requestId;
    response.setHeader?.("X-Request-Id", requestId);

    const path = (request.originalUrl ?? request.url ?? "").split("?")[0];
    if (path.startsWith("/health") || path.startsWith("/metrics")) {
      return next.handle();
    }

    const startedAt = process.hrtime.bigint();

    const record = (status: number) => {
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
      const method = request.method ?? "GET";
      const routeTemplate = `${request.baseUrl ?? ""}${request.route?.path ?? path}`;

      this.metricsService.observeHttpRequest(method, routeTemplate, status, durationSeconds);

      const durationMs = Number((durationSeconds * 1000).toFixed(1));
      if (useJsonLogs()) {
        console.log(
          JSON.stringify({
            ts: new Date().toISOString(),
            level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
            msg: "http_request",
            requestId,
            method,
            route: routeTemplate,
            path,
            status,
            durationMs,
            userId: request.authUser?.id ?? null
          })
        );
      } else {
        this.logger.log(`${method} ${path} ${status} ${durationMs}ms reqId=${requestId}`);
      }
    };

    return next.handle().pipe(
      tap({
        next: () => record(response.statusCode ?? 200),
        error: (error: unknown) =>
          record(error instanceof HttpException ? error.getStatus() : 500)
      })
    );
  }
}
