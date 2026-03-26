import type { CascadeWin } from "./types";

export const calculateStepWin = (
  wins: CascadeWin[],
  cascadeMultiplier: number,
  stickyMultiplier: number,
  settleWinMultiplier: number,
  appliedWinMultiplier: number
): number =>
  Number(
    wins
      .reduce(
        (sum, win) =>
          sum +
          win.payout *
            cascadeMultiplier *
            stickyMultiplier *
            settleWinMultiplier *
            appliedWinMultiplier,
        0
      )
      .toFixed(2)
  );
