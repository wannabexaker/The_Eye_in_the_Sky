/**
 * AnalyticsService — SQL-ready abstraction for round storage and retrieval
 * 
 * Strategy pattern: interface defines contract, implementations swap (localStorage → PostgreSQL)
 * Phase 1: LocalStorage with memory limits
 * Phase 2: PostgreSQL backend with server-side filtering
 */

export type RoundAnalyticsTier = "loss" | "win" | "big_win" | "huge_win" | "super_win";
export type RoundAnalyticsVariant = "2.0" | "simple" | "other";

export interface RoundAnalyticsEntry {
  id: string;
  timestamp: number;
  variant: RoundAnalyticsVariant;
  bet: number;
  win: number;
  net: number;
  mode: "base" | "bonus";
  cascades: number;
  bonusTriggered: boolean;
  multiplier: number;
  winMultiple: number;
  tier: RoundAnalyticsTier;
  balanceAfter: number;
}

export interface AnalyticsQueryOptions {
  limit?: number;
  after?: number;
  before?: number;
  mode?: "base" | "bonus";
  variant?: RoundAnalyticsVariant;
}

export interface AnalyticsService {
  /**
   * Store a new round entry (idempotent by ID)
   */
  storeRound(entry: RoundAnalyticsEntry): Promise<void>;

  /**
   * Query rounds with optional filters
   * - limit: max records to return (10000 default for local storage)
   * - after/before: timestamp range filtering
   * - mode: filter by base/bonus spin
   */
  queryRounds(options?: AnalyticsQueryOptions): Promise<RoundAnalyticsEntry[]>;

  /**
   * Get all rounds without filters (used by local storage only)
   */
  getAllRounds(): Promise<RoundAnalyticsEntry[]>;

  /**
   * Clear all stored rounds (session reset)
   */
  clearRounds(): Promise<void>;

  /**
   * Get count of stored rounds
   */
  getRoundCount(): Promise<number>;

  /**
   * Batch store rounds (for import/sync operations)
   */
  storeBatch(entries: RoundAnalyticsEntry[]): Promise<void>;
}
