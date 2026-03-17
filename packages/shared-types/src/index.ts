export type BonusModeName = "sky_opens";

export type WalletEntryReason = "bet" | "win" | "reset_balance" | "bonus_adjustment";

export type LedgerEntry = {
  id: string;
  walletId: string;
  reason: WalletEntryReason;
  amount: number;
  balanceAfter: number;
  createdAt: string;
  roundId?: string;
};

export type BonusStateDto = {
  mode: BonusModeName;
  freeSpinsRemaining: number;
  totalBonusWin: number;
  stickyMultiplier: number;
};

export type RoundSummaryDto = {
  roundId: string;
  gameKey: string;
  bet: number;
  totalWin: number;
  walletDelta: number;
  endedWithBonus: boolean;
  createdAt: string;
};

export type SpinRequestDto = {
  gameKey: string;
  bet: number;
  winMultiplier: number;
  configVersion: string;
  sessionId?: string;
  seed?: number;
  devMode?: boolean;
};

export type SpinResponseDto = {
  summary: RoundSummaryDto;
  balanceAfter: number;
  bonusStateAfter: BonusStateDto | null;
};

export type GameMathProfileDto = {
  id: string;
  gameKey: string;
  version: string;
  targetRtp: number;
  volatility: "low" | "medium" | "high";
  clusterThreshold: number;
};
