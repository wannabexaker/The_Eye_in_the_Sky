/**
 * PostgresAnalyticsService — Phase 2 implementation (stub)
 * 
 * When ready, replace LocalStorageAnalyticsService with this.
 * Same interface, server-side logic:
 * - All rounds persisted in PostgreSQL
 * - Server-side filtering (more efficient for large datasets)
 * - Session-scoped or cross-session queries
 * - API endpoints: POST /analytics/rounds, GET /analytics/rounds
 * 
 * Implementation steps (Phase 2):
 * 1. Create NestJS controller + service in apps/api/src/analytics
 * 2. Create Prisma schema: `model RoundAnalytics { id String pk, timestamp DateTime, ... }`
 * 3. Implement REST endpoints with query params (limit, after, before, mode)
 * 4. Update this class to call API instead of localStorage
 * 5. Implement server-side dedup (UNIQUE constraint on id + sessionId)
 */

import type { RoundAnalyticsEntry, AnalyticsService, AnalyticsQueryOptions } from "@eye/shared-types";

export class PostgresAnalyticsService implements AnalyticsService {
  private apiBaseUrl: string;
  private sessionId: string;

  constructor(apiBaseUrl: string, sessionId: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.sessionId = sessionId;
  }

  async storeRound(entry: RoundAnalyticsEntry): Promise<void> {
    // TODO: POST /analytics/rounds
    // Body: { ...entry, sessionId: this.sessionId }
    // Server handles dedupe via UNIQUE constraint
    throw new Error("PostgreSQL implementation pending Phase 2");
  }

  async queryRounds(options?: AnalyticsQueryOptions): Promise<RoundAnalyticsEntry[]> {
    // TODO: GET /analytics/rounds?sessionId=X&limit=10000&after=T&before=T&mode=base
    // Returns filtered array from database
    throw new Error("PostgreSQL implementation pending Phase 2");
  }

  async getAllRounds(): Promise<RoundAnalyticsEntry[]> {
    // TODO: GET /analytics/rounds/session/{sessionId} → full unfiltered array
    throw new Error("PostgreSQL implementation pending Phase 2");
  }

  async clearRounds(): Promise<void> {
    // TODO: DELETE /analytics/rounds/{sessionId}
    throw new Error("PostgreSQL implementation pending Phase 2");
  }

  async getRoundCount(): Promise<number> {
    // TODO: GET /analytics/rounds/{sessionId}/count
    throw new Error("PostgreSQL implementation pending Phase 2");
  }

  async storeBatch(entries: RoundAnalyticsEntry[]): Promise<void> {
    // TODO: POST /analytics/rounds/batch
    // Body: { entries, sessionId: this.sessionId }
    // Server dedupes and stores in tx
    throw new Error("PostgreSQL implementation pending Phase 2");
  }
}

/**
 * Phase 2 API Contract (for reference when implementing):
 * 
 * POST /analytics/rounds
 * {
 *   id: string,
 *   timestamp: number,
 *   bet: number,
 *   win: number,
 *   ...
 *   sessionId: string
 * }
 * Response: { success: true, isDuplicate?: boolean }
 * 
 * GET /analytics/rounds?sessionId=X&limit=1000&after=T&before=T&mode=bonus
 * Response: { rounds: [...], total: number }
 * 
 * GET /analytics/rounds/{sessionId}/count
 * Response: { count: number }
 * 
 * POST /analytics/rounds/batch
 * { entries: [...], sessionId: string }
 * Response: { stored: number, duplicates: number }
 * 
 * DELETE /analytics/rounds/{sessionId}
 * Response: { deleted: number }
 */
