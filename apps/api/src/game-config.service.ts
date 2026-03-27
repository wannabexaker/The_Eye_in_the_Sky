import {
  getGameConfigProfile,
  listGameConfigProfiles,
  type GameConfig,
  type GameMathProfileId
} from "@eye/game-engine";
import { Injectable } from "@nestjs/common";
import { ACTIVE_PROFILE_SETTING_KEY } from "./bootstrap-data";
import { PrismaService } from "./prisma.service";

export interface GameConfigStateDto {
  activeProfileId: GameMathProfileId;
  activeProfileLabel: string;
  isLegacy: boolean;
  activeConfig: GameConfig;
}

@Injectable()
export class GameConfigService {
  constructor(private readonly prisma: PrismaService) {}

  private async getStoredProfileId(): Promise<GameMathProfileId> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: ACTIVE_PROFILE_SETTING_KEY }
    });

    const candidate = setting?.value;
    if (
      candidate === "legacy_v1_3" ||
      candidate === "math_base_v2_0" ||
      candidate === "constellation_simple_v0_1"
    ) {
      return candidate;
    }

    return "math_base_v2_0";
  }

  async getActiveConfig(): Promise<GameConfigStateDto> {
    const profile = getGameConfigProfile(await this.getStoredProfileId());
    return {
      activeProfileId: profile.id,
      activeProfileLabel: profile.label,
      isLegacy: profile.isLegacy,
      activeConfig: profile.config
    };
  }

  async setActiveProfile(
    profileId: GameMathProfileId,
    actorUserId?: string
  ): Promise<GameConfigStateDto> {
    await this.prisma.appSetting.upsert({
      where: { key: ACTIVE_PROFILE_SETTING_KEY },
      update: { value: profileId },
      create: { key: ACTIVE_PROFILE_SETTING_KEY, value: profileId }
    });

    if (actorUserId) {
      await this.prisma.adminAction.create({
        data: {
          userId: actorUserId,
          actionType: "game_config.profile_select",
          payload: JSON.stringify({ profileId })
        }
      });

      await this.prisma.auditLog.create({
        data: {
          entityType: "game_config",
          entityId: ACTIVE_PROFILE_SETTING_KEY,
          eventType: "profile_select",
          payload: JSON.stringify({ profileId, actorUserId })
        }
      });
    }

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
