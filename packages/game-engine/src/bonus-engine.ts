import type { BonusState, GameConfig } from "./types";

export const createBonusState = (config: GameConfig): BonusState => ({
  mode: "sky_opens",
  freeSpinsRemaining: config.bonusSpinsAwarded,
  totalBonusWin: 0,
  stickyMultiplier: 1
});
