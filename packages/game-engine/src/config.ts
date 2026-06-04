import type { GameConfig, GameState } from "./types";

export type GameMathProfileId =
  | "legacy_v1_3"
  | "math_base_v2_0"
  | "constellation_simple_v0_1";

export type GameConfigProfile = {
  id: GameMathProfileId;
  label: string;
  isLegacy: boolean;
  config: GameConfig;
};

const cloneGameConfig = (config: GameConfig): GameConfig => ({
  ...config,
  symbolWeights: config.symbolWeights.map((entry) => ({ ...entry })),
  paytable: config.paytable.map((entry) => ({
    ...entry,
    payouts: { ...entry.payouts }
  })),
  cascadeMultiplierLadder: [...config.cascadeMultiplierLadder],
  scatterRewards: config.scatterRewards.map((entry) => ({ ...entry })),
  winMultiplierOptions: [...config.winMultiplierOptions],
  multiplierValueWeights: config.multiplierValueWeights.map((entry) => ({ ...entry }))
});

export const legacyGameConfig: GameConfig = {
  gameKey: "the-eye-in-the-sky",
  version: "eye-sky-math-v1.3",
  variantId: "main_cluster",
  targetRtp: 0.955,
  payoutScale: 0.9127,
  volatility: "medium",
  rows: 5,
  cols: 6,
  visibleLines: 5,
  totalCells: 30,
  evaluationMode: "cluster",
  clusterDirections: "orthogonal",
  gravity: "top-down",
  clusterThreshold: 4,
  maxCascadeSteps: 12,
  cascadeMultiplierLadder: [1, 1.25, 1.5, 2, 2.5],
  bonusTriggerMode: "meter",
  bonusMeterTarget: 17,
  bonusSpinsAwarded: 7,
  scatterRewards: [],
  winMultiplierOptions: [1, 2, 3],
  maxBonusMultiplier: 4,
  multiplierValueWeights: [],
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
    { symbol: "samsara", weight: 0.08 },
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

export const mathBaseV2GameConfig: GameConfig = {
  gameKey: "the-eye-in-the-sky",
  version: "eye-sky-math-v2.0",
  variantId: "main_cluster",
  targetRtp: 0.954,
  payoutScale: 0.9475,
  volatility: "medium",
  rows: 5,
  cols: 6,
  visibleLines: 5,
  totalCells: 30,
  evaluationMode: "cluster",
  clusterDirections: "orthogonal",
  gravity: "top-down",
  clusterThreshold: 4,
  maxCascadeSteps: 12,
  cascadeMultiplierLadder: [1, 1.2, 1.45, 1.9, 2.35],
  bonusTriggerMode: "meter",
  bonusMeterTarget: 17,
  bonusSpinsAwarded: 7,
  scatterRewards: [],
  winMultiplierOptions: [1, 2, 3],
  maxBonusMultiplier: 4,
  multiplierValueWeights: [],
  symbolWeights: [
    { symbol: "ashen_sigil", weight: 14.8 },
    { symbol: "broken_halo", weight: 14.1 },
    { symbol: "ritual_dagger", weight: 13.3 },
    { symbol: "sealed_scroll", weight: 13.3 },
    { symbol: "seraphim_feather", weight: 8.0 },
    { symbol: "burning_crown", weight: 6.2 },
    { symbol: "ophidian_relic", weight: 4.55 },
    { symbol: "celestial_gate", weight: 3.3 },
    { symbol: "seraphim_eye", weight: 0.33 },
    { symbol: "samsara", weight: 0.075 },
    { symbol: "ouroboros", weight: 0.155 },
    { symbol: "panepoptis_ophthalmos", weight: 0.075 }
  ],
  paytable: [
    { symbol: "ashen_sigil", payouts: { 4: 0.3805, 5: 0.462, 6: 0.7397, 7: 1.1103, 8: 1.6655, 10: 2.999, 12: 5.0745 } },
    { symbol: "broken_halo", payouts: { 4: 0.4566, 5: 0.5548, 6: 0.8322, 7: 1.2952, 8: 1.8523, 10: 3.4675, 12: 5.7674 } },
    { symbol: "ritual_dagger", payouts: { 4: 0.5327, 5: 0.6476, 6: 1.0171, 7: 1.4828, 8: 2.2228, 10: 4.0685, 12: 6.6902 } },
    { symbol: "sealed_scroll", payouts: { 4: 0.6088, 5: 0.7401, 6: 1.1096, 7: 1.6668, 8: 2.5933, 10: 4.6233, 12: 7.6177 } },
    { symbol: "seraphim_feather", payouts: { 4: 0.8372, 5: 1.0171, 6: 1.5719, 7: 2.3117, 8: 3.4213, 10: 6.2415, 12: 9.6795 } },
    { symbol: "burning_crown", payouts: { 4: 1.2176, 5: 1.4828, 6: 2.2193, 7: 3.3288, 8: 4.8179, 10: 8.7843, 12: 13.6362 } },
    { symbol: "ophidian_relic", payouts: { 4: 1.7503, 5: 2.1316, 6: 3.2271, 7: 4.6225, 8: 6.7654, 10: 12.252, 12: 18.9526 } },
    { symbol: "celestial_gate", payouts: { 4: 2.3591, 5: 2.873, 6: 4.3338, 7: 6.1949, 8: 9.0828, 10: 16.4127, 12: 25.4282 } }
  ]
};

export const constellationSimpleGameConfig: GameConfig = {
  gameKey: "the-eye-in-the-sky",
  version: "eye-sky-constellation-v0.1",
  variantId: "constellation_simple",
  targetRtp: 0.952,
  volatility: "high",
  rows: 5,
  cols: 6,
  visibleLines: 5,
  totalCells: 30,
  evaluationMode: "count_anywhere",
  clusterDirections: "orthogonal",
  gravity: "top-down",
  clusterThreshold: 8,
  maxCascadeSteps: 12,
  cascadeMultiplierLadder: [1],
  bonusTriggerMode: "scatter",
  bonusMeterTarget: 17,
  bonusSpinsAwarded: 7,
  scatterRewards: [
    { count: 4, payoutMultiplier: 1, freeSpinsAwarded: 7 },
    { count: 5, payoutMultiplier: 4, freeSpinsAwarded: 10 },
    { count: 6, payoutMultiplier: 20, freeSpinsAwarded: 15 }
  ],
  winMultiplierOptions: [1, 2, 3],
  maxBonusMultiplier: 1,
  multiplierValueWeights: [
    { value: 2, weight: 24000 },
    { value: 3, weight: 19000 },
    { value: 4, weight: 15000 },
    { value: 5, weight: 11000 },
    { value: 6, weight: 7500 },
    { value: 7, weight: 5500 },
    { value: 8, weight: 4200 },
    { value: 10, weight: 3300 },
    { value: 12, weight: 2600 },
    { value: 15, weight: 2000 },
    { value: 20, weight: 1550 },
    { value: 25, weight: 1150 },
    { value: 30, weight: 850 },
    { value: 40, weight: 550 },
    { value: 50, weight: 350 },
    { value: 75, weight: 180 },
    { value: 100, weight: 100 },
    { value: 150, weight: 55 },
    { value: 200, weight: 28 },
    { value: 300, weight: 12, bonusOnly: true },
    { value: 500, weight: 4, bonusOnly: true },
    { value: 1000, weight: 1, bonusOnly: true }
  ],
  symbolWeights: [
    { symbol: "ashen_sigil", weight: 16 },
    { symbol: "broken_halo", weight: 15.1 },
    { symbol: "ritual_dagger", weight: 14.1 },
    { symbol: "sealed_scroll", weight: 13.5 },
    { symbol: "seraphim_feather", weight: 9.7 },
    { symbol: "burning_crown", weight: 7.3 },
    { symbol: "ophidian_relic", weight: 5.3 },
    { symbol: "celestial_gate", weight: 3.8 },
    { symbol: "seraphim_eye", weight: 0.9 },
    { symbol: "samsara", weight: 1.6 }
  ],
  paytable: [
    { symbol: "ashen_sigil", payouts: { 8: 0.2643, 10: 0.659, 12: 1.5723 } },
    { symbol: "broken_halo", payouts: { 8: 0.3145, 10: 0.7861, 12: 1.8264 } },
    { symbol: "ritual_dagger", payouts: { 8: 0.3947, 10: 0.94, 12: 2.2211 } },
    { symbol: "sealed_scroll", payouts: { 8: 0.465, 10: 1.1005, 12: 2.609 } },
    { symbol: "seraphim_feather", payouts: { 8: 0.7259, 10: 1.8264, 12: 4.7132 } },
    { symbol: "burning_crown", payouts: { 8: 1.1005, 10: 2.7463, 12: 6.8107 } },
    { symbol: "ophidian_relic", payouts: { 8: 1.6925, 10: 4.1812, 12: 10.4496 } },
    { symbol: "celestial_gate", payouts: { 8: 2.482, 10: 6.2684, 12: 15.6711 } }
  ]
};

const profileRegistry: Record<GameMathProfileId, GameConfigProfile> = {
  legacy_v1_3: {
    id: "legacy_v1_3",
    label: "Legacy Math v1.3",
    isLegacy: true,
    config: legacyGameConfig
  },
  math_base_v2_0: {
    id: "math_base_v2_0",
    label: "Math Base v2.0",
    isLegacy: false,
    config: mathBaseV2GameConfig
  },
  constellation_simple_v0_1: {
    id: "constellation_simple_v0_1",
    label: "Constellation Simple v0.1",
    isLegacy: false,
    config: constellationSimpleGameConfig
  }
};

export const defaultGameConfig = cloneGameConfig(profileRegistry.math_base_v2_0.config);

export const getGameConfigProfile = (profileId: GameMathProfileId): GameConfigProfile => {
  const profile = profileRegistry[profileId];
  return {
    ...profile,
    config: cloneGameConfig(profile.config)
  };
};

export const resolveGameConfigProfile = (profileId?: string): GameConfigProfile => {
  if (!profileId || !(profileId in profileRegistry)) {
    return getGameConfigProfile("math_base_v2_0");
  }

  return getGameConfigProfile(profileId as GameMathProfileId);
};

export const getGameConfigByVersion = (version: string): GameConfig | null => {
  for (const profile of Object.values(profileRegistry)) {
    if (profile.config.version === version) {
      return cloneGameConfig(profile.config);
    }
  }

  return null;
};

export const listGameConfigProfiles = (): GameConfigProfile[] =>
  (Object.values(profileRegistry) as GameConfigProfile[]).map((profile) => ({
    ...profile,
    config: cloneGameConfig(profile.config)
  }));

export const initialGameState = (balance = 1000): GameState => ({
  balance,
  bonusMeter: 0,
  samsaraCollectedBets: 0,
  samsaraContributionLog: [],
  bonusState: null,
  lastTotalWin: 0
});
