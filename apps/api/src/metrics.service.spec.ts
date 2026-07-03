/**
 * MetricsService + RequestLoggingInterceptor — Unit Tests
 *
 * Locks the observability contract: metric names, route-template labels,
 * env gating of the scrape endpoint, and request-id propagation semantics.
 */

import { MetricsService } from "./metrics.service";
import { RequestLoggingInterceptor } from "./request-logging.interceptor";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { of } from "rxjs";

const originalMetricsFlag = process.env.METRICS_ENABLED;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalMetricsFlag === undefined) delete process.env.METRICS_ENABLED;
  else process.env.METRICS_ENABLED = originalMetricsFlag;
  process.env.NODE_ENV = originalNodeEnv;
});

describe("MetricsService", () => {
  it("registers default process metrics and HTTP metrics under the eye_api_ prefix", async () => {
    const service = new MetricsService();
    service.observeHttpRequest("GET", "/player/bootstrap", 200, 0.05);

    const output = await service.metrics();
    expect(output).toContain("eye_api_process_cpu_user_seconds_total");
    expect(output).toContain("eye_api_http_request_duration_seconds");
    expect(output).toContain("eye_api_http_requests_total");
    expect(output).toContain('route="/player/bootstrap"');
  });

  it("aggregates by route template label, not raw URL", async () => {
    const service = new MetricsService();
    service.observeHttpRequest("GET", "/player/rounds/:id", 200, 0.01);
    service.observeHttpRequest("GET", "/player/rounds/:id", 200, 0.02);

    const output = await service.metrics();
    expect(output).toMatch(
      /eye_api_http_requests_total\{method="GET",route="\/player\/rounds\/:id",status="200"\} 2/
    );
  });

  describe("isEnabled gating", () => {
    it("is on by default outside production", () => {
      delete process.env.METRICS_ENABLED;
      process.env.NODE_ENV = "test";
      expect(new MetricsService().isEnabled()).toBe(true);
    });

    it("is off by default in production, on when METRICS_ENABLED=true", () => {
      process.env.NODE_ENV = "production";
      delete process.env.METRICS_ENABLED;
      expect(new MetricsService().isEnabled()).toBe(false);
      process.env.METRICS_ENABLED = "true";
      expect(new MetricsService().isEnabled()).toBe(true);
    });

    it("METRICS_ENABLED=false wins everywhere", () => {
      process.env.NODE_ENV = "test";
      process.env.METRICS_ENABLED = "false";
      expect(new MetricsService().isEnabled()).toBe(false);
    });
  });
});

describe("RequestLoggingInterceptor", () => {
  const buildContext = (request: Record<string, unknown>, response: Record<string, unknown>) =>
    ({
      getType: () => "http",
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response
      })
    }) as unknown as ExecutionContext;

  const passthrough: CallHandler = { handle: () => of("ok") };

  it("generates a request id and echoes it on the response", (done) => {
    const service = new MetricsService();
    const interceptor = new RequestLoggingInterceptor(service);
    const setHeader = jest.fn();
    const request: Record<string, unknown> = {
      method: "GET",
      originalUrl: "/player/bootstrap",
      headers: {}
    };

    interceptor
      .intercept(buildContext(request, { statusCode: 200, setHeader }), passthrough)
      .subscribe({
        complete: () => {
          expect(typeof request.requestId).toBe("string");
          expect(setHeader).toHaveBeenCalledWith("X-Request-Id", request.requestId);
          done();
        }
      });
  });

  it("keeps a sane inbound X-Request-Id and rejects a hostile one", (done) => {
    const service = new MetricsService();
    const interceptor = new RequestLoggingInterceptor(service);
    const sane: Record<string, unknown> = {
      method: "GET",
      originalUrl: "/x",
      headers: { "x-request-id": "trace-abc-123" }
    };
    const hostile: Record<string, unknown> = {
      method: "GET",
      originalUrl: "/x",
      headers: { "x-request-id": "evil\r\nSet-Cookie: pwn=1" }
    };

    interceptor
      .intercept(buildContext(sane, { statusCode: 200, setHeader: jest.fn() }), passthrough)
      .subscribe({
        complete: () => {
          expect(sane.requestId).toBe("trace-abc-123");
          interceptor
            .intercept(
              buildContext(hostile, { statusCode: 200, setHeader: jest.fn() }),
              passthrough
            )
            .subscribe({
              complete: () => {
                expect(hostile.requestId).not.toContain("\r");
                expect(hostile.requestId).toMatch(/^[0-9a-f-]{36}$/);
                done();
              }
            });
        }
      });
  });

  it("excludes /health and /metrics from the HTTP metrics", (done) => {
    const service = new MetricsService();
    const observeSpy = jest.spyOn(service, "observeHttpRequest");
    const interceptor = new RequestLoggingInterceptor(service);
    const request = { method: "GET", originalUrl: "/health", headers: {} };

    interceptor
      .intercept(buildContext(request, { statusCode: 200, setHeader: jest.fn() }), passthrough)
      .subscribe({
        complete: () => {
          expect(observeSpy).not.toHaveBeenCalled();
          done();
        }
      });
  });

  it("records the route template with method and status on normal requests", (done) => {
    const service = new MetricsService();
    const observeSpy = jest.spyOn(service, "observeHttpRequest");
    const interceptor = new RequestLoggingInterceptor(service);
    const request = {
      method: "POST",
      originalUrl: "/player/spin?x=1",
      route: { path: "/player/spin" },
      headers: {}
    };

    interceptor
      .intercept(buildContext(request, { statusCode: 201, setHeader: jest.fn() }), passthrough)
      .subscribe({
        complete: () => {
          expect(observeSpy).toHaveBeenCalledWith(
            "POST",
            "/player/spin",
            201,
            expect.any(Number)
          );
          done();
        }
      });
  });
});
