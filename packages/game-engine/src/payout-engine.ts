import type { CascadeWin } from "./types";

export const calculateStepWin = (
  wins: CascadeWin[],
  cascadeMultiplier: number,
  stickyMultiplier: number,
  appliedWinMultiplier: number
): number =>
  Number(
    wins
      .reduce(
        (sum, win) =>
          sum + win.payout * cascadeMultiplier * stickyMultiplier * appliedWinMultiplier,
        0
      )
      .toFixed(2)
  );
