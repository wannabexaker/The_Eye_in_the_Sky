import { Injectable } from "@nestjs/common";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type RoundAnalyticsTier = "loss" | "win" | "big_win" | "huge_win" | "super_win";
type RoundAnalyticsVariant = "2.0" | "simple" | "other";

const isRoundAnalyticsVariant = (value: unknown): value is RoundAnalyticsVariant =>
  value === "2.0" || value === "simple" || value === "other";

export type RoundAnalyticsEntry = {
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
};

type AnalyticsSummary = {
  totalRounds: number;
  totalWagered: number;
  totalReturned: number;
  totalNet: number;
  observedRtp: number;
  hitRate: number;
  bonusTriggerRate: number;
  avgCascades: number;
  peakWin: number;
  peakMultiple: number;
  tierDistribution: Record<RoundAnalyticsTier, number>;
};

type AnalyticsDashboard = {
  summary: AnalyticsSummary;
  rtpSeries: Array<{ spin: number; rtp: number }>;
  balanceSeries: Array<{ spin: number; balance: number }>;
  cascadeHistogram: Array<{ cascades: string; count: number }>;
  tierDistribution: AnalyticsSummary["tierDistribution"];
};

type AnalyticsVariantFilter = RoundAnalyticsVariant | "all";

const MAX_ROUNDS = 100_000;
const ANALYTICS_STORE_PATH = join(process.cwd(), ".runtime", "analytics-rounds.json");

@Injectable()
export class AnalyticsService {
  private rounds: RoundAnalyticsEntry[] = [];

  constructor() {
    this.rounds = this.loadRoundsFromDisk();
  }

  private loadRoundsFromDisk(): RoundAnalyticsEntry[] {
    try {
      if (!existsSync(ANALYTICS_STORE_PATH)) {
        return [];
      }

      const parsed = JSON.parse(readFileSync(ANALYTICS_STORE_PATH, "utf8")) as Array<
        Partial<RoundAnalyticsEntry>
      >;
      if (!Array.isArray(parsed)) {
        return [];
      }

      const normalized: RoundAnalyticsEntry[] = parsed
        .filter((entry): entry is Partial<RoundAnalyticsEntry> & Pick<RoundAnalyticsEntry, "id"> =>
          typeof entry.id === "string"
        )
        .map((entry) => ({
          id: entry.id,
          timestamp: Number.isFinite(entry.timestamp) ? Number(entry.timestamp) : Date.now(),
          variant: isRoundAnalyticsVariant(entry.variant) ? entry.variant : "2.0",
          bet: Number(entry.bet ?? 0),
          win: Number(entry.win ?? 0),
          net: Number(entry.net ?? 0),
          mode: (entry.mode === "bonus" ? "bonus" : "base") as "base" | "bonus",
          cascades: Number(entry.cascades ?? 0),
          bonusTriggered: Boolean(entry.bonusTriggered),
          multiplier: Number(entry.multiplier ?? 1),
          winMultiple: Number(entry.winMultiple ?? 0),
          tier: (
            entry.tier === "win" ||
            entry.tier === "big_win" ||
            entry.tier === "huge_win" ||
            entry.tier === "super_win"
              ? entry.tier
              : "loss"
          ) as RoundAnalyticsTier,
          balanceAfter: Number(entry.balanceAfter ?? 0)
        }));

      return normalized.slice(-MAX_ROUNDS);
    } catch {
      return [];
    }
  }

  private persistRoundsToDisk() {
    try {
      mkdirSync(dirname(ANALYTICS_STORE_PATH), { recursive: true });
      writeFileSync(ANALYTICS_STORE_PATH, JSON.stringify(this.rounds), "utf8");
    } catch {
      // Persistence is best-effort during dev. API should still respond even if disk write fails.
    }
  }

  private readRecentRounds(limit = 2000, variant: AnalyticsVariantFilter = "all"): RoundAnalyticsEntry[] {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, MAX_ROUNDS)) : 2000;
    const filtered = variant === "all" ? this.rounds : this.rounds.filter((entry) => entry.variant === variant);
    return filtered.slice(-safeLimit);
  }

  async ingest(entries: RoundAnalyticsEntry[]) {
    if (!entries.length) {
      return { accepted: 0, totalRounds: this.rounds.length };
    }

    const existingIds = new Set(this.rounds.map((entry) => entry.id));
    const normalizedEntries = entries.map((entry) => ({
      ...entry,
      variant: isRoundAnalyticsVariant(entry.variant) ? entry.variant : "other"
    }));
    const uniqueEntries = normalizedEntries.filter((entry) => !existingIds.has(entry.id));
    this.rounds = [...this.rounds, ...uniqueEntries].slice(-MAX_ROUNDS);
    this.persistRoundsToDisk();

    const rounds = this.readRecentRounds(MAX_ROUNDS);
    return { accepted: uniqueEntries.length, totalRounds: rounds.length };
  }

  async listRounds(limit = 250, variant: AnalyticsVariantFilter = "all") {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(2000, limit)) : 250;
    const rounds = this.readRecentRounds(safeLimit, variant);
    return rounds.slice(-safeLimit).reverse();
  }

  private calculateSummary(rounds: RoundAnalyticsEntry[]): AnalyticsSummary {
    if (rounds.length === 0) {
      return {
        totalRounds: 0,
        totalWagered: 0,
        totalReturned: 0,
        totalNet: 0,
        observedRtp: 0,
        hitRate: 0,
        bonusTriggerRate: 0,
        avgCascades: 0,
        peakWin: 0,
        peakMultiple: 0,
        tierDistribution: {
          loss: 0,
          win: 0,
          big_win: 0,
          huge_win: 0,
          super_win: 0
        }
      };
    }

    const totalRounds = rounds.length;
    const totalWagered = rounds.reduce((acc, row) => acc + row.bet, 0);
    const totalReturned = rounds.reduce((acc, row) => acc + row.win, 0);
    const totalNet = rounds.reduce((acc, row) => acc + row.net, 0);
    const hitCount = rounds.filter((row) => row.win > 0).length;
    const bonusCount = rounds.filter((row) => row.bonusTriggered).length;
    const totalCascades = rounds.reduce((acc, row) => acc + row.cascades, 0);

    const tierDistribution = rounds.reduce<Record<RoundAnalyticsTier, number>>(
      (acc, row) => {
        acc[row.tier] += 1;
        return acc;
      },
      {
        loss: 0,
        win: 0,
        big_win: 0,
        huge_win: 0,
        super_win: 0
      }
    );

    return {
      totalRounds,
      totalWagered,
      totalReturned,
      totalNet,
      observedRtp: totalWagered > 0 ? totalReturned / totalWagered : 0,
      hitRate: hitCount / totalRounds,
      bonusTriggerRate: bonusCount / totalRounds,
      avgCascades: totalCascades / totalRounds,
      peakWin: Math.max(...rounds.map((row) => row.win), 0),
      peakMultiple: Math.max(...rounds.map((row) => row.winMultiple), 0),
      tierDistribution
    };
  }

  async getSummary(variant: AnalyticsVariantFilter = "all"): Promise<AnalyticsSummary> {
    const rounds = this.readRecentRounds(MAX_ROUNDS, variant);
    return this.calculateSummary(rounds);
  }

  async getDashboard(limit = 2000, variant: AnalyticsVariantFilter = "all"): Promise<AnalyticsDashboard> {
    const rounds = this.readRecentRounds(limit, variant);
    const summary = this.calculateSummary(rounds);

    let runningWagered = 0;
    let runningReturned = 0;
    const rtpSeries = rounds.map((round, index) => {
      runningWagered += round.bet;
      runningReturned += round.win;

      return {
        spin: index + 1,
        rtp: runningWagered > 0 ? runningReturned / runningWagered : 0
      };
    });

    const balanceSeries = rounds.map((round, index) => ({
      spin: index + 1,
      balance: round.balanceAfter
    }));

    const histogramBuckets = new Map<string, number>();
    for (const row of rounds) {
      const key = row.cascades >= 8 ? "8+" : String(row.cascades);
      histogramBuckets.set(key, (histogramBuckets.get(key) ?? 0) + 1);
    }

    const cascadeHistogram = ["0", "1", "2", "3", "4", "5", "6", "7", "8+"].map(
      (key) => ({
        cascades: key,
        count: histogramBuckets.get(key) ?? 0
      })
    );

    return {
      summary,
      rtpSeries,
      balanceSeries,
      cascadeHistogram,
      tierDistribution: summary.tierDistribution
    };
  }

  async reset() {
    this.rounds = [];
    this.persistRoundsToDisk();
    return { ok: true };
  }
}