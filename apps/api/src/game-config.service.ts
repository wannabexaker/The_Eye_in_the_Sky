import {
  getGameConfigProfile,
  listGameConfigProfiles,
  type GameConfig,
  type GameMathProfileId
} from "@eye/game-engine";
import { Injectable } from "@nestjs/common";

export interface GameConfigStateDto {
  activeProfileId: GameMathProfileId;
  activeProfileLabel: string;
  isLegacy: boolean;
  activeConfig: GameConfig;
}

@Injectable()
export class GameConfigService {
  private activeProfileId: GameMathProfileId = "math_base_v2_0";

  getActiveConfig(): GameConfigStateDto {
    const profile = getGameConfigProfile(this.activeProfileId);
    return {
      activeProfileId: profile.id,
      activeProfileLabel: profile.label,
      isLegacy: profile.isLegacy,
      activeConfig: profile.config
    };
  }

  setActiveProfile(profileId: GameMathProfileId): GameConfigStateDto {
    this.activeProfileId = profileId;
    return this.getActiveConfig();
  }

  listAvailableProfiles() {
    return listGameConfigProfiles().map((profile) => ({
      id: profile.id,
      label: profile.label,
      version: profile.config.version,
      isLegacy: profile.isLegacy,
      targetRtp: profile.config.targetRtp,
      volatility: profile.config.volatility
    }));
  }
}
