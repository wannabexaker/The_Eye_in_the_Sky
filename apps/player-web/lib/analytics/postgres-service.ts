import type {
  AnalyticsQueryOptions,
  AnalyticsService,
  RoundAnalyticsEntry
} from "@eye/shared-types";
import { markPlayerApiOffline, markPlayerApiOnline } from "@/lib/api/offline-status";

type AnalyticsSummary = {
  totalRounds: number;
};

type AnalyticsDashboard = {
  summary: AnalyticsSummary;
  rtpSeries: Array<{ spin: number; rtp: number }>;
  balanceSeries: Array<{ spin: number; balance: number }>;
  cascadeHistogram: Array<{ cascades: string; count: number }>;
  tierDistribution: Record<string, number>;
};

export class AnalyticsApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = "ANALYTICS_REQUEST_FAILED") {
    super(message);
    this.name = "AnalyticsApiError";
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_API_BASE = "/_api";
const DEFAULT_QUERY_LIMIT = 10000;

const isRoundEntryArray = (value: unknown): value is RoundAnalyticsEntry[] =>
  Array.isArray(value);

const appendQuery = (path: string, params: URLSearchParams) => {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

export class PostgresAnalyticsService implements AnalyticsService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = DEFAULT_API_BASE) {
    this.apiBaseUrl = apiBaseUrl;
  }

  private async requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.apiBaseUrl}${path}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {})
        },
        ...init
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? `Analytics API unavailable (${error.message})`
          : "Analytics API unavailable";
      markPlayerApiOffline("API_UNREACHABLE", message);
      throw new AnalyticsApiError(message, 503, "API_UNREACHABLE");
    }

    if (!response.ok) {
      let message = `Analytics request failed (${response.status})`;
      let code = "ANALYTICS_REQUEST_FAILED";

      try {
        const body = (await response.json()) as {
          code?: string;
          message?: string | string[];
          error?: string;
        };

        if (typeof body.code === "string") {
          code = body.code;
        }
        if (Array.isArray(body.message)) {
          message = body.message.join(", ");
        } else if (typeof body.message === "string") {
          message = body.message;
        } else if (typeof body.error === "string") {
          message = body.error;
        }
      } catch {
        // Keep the status-based fallback message.
      }

      if (code === "API_UNREACHABLE") {
        markPlayerApiOffline(code, message);
      } else {
        markPlayerApiOnline();
      }

      throw new AnalyticsApiError(message, response.status, code);
    }

    markPlayerApiOnline();
    return response.json() as Promise<T>;
  }

  async storeRound(entry: RoundAnalyticsEntry): Promise<void> {
    await this.storeBatch([entry]);
  }

  async queryRounds(options?: AnalyticsQueryOptions): Promise<RoundAnalyticsEntry[]> {
    const params = new URLSearchParams();
    const requestedLimit = options?.limit ?? DEFAULT_QUERY_LIMIT;
    params.set("limit", String(Math.max(1, Math.min(DEFAULT_QUERY_LIMIT, requestedLimit))));
    if (options?.variant) {
      params.set("variant", options.variant);
    }

    const payload = await this.requestJson<unknown>(appendQuery("/analytics/rounds", params), {
      method: "GET"
    });
    const rounds = (isRoundEntryArray(payload) ? payload : [])
      .slice()
      .sort((left, right) => left.timestamp - right.timestamp);

    let filtered = rounds;
    if (options?.mode) {
      filtered = filtered.filter((round) => round.mode === options.mode);
    }
    if (options?.after !== undefined) {
      filtered = filtered.filter((round) => round.timestamp >= options.after!);
    }
    if (options?.before !== undefined) {
      filtered = filtered.filter((round) => round.timestamp <= options.before!);
    }
    if (options?.limit !== undefined && options.limit > 0) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  async getAllRounds(): Promise<RoundAnalyticsEntry[]> {
    return this.queryRounds({ limit: DEFAULT_QUERY_LIMIT });
  }

  async clearRounds(): Promise<void> {
    await this.requestJson<{ ok: boolean }>("/analytics/reset", { method: "DELETE" });
  }

  async getRoundCount(): Promise<number> {
    const summary = await this.requestJson<AnalyticsSummary>("/analytics/summary", {
      method: "GET"
    });
    return Number.isFinite(summary.totalRounds) ? summary.totalRounds : 0;
  }

  async storeBatch(entries: RoundAnalyticsEntry[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    await this.requestJson<{ accepted: number; totalRounds: number }>("/analytics/ingest", {
      method: "POST",
      body: JSON.stringify({ entries })
    });
  }

  async getSummary() {
    return this.requestJson<AnalyticsSummary>("/analytics/summary", { method: "GET" });
  }

  async getDashboard(limit = 2000, variant?: AnalyticsQueryOptions["variant"]) {
    const params = new URLSearchParams();
    params.set("limit", String(Math.max(200, Math.min(DEFAULT_QUERY_LIMIT, limit))));
    if (variant) {
      params.set("variant", variant);
    }

    return this.requestJson<AnalyticsDashboard>(appendQuery("/analytics/dashboard", params), {
      method: "GET"
    });
  }
}
