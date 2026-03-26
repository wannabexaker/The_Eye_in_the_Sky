/**
 * useAnalyticsService — Hook to create/access analytics service
 * 
 * Allows easy toggling between implementations:
 * - Phase 1 (current): LocalStorageAnalyticsService
 * - Phase 2: PostgresAnalyticsService (swap one line)
 * 
 * Usage:
 * const analyticsService = useAnalyticsService();
 * await analyticsService.storeRound(entry);
 * const rounds = await analyticsService.queryRounds({ limit: 100 });
 */

import { useMemo } from "react";
import { LocalStorageAnalyticsService } from "../lib/analytics/local-storage-service";
import type { AnalyticsService } from "@eye/shared-types";

let analyticsServiceInstance: AnalyticsService | null = null;

export function useAnalyticsService(): AnalyticsService {
  return useMemo(() => {
    // Singleton: create once, reuse
    if (!analyticsServiceInstance) {
      // Phase 1: localStorage
      analyticsServiceInstance = new LocalStorageAnalyticsService();

      // Phase 2 (when ready): uncomment below and import PostgresAnalyticsService
      // const sessionId = usePlayerUiStore.getState().sessionId || "anonymous";
      // analyticsServiceInstance = new PostgresAnalyticsService("http://localhost:3001/api", sessionId);
    }
    return analyticsServiceInstance;
  }, []);
}

/**
 * Initialize analytics service with persisted rounds (called on store hydration)
 */
export function initializeAnalyticsService(rounds: any[]): void {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new LocalStorageAnalyticsService();
  }
  if (analyticsServiceInstance instanceof LocalStorageAnalyticsService) {
    analyticsServiceInstance.initialize(rounds);
  }
}
