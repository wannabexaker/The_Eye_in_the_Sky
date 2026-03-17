import type { GameConfig, GameState } from "./types";

export const defaultGameConfig: GameConfig = {
  gameKey: "the-eye-in-the-sky",
  version: "eye-sky-math-v1.2",
  targetRtp: 0.955,
  volatility: "medium",
  rows: 5,
  cols: 6,
  visibleLines: 5,
  totalCells: 30,
  clusterDirections: "orthogonal",
  gravity: "top-down",
  clusterThreshold: 4,
  maxCascadeSteps: 12,
  cascadeMultiplierLadder: [1, 1.25, 1.5, 2, 2.5],
  bonusMeterTarget: 30,
  bonusSpinsAwarded: 8,
  winMultiplierOptions: [1, 2, 3],
  maxBonusMultiplier: 4,
  symbolWeights: [
    { symbol: "ashen_sigil", weight: 14.5 },
    { symbol: "broken_halo", weight: 13.8 },
    { symbol: "ritual_dagger", weight: 13.1 },
    { symbol: "sealed_scroll", weight: 13.1 },
    { symbol: "seraphim_feather", weight: 8.2 },
    { symbol: "burning_crown", weight: 6.4 },
    { symbol: "ophidian_relic", weight: 4.7 },
    { symbol: "celestial_gate", weight: 3.4 },
    { symbol: "seraphim_eye", weight: 0.34 },
    { symbol: "samsara", weight: 0.14 },
    { symbol: "ouroboros", weight: 0.16 },
    { symbol: "panepoptis_ophthalmos", weight: 0.08 }
  ],
  paytable: [
    { symbol: "ashen_sigil", payouts: { 4: 0.3829, 5: 0.467, 6: 0.7472, 7: 1.1208, 8: 1.6812, 10: 3.0355, 12: 5.137 } },
    { symbol: "broken_halo", payouts: { 4: 0.4595, 5: 0.5604, 6: 0.8406, 7: 1.3076, 8: 1.868, 10: 3.5025, 12: 5.8375 } },
    { symbol: "ritual_dagger", payouts: { 4: 0.5361, 5: 0.6538, 6: 1.0274, 7: 1.4944, 8: 2.2416, 10: 4.1096, 12: 6.7715 } },
    { symbol: "sealed_scroll", payouts: { 4: 0.6127, 5: 0.7472, 6: 1.1208, 7: 1.6812, 8: 2.6152, 10: 4.67, 12: 7.7055 } },
    { symbol: "seraphim_feather", payouts: { 4: 0.8425, 5: 1.0274, 6: 1.5878, 7: 2.335, 8: 3.4558, 10: 6.3045, 12: 9.807 } },
    { symbol: "burning_crown", payouts: { 4: 1.2254, 5: 1.4944, 6: 2.2416, 7: 3.3624, 8: 4.8568, 10: 8.873, 12: 13.7765 } },
    { symbol: "ophidian_relic", payouts: { 4: 1.7615, 5: 2.1482, 6: 3.269, 7: 4.67, 8: 6.8182, 10: 12.3755, 12: 19.147 } },
    { symbol: "celestial_gate", payouts: { 4: 2.3742, 5: 2.8954, 6: 4.3898, 7: 6.2578, 8: 9.1532, 10: 16.5785, 12: 25.685 } }
  ]
};

export const initialGameState = (balance = 1000): GameState => ({
  balance,
  bonusMeter: 0,
  bonusState: null,
  lastTotalWin: 0
});
