import type { BonusState, GameConfig } from "./types";

export const createBonusState = (
  config: GameConfig,
  betPerSpin = 0,
  initialBonusBudget = 0,
  preBonusBet = 0
): BonusState => ({
  mode: "sky_opens",
  freeSpinsRemaining: config.bonusSpinsAwarded,
  totalBonusWin: 0,
  stickyMultiplier: 1,
  betPerSpin,
  initialBonusBudget,
  remainingBonusBudget: initialBonusBudget,
  preBonusBet
});
