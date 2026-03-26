/*
Purpose: shares presentation-layer result types for wins and bonus flows
Layer: frontend (player-web)
Uses: use-slot-machine.ts and overlay components
*/

export type BonusAnnouncementEntry = {
  title: string;
  heading?: string;
  lead?: string;
  freeSpins: number;
  entryWin: number;
  sourceLabel: string;
  freeSpinsLabel?: string;
  modeLabel?: string;
  modeValue?: string;
  continueLabel?: string;
};

export type BonusSummaryEntry = {
  title: string;
  subtitle: string;
  totalWin: number;
  totalWinLabel?: string;
  continueLabel?: string;
};

export type WinPresentationEntry = {
  kind: "round_win" | "big_win" | "huge_win" | "super_win";
  title: string;
  amount: number;
  winMultiple: number;
  glowLevel: number;
  subtitle?: string;
  detailRows?: string[];
  requireAcknowledgement: boolean;
  continueLabel?: string;
  autoDismissMs?: number;
};
