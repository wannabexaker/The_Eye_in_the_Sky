export type SymbolId =
  | "ashen_sigil"
  | "broken_halo"
  | "ritual_dagger"
  | "sealed_scroll"
  | "seraphim_feather"
  | "burning_crown"
  | "ophidian_relic"
  | "celestial_gate"
  | "seraphim_eye"
  | "samsara"
  | "ouroboros"
  | "panepoptis_ophthalmos"
  | "wild";

export type SpecialSymbolFamily =
  | "seraphim_eye"
  | "samsara"
  | "ouroboros"
  | "panepoptis_ophthalmos";

export type VolatilityLabel = "low" | "medium" | "high";

export type RngFn = () => number;

export type ClusterCell = {
  row: number;
  col: number;
};

export type WeightedSymbol = {
  symbol: SymbolId;
  weight: number;
};

export type PaytableEntry = {
  symbol: Exclude<
    SymbolId,
    "seraphim_eye" | "samsara" | "ouroboros" | "panepoptis_ophthalmos" | "wild"
  >;
  payouts: Record<number, number>;
};

export type GameConfig = {
  gameKey: string;
  version: string;
  targetRtp: number;
  volatility: VolatilityLabel;
  rows: number;
  cols: number;
  visibleLines: number;
  totalCells: number;
  clusterDirections: "orthogonal";
  gravity: "top-down";
  symbolWeights: WeightedSymbol[];
  paytable: PaytableEntry[];
  clusterThreshold: number;
  maxCascadeSteps: number;
  cascadeMultiplierLadder: number[];
  bonusMeterTarget: number;
  bonusSpinsAwarded: number;
  winMultiplierOptions: number[];
  maxBonusMultiplier: number;
};

export type BonusState = {
  mode: "sky_opens";
  freeSpinsRemaining: number;
  totalBonusWin: number;
  stickyMultiplier: number;
  betPerSpin: number;
  initialBonusBudget: number;
  remainingBonusBudget: number;
  preBonusBet: number;
};

export type GameState = {
  balance: number;
  bonusMeter: number;
  samsaraCollectedBets: number;
  samsaraContributionLog: number[];
  bonusState: BonusState | null;
  lastTotalWin: number;
};

export type MeterProgress = {
  before: number;
  added: number;
  after: number;
  target: number;
};

export type ModifierEvent =
  | {
      type: "seraphim_eye";
      cascadeIndex: number;
      source: "seraphim_eye";
      transformedCells: ClusterCell[];
      multiplierBoost: number;
    }
  | {
      type: "ouroboros";
      cascadeIndex: number;
      source: "ouroboros";
      awardedMultiplier: number;
    }
  | {
      type: "panepoptis_ophthalmos";
      cascadeIndex: number;
      source: "panepoptis_ophthalmos";
      awardedMultiplier: number;
      targetColumn: number;
    }
  | {
      type: "samsara_bonus_trigger";
      cascadeIndex: number;
      source: "samsara";
      freeSpinsAwarded: number;
      collectedAmount: number;
      bonusBetPerSpin: number;
    };

export type MultiplierTrigger = {
  source:
    | "applied_win_multiplier"
    | "cascade_ladder"
    | "seraphim_eye"
    | "ouroboros"
    | "panepoptis_ophthalmos";
  cascadeIndex: number | null;
  multiplier: number;
  scope: "selection" | "cascade" | "bonus" | "modifier";
  contributionAmount: number;
};

export type CascadeWin = {
  symbol: SymbolId;
  size: number;
  payoutMultiplier: number;
  payout: number;
  cells: ClusterCell[];
};

export type EvaluatedWin = CascadeWin & {
  cascadeIndex: number;
  totalContribution: number;
};

export type CascadeStep = {
  index: number;
  boardBefore: SymbolId[][];
  wins: CascadeWin[];
  modifierEvents: ModifierEvent[];
  cascadeMultiplier: number;
  stickyMultiplier: number;
  appliedWinMultiplier: number;
  stepWin: number;
  boardAfter: SymbolId[][];
};

export type RoundSummary = {
  roundId: string;
  timestamp: string;
  bet: number;
  totalWin: number;
  walletDelta: number;
  mode: "base" | "bonus";
  cascades: number;
  appliedWinMultiplier: number;
  bonusTriggered: boolean;
  summaryLabel: string;
};

export type DebugMetadata = {
  chargedBet: number;
  totalCascades: number;
  totalEvaluatedWins: number;
  totalModifierEvents: number;
  totalMultiplierEvents: number;
  endingBalance: number;
};

export type SpinResult = {
  seedUsed: number;
  configVersion: string;
  bet: number;
  mode: "base" | "bonus";
  appliedWinMultiplier: number;
  initialBoard: SymbolId[][];
  endingBoard: SymbolId[][];
  evaluatedWins: EvaluatedWin[];
  cascades: CascadeStep[];
  multipliersTriggered: MultiplierTrigger[];
  modifiersTriggered: ModifierEvent[];
  meterProgress: MeterProgress;
  bonusTriggered: boolean;
  bonusStateBefore: BonusState | null;
  bonusStateAfter: BonusState | null;
  totalWin: number;
  walletDelta: number;
  roundSummary: RoundSummary;
  debugMetadata: DebugMetadata;
  balanceAfter: number;
  nextState: GameState;
  board: SymbolId[][];
};

export type SpinOptions = {
  bet: number;
  state: GameState;
  winMultiplier?: number;
  seed?: number;
  roundId?: string;
  timestamp?: string;
  devMode?: boolean;
};

export type PercentileWinDistribution = {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
};

export type MathReport = {
  totalSpins: number;
  configVersion: string;
  achievedRtp: number;
  confidenceInterval95: {
    low: number;
    high: number;
  };
  baseRtpContribution: number;
  bonusRtpContribution: number;
  hitRate: number;
  averageWin: number;
  bonusTriggerRate: number;
  averageBonusPayout: number;
  maxObservedWin: number;
  symbolFrequencyTable: Record<SymbolId, number>;
  cascadeDepthDistribution: Record<number, number>;
  multiplierContributionDistribution: Record<string, number>;
  percentileWinDistribution: PercentileWinDistribution;
  evContributionBySpecialSymbolFamily: Record<SpecialSymbolFamily, number>;
};

export type SimulationInput = {
  spins: number;
  bet: number;
  baseSeed: number;
  winMultiplier?: number;
  startingBalance?: number;
};

export type SimulationResult = MathReport & {
  totalWagered: number;
  totalReturned: number;
  totalBonusTriggers: number;
  totalBonusRounds: number;
  averageWinOnHit: number;
};
