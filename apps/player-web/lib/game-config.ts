import {
  defaultGameConfig,
  getGameConfigByVersion,
  resolveGameConfigProfile,
  type GameConfig
} from "@eye/game-engine";

const envProfileId = process.env.NEXT_PUBLIC_GAME_MATH_PROFILE;
const envConfigVersion = process.env.NEXT_PUBLIC_GAME_CONFIG_VERSION;

const resolvedByProfile = resolveGameConfigProfile(envProfileId);
const resolvedByVersion = envConfigVersion ? getGameConfigByVersion(envConfigVersion) : null;

export const activeGameConfig: GameConfig = resolvedByVersion ?? resolvedByProfile.config;

export const activeGameConfigProfile = {
  profileId: resolvedByProfile.id,
  profileLabel: resolvedByProfile.label,
  configVersion: activeGameConfig.version,
  isLegacy: resolvedByProfile.isLegacy
};
