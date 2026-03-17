import type {
  MathReport,
  PercentileWinDistribution,
  SimulationResult,
  SpecialSymbolFamily,
  SpinResult,
  SymbolId
} from "./types";

type AggregationState = {
  totalSpins: number;
  configVersion: string;
  totalWagered: number;
  totalReturned: number;
  baseReturned: number;
  bonusReturned: number;
  hitSpins: number;
  totalWins: number[];
  maxObservedWin: number;
  baseSpins: number;
  bonusSpins: number;
  bonusTriggers: number;
  currentBonusSessionTotal: number;
  currentBaseCycleBet: number;
  currentBaseCycleReturn: number;
  cycleReturnsNormalized: number[];
  completedBonusPayouts: number[];
  symbolFrequencyTable: Record<SymbolId, number>;
  cascadeDepthDistribution: Record<number, number>;
  multiplierContributionDistribution: Record<string, number>;
  evContributionBySpecialSymbolFamilyRaw: Record<SpecialSymbolFamily, number>;
};

const symbolIds: SymbolId[] = [
  "ashen_sigil",
  "broken_halo",
  "ritual_dagger",
  "sealed_scroll",
  "seraphim_feather",
  "burning_crown",
  "ophidian_relic",
  "celestial_gate",
  "seraphim_eye",
  "samsara",
  "ouroboros",
  "panepoptis_ophthalmos",
  "wild"
];

const specialFamilies: SpecialSymbolFamily[] = [
  "seraphim_eye",
  "samsara",
  "ouroboros",
  "panepoptis_ophthalmos"
];

const countBoardSymbols = (
  table: Record<SymbolId, number>,
  board: SymbolId[][]
) => {
  board.forEach((row) => {
    row.forEach((symbol) => {
      table[symbol] += 1;
    });
  });
};

const calculatePercentiles = (wins: number[]): PercentileWinDistribution => {
  if (wins.length === 0) {
    return { p50: 0, p90: 0, p95: 0, p99: 0 };
  }

  const sorted = [...wins].sort((a, b) => a - b);
  const pick = (quantile: number) => {
    const index = Math.min(sorted.length - 1, Math.floor(quantile * sorted.length));
    return sorted[index] ?? 0;
  };

  return {
    p50: pick(0.5),
    p90: pick(0.9),
    p95: pick(0.95),
    p99: pick(0.99)
  };
};

const calculateConfidenceInterval95 = (
  normalizedReturns: number[]
): { low: number; high: number } => {
  if (normalizedReturns.length === 0) {
    return { low: 0, high: 0 };
  }

  const mean =
    normalizedReturns.reduce((sum, value) => sum + value, 0) / normalizedReturns.length;
  const variance =
    normalizedReturns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
    normalizedReturns.length;
  const standardError = Math.sqrt(variance / normalizedReturns.length);
  const margin = 1.96 * standardError;

  return {
    low: mean - margin,
    high: mean + margin
  };
};

export const createEmptyAggregationState = (configVersion: string): AggregationState => ({
  totalSpins: 0,
  configVersion,
  totalWagered: 0,
  totalReturned: 0,
  baseReturned: 0,
  bonusReturned: 0,
  hitSpins: 0,
  totalWins: [],
  maxObservedWin: 0,
  baseSpins: 0,
  bonusSpins: 0,
  bonusTriggers: 0,
  currentBonusSessionTotal: 0,
  currentBaseCycleBet: 0,
  currentBaseCycleReturn: 0,
  cycleReturnsNormalized: [],
  completedBonusPayouts: [],
  symbolFrequencyTable: Object.fromEntries(symbolIds.map((symbol) => [symbol, 0])) as Record<
    SymbolId,
    number
  >,
  cascadeDepthDistribution: {},
  multiplierContributionDistribution: {},
  evContributionBySpecialSymbolFamilyRaw: Object.fromEntries(
    specialFamilies.map((family) => [family, 0])
  ) as Record<SpecialSymbolFamily, number>
});

export const addSpinToAggregation = (
  aggregation: AggregationState,
  result: SpinResult
) => {
  aggregation.totalSpins += 1;
  aggregation.totalReturned += result.totalWin;
  aggregation.totalWins.push(result.totalWin);
  aggregation.maxObservedWin = Math.max(aggregation.maxObservedWin, result.totalWin);

  const chargedBet = result.debugMetadata.chargedBet;
  if (chargedBet > 0) {
    if (aggregation.currentBaseCycleBet > 0) {
      aggregation.cycleReturnsNormalized.push(
        aggregation.currentBaseCycleReturn / aggregation.currentBaseCycleBet
      );
    }

    aggregation.totalWagered += chargedBet;
    aggregation.baseSpins += 1;
    aggregation.baseReturned += result.totalWin;
    aggregation.currentBaseCycleBet = chargedBet;
    aggregation.currentBaseCycleReturn = result.totalWin;
  } else {
    aggregation.bonusSpins += 1;
    aggregation.bonusReturned += result.totalWin;
    aggregation.currentBaseCycleReturn += result.totalWin;
  }

  if (result.totalWin > 0) {
    aggregation.hitSpins += 1;
  }

  const cascadeDepth = result.cascades.length;
  aggregation.cascadeDepthDistribution[cascadeDepth] =
    (aggregation.cascadeDepthDistribution[cascadeDepth] ?? 0) + 1;

  countBoardSymbols(aggregation.symbolFrequencyTable, result.initialBoard);
  countBoardSymbols(aggregation.symbolFrequencyTable, result.endingBoard);

  result.multipliersTriggered.forEach((trigger) => {
    const key = `${trigger.source}:x${trigger.multiplier}`;
    aggregation.multiplierContributionDistribution[key] =
      (aggregation.multiplierContributionDistribution[key] ?? 0) + trigger.contributionAmount;
  });

  const attributedStepWins = new Map<number, number>();
  result.evaluatedWins.forEach((win) => {
    attributedStepWins.set(
      win.cascadeIndex,
      (attributedStepWins.get(win.cascadeIndex) ?? 0) + win.totalContribution
    );
  });

  result.modifiersTriggered.forEach((event) => {
    const contribution = attributedStepWins.get(event.cascadeIndex) ?? 0;
    aggregation.evContributionBySpecialSymbolFamilyRaw[event.source] += contribution;
  });

  if (result.bonusTriggered && result.mode === "base") {
    aggregation.bonusTriggers += 1;
    aggregation.currentBonusSessionTotal = 0;
  }

  if (result.mode === "bonus") {
    aggregation.currentBonusSessionTotal += result.totalWin;
    if (result.bonusStateAfter === null) {
      aggregation.completedBonusPayouts.push(aggregation.currentBonusSessionTotal);
      aggregation.currentBonusSessionTotal = 0;
    }
  }
};

export const finalizeMathReport = (
  aggregation: AggregationState,
  bet: number
): SimulationResult => {
  if (aggregation.baseSpins > 0) {
    aggregation.cycleReturnsNormalized.push(
      aggregation.currentBaseCycleReturn / Math.max(aggregation.currentBaseCycleBet || bet, 1)
    );
  }

  const normalizedReturns = aggregation.cycleReturnsNormalized;
  const confidenceInterval95 = calculateConfidenceInterval95(normalizedReturns);
  const achievedRtp =
    aggregation.totalWagered > 0 ? aggregation.totalReturned / aggregation.totalWagered : 0;
  const baseRtpContribution =
    aggregation.totalWagered > 0 ? aggregation.baseReturned / aggregation.totalWagered : 0;
  const bonusRtpContribution =
    aggregation.totalWagered > 0 ? aggregation.bonusReturned / aggregation.totalWagered : 0;
  const averageWin =
    aggregation.totalSpins > 0 ? aggregation.totalReturned / aggregation.totalSpins : 0;
  const hitRate =
    aggregation.totalSpins > 0 ? aggregation.hitSpins / aggregation.totalSpins : 0;
  const bonusTriggerRate =
    aggregation.baseSpins > 0 ? aggregation.bonusTriggers / aggregation.baseSpins : 0;
  const averageBonusPayout =
    aggregation.completedBonusPayouts.length > 0
      ? aggregation.completedBonusPayouts.reduce((sum, value) => sum + value, 0) /
        aggregation.completedBonusPayouts.length
      : 0;
  const averageWinOnHit =
    aggregation.hitSpins > 0 ? aggregation.totalReturned / aggregation.hitSpins : 0;

  const evContributionBySpecialSymbolFamily = Object.fromEntries(
    specialFamilies.map((family) => [
      family,
      aggregation.totalSpins > 0
        ? aggregation.evContributionBySpecialSymbolFamilyRaw[family] / aggregation.totalSpins
        : 0
    ])
  ) as Record<SpecialSymbolFamily, number>;

  const report: MathReport = {
    totalSpins: aggregation.totalSpins,
    configVersion: aggregation.configVersion,
    achievedRtp,
    confidenceInterval95,
    baseRtpContribution,
    bonusRtpContribution,
    hitRate,
    averageWin,
    bonusTriggerRate,
    averageBonusPayout,
    maxObservedWin: aggregation.maxObservedWin,
    symbolFrequencyTable: aggregation.symbolFrequencyTable,
    cascadeDepthDistribution: aggregation.cascadeDepthDistribution,
    multiplierContributionDistribution: aggregation.multiplierContributionDistribution,
    percentileWinDistribution: calculatePercentiles(aggregation.totalWins),
    evContributionBySpecialSymbolFamily
  };

  return {
    ...report,
    totalWagered: aggregation.totalWagered,
    totalReturned: aggregation.totalReturned,
    totalBonusTriggers: aggregation.bonusTriggers,
    totalBonusRounds: aggregation.bonusSpins,
    averageWinOnHit
  };
};
