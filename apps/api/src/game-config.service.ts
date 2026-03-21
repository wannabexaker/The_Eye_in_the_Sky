import { Injectable } from "@nestjs/common";

type GameMathProfileId = "legacy_v1_3" | "math_base_v2_0";

type GameConfig = {
  gameKey: string;
  version: string;
  targetRtp: number;
  volatility: "low" | "medium" | "high";
  rows: number;
  cols: number;
  bonusMeterTarget: number;
  bonusSpinsAwarded: number;
};

export interface GameConfigStateDto {
  activeProfileId: GameMathProfileId;
  activeConfig: GameConfig;
}

const PROFILE_REGISTRY: Record<
  GameMathProfileId,
  {
    id: GameMathProfileId;
    label: string;
    isLegacy: boolean;
    config: GameConfig;
  }
> = {
  legacy_v1_3: {
    id: "legacy_v1_3",
    label: "Legacy Math v1.3",
    isLegacy: true,
    config: {
      gameKey: "the-eye-in-the-sky",
      version: "eye-sky-math-v1.3",
      targetRtp: 0.955,
      volatility: "medium",
      rows: 5,
      cols: 6,
      bonusMeterTarget: 16,
      bonusSpinsAwarded: 8
    }
  },
  math_base_v2_0: {
    id: "math_base_v2_0",
    label: "Math Base v2.0",
    isLegacy: false,
    config: {
      gameKey: "the-eye-in-the-sky",
      version: "eye-sky-math-v2.0",
      targetRtp: 0.954,
      volatility: "medium",
      rows: 5,
      cols: 6,
      bonusMeterTarget: 17,
      bonusSpinsAwarded: 8
    }
  }
};

@Injectable()
export class GameConfigService {
  private activeProfileId: GameMathProfileId = "math_base_v2_0";

  getActiveConfig(): GameConfigStateDto {
    const profile = PROFILE_REGISTRY[this.activeProfileId];
    return {
      activeProfileId: this.activeProfileId,
      activeConfig: profile.config
    };
  }

  setActiveProfile(profileId: GameMathProfileId): GameConfigStateDto {
    this.activeProfileId = profileId;
    const profile = PROFILE_REGISTRY[this.activeProfileId];
    return {
      activeProfileId: this.activeProfileId,
      activeConfig: profile.config
    };
  }

  listAvailableProfiles() {
    return Object.values(PROFILE_REGISTRY).map((profile) => ({
      id: profile.id,
      label: profile.label,
      version: profile.config.version,
      isLegacy: profile.isLegacy,
      targetRtp: profile.config.targetRtp,
      volatility: profile.config.volatility
    }));
  }

  getConfigByVersion(version: string) {
    return Object.values(PROFILE_REGISTRY).find((profile) => profile.config.version === version)?.config ?? null;
  }
}
