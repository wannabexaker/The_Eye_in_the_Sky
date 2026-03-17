/*
Purpose: shares presentation-layer result types for wins and bonus flows
Layer: frontend (player-web)
Uses: use-slot-machine.ts and overlay components
*/

export type BonusAnnouncementEntry = {
  title: string;
  freeSpins: number;
  entryWin: number;
  sourceLabel: string;
  continueLabel?: string;
};

export type BonusSummaryEntry = {
  title: string;
  subtitle: string;
  totalWin: number;
  continueLabel?: string;
};

export type WinPresentationEntry = {
  kind: "round_win" | "big_win";
  title: string;
  amount: number;
  subtitle?: string;
  detailRows?: string[];
  requireAcknowledgement: boolean;
  continueLabel?: string;
  autoDismissMs?: number;
};
