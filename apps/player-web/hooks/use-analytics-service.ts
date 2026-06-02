import { useMemo } from "react";
import type { AnalyticsQueryOptions, AnalyticsService, RoundAnalyticsEntry } from "@eye/shared-types";
import { LocalStorageAnalyticsService } from "../lib/analytics/local-storage-service";
import {
  AnalyticsApiError,
  PostgresAnalyticsService
} from "../lib/analytics/postgres-service";

type AnalyticsRuntimeMode = "authenticated" | "simulator";

type AnalyticsServiceOptions = {
  authenticated?: boolean;
  runtimeMode?: AnalyticsRuntimeMode;
};

let localAnalyticsService: LocalStorageAnalyticsService | null = null;
let postgresAnalyticsService: AnalyticsService | null = null;
let analyticsPersistenceWarned = false;

const getLocalAnalyticsService = () => {
  if (!localAnalyticsService) {
    localAnalyticsService = new LocalStorageAnalyticsService();
  }

  return localAnalyticsService;
};

const isOfflineAnalyticsError = (error: unknown) =>
  error instanceof AnalyticsApiError &&
  (error.code === "API_UNREACHABLE" || error.status === 503);

class OfflineFallbackAnalyticsService implements AnalyticsService {
  private fallbackActive = false;

  constructor(
    private readonly primary: AnalyticsService,
    private readonly fallback: AnalyticsService
  ) {}

  private async run<T>(primaryCall: () => Promise<T>, fallbackCall: () => Promise<T>) {
    if (this.fallbackActive) {
      return fallbackCall();
    }

    try {
      return await primaryCall();
    } catch (error) {
      if (!isOfflineAnalyticsError(error)) {
        throw error;
      }
      this.fallbackActive = true;
      return fallbackCall();
    }
  }

  async storeRound(entry: RoundAnalyticsEntry): Promise<void> {
    return this.run(
      () => this.primary.storeRound(entry),
      () => this.fallback.storeRound(entry)
    );
  }

  async queryRounds(options?: AnalyticsQueryOptions) {
    return this.run(
      () => this.primary.queryRounds(options),
      () => this.fallback.queryRounds(options)
    );
  }

  async getAllRounds() {
    return this.run(
      () => this.primary.getAllRounds(),
      () => this.fallback.getAllRounds()
    );
  }

  async clearRounds(): Promise<void> {
    await this.run(
      () => this.primary.clearRounds(),
      () => this.fallback.clearRounds()
    );
  }

  async getRoundCount() {
    return this.run(
      () => this.primary.getRoundCount(),
      () => this.fallback.getRoundCount()
    );
  }

  async storeBatch(entries: RoundAnalyticsEntry[]): Promise<void> {
    return this.run(
      () => this.primary.storeBatch(entries),
      () => this.fallback.storeBatch(entries)
    );
  }
}

const getPostgresAnalyticsService = () => {
  if (!postgresAnalyticsService) {
    postgresAnalyticsService = new OfflineFallbackAnalyticsService(
      new PostgresAnalyticsService(),
      getLocalAnalyticsService()
    );
  }

  return postgresAnalyticsService;
};

const resolveAnalyticsService = (options?: AnalyticsServiceOptions): AnalyticsService => {
  if (options?.runtimeMode === "simulator" || options?.authenticated === false) {
    return getLocalAnalyticsService();
  }

  if (options?.runtimeMode === "authenticated" || options?.authenticated === true) {
    return getPostgresAnalyticsService();
  }

  return getLocalAnalyticsService();
};

export function useAnalyticsService(options?: AnalyticsServiceOptions): AnalyticsService {
  return useMemo(() => resolveAnalyticsService(options), [
    options?.authenticated,
    options?.runtimeMode
  ]);
}

export function initializeAnalyticsService(rounds: RoundAnalyticsEntry[]): void {
  getLocalAnalyticsService().initialize(rounds);
}

export async function storeAnalyticsRoundForRuntime(
  entry: RoundAnalyticsEntry,
  runtimeMode: AnalyticsRuntimeMode
): Promise<void> {
  const service = resolveAnalyticsService({
    authenticated: runtimeMode === "authenticated",
    runtimeMode
  });

  try {
    await service.storeRound(entry);
    analyticsPersistenceWarned = false;
  } catch (error) {
    await getLocalAnalyticsService().storeRound(entry);
    if (!analyticsPersistenceWarned) {
      analyticsPersistenceWarned = true;
      console.warn(
        "Analytics API persistence failed; using local analytics fallback for this session.",
        error
      );
    }
  }
}
