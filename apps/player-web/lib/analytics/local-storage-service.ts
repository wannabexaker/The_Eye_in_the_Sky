/**
 * LocalStorageAnalyticsService — Phase 1 implementation
 * 
 * Features:
 * - 10,000 round retention limit
 * - Dedupe by ID (prevent double-counting same round)
 * - Memory-only, persisted via Zustand middleware
 * - Timestamp-based queries
 * 
 * Phase 2 migration: replace with PostgresAnalyticsService, API contract stays same
 */

import type { RoundAnalyticsEntry, AnalyticsService, AnalyticsQueryOptions } from "@eye/shared-types";

export class LocalStorageAnalyticsService implements AnalyticsService {
  private static readonly MAX_ROUNDS = 10000;
  private rounds: RoundAnalyticsEntry[] = [];

  /**
   * Initialize with existing rounds (called on store hydration)
   */
  initialize(existing: RoundAnalyticsEntry[]): void {
    this.rounds = existing;
  }

  /**
   * Store a single round, deduplicated by ID
   */
  async storeRound(entry: RoundAnalyticsEntry): Promise<void> {
    const exists = this.rounds.some((r) => r.id === entry.id);
    if (exists) {
      return; // Dedupe: silently skip
    }

    this.rounds.push(entry);

    // Enforce retention limit
    if (this.rounds.length > LocalStorageAnalyticsService.MAX_ROUNDS) {
      this.rounds = this.rounds.slice(-LocalStorageAnalyticsService.MAX_ROUNDS);
    }
  }

  /**
   * Query rounds with optional filtering
   */
  async queryRounds(options?: AnalyticsQueryOptions): Promise<RoundAnalyticsEntry[]> {
    let result = [...this.rounds];

    // Apply mode filter
    if (options?.mode) {
      result = result.filter((r) => r.mode === options.mode);
    }

    // Apply time range filter
    if (options?.after !== undefined) {
      result = result.filter((r) => r.timestamp >= options.after!);
    }
    if (options?.before !== undefined) {
      result = result.filter((r) => r.timestamp <= options.before!);
    }

    // Apply limit
    if (options?.limit !== undefined && options.limit > 0) {
      result = result.slice(-options.limit);
    }

    return result;
  }

  /**
   * Get all rounds without filters
   */
  async getAllRounds(): Promise<RoundAnalyticsEntry[]> {
    return [...this.rounds];
  }

  /**
   * Clear all stored rounds
   */
  async clearRounds(): Promise<void> {
    this.rounds = [];
  }

  /**
   * Get count of stored rounds
   */
  async getRoundCount(): Promise<number> {
    return this.rounds.length;
  }

  /**
   * Batch store rounds with dedupe
   */
  async storeBatch(entries: RoundAnalyticsEntry[]): Promise<void> {
    const existingIds = new Set(this.rounds.map((r) => r.id));

    for (const entry of entries) {
      if (!existingIds.has(entry.id)) {
        this.rounds.push(entry);
        existingIds.add(entry.id);
      }
    }

    // Enforce retention limit
    if (this.rounds.length > LocalStorageAnalyticsService.MAX_ROUNDS) {
      this.rounds = this.rounds.slice(-LocalStorageAnalyticsService.MAX_ROUNDS);
    }
  }

  /**
   * Get current in-memory rounds (for Zustand persistence)
   */
  internal_getRounds(): RoundAnalyticsEntry[] {
    return this.rounds;
  }

  /**
   * Set internal rounds (called by Zustand merge strategy)
   */
  internal_setRounds(rounds: RoundAnalyticsEntry[]): void {
    this.rounds = rounds;
  }
}
