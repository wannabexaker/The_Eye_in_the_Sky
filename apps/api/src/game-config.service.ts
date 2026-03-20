import { Injectable } from "@nestjs/common";
import {
  getGameConfigProfile,
  getGameConfigByVersion,
  listGameConfigProfiles,
  type GameMathProfileId,
  type GameConfig
} from "@eye/game-engine";

export interface GameConfigStateDto {
  activeProfileId: GameMathProfileId;
  activeConfig: GameConfig;
}

@Injectable()
export class GameConfigService {
  private activeProfileId: GameMathProfileId = "math_base_v2_0";

  getActiveConfig(): GameConfigStateDto {
    const profile = getGameConfigProfile(this.activeProfileId);
    return {
      activeProfileId: this.activeProfileId,
      activeConfig: profile.config
    };
  }

  setActiveProfile(profileId: GameMathProfileId): GameConfigStateDto {
    this.activeProfileId = profileId;
    const profile = getGameConfigProfile(this.activeProfileId);
    return {
      activeProfileId: this.activeProfileId,
      activeConfig: profile.config
    };
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

  getConfigByVersion(version: string) {
    return getGameConfigByVersion(version);
  }
}
