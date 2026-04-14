import {
  defaultGameConfig,
  getGameConfigByVersion,
  resolveGameConfigProfile,
  type GameConfig
} from "@eye/game-engine";

const envProfileId = process.env.NEXT_PUBLIC_GAME_MATH_PROFILE;
const envConfigVersion = process.env.NEXT_PUBLIC_GAME_CONFIG_VERSION;
const DEFAULT_API_BASE = "/_api";
const GAME_CONFIG_FETCH_RETRY_DELAY_MS = 30_000;

let gameConfigFetchBlockedUntil = 0;
let gameConfigFetchWarnedOffline = false;

const resolvedByProfile = resolveGameConfigProfile(envProfileId);
const resolvedByVersion = envConfigVersion ? getGameConfigByVersion(envConfigVersion) : null;

export const fallbackGameConfig: GameConfig = resolvedByVersion ?? resolvedByProfile.config ?? defaultGameConfig;

export type RuntimeGameConfigProfile = {
  profileId: string;
  profileLabel: string;
  configVersion: string;
  isLegacy: boolean;
};

export type RuntimeGameConfigState = {
  activeProfileId: string;
  activeProfileLabel: string;
  isLegacy: boolean;
  activeConfig: GameConfig;
};

export const fallbackGameConfigProfile: RuntimeGameConfigProfile = {
  profileId: resolvedByProfile.id,
  profileLabel: resolvedByProfile.label,
  configVersion: fallbackGameConfig.version,
  isLegacy: resolvedByProfile.isLegacy
};

export const fallbackRuntimeGameConfigState: RuntimeGameConfigState = {
  activeProfileId: fallbackGameConfigProfile.profileId,
  activeProfileLabel: fallbackGameConfigProfile.profileLabel,
  isLegacy: fallbackGameConfigProfile.isLegacy,
  activeConfig: fallbackGameConfig
};

export const normalizeRuntimeGameConfigState = (
  value: unknown
): RuntimeGameConfigState | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<RuntimeGameConfigState>;
  const activeConfig = candidate.activeConfig;

  if (
    !candidate.activeProfileId ||
    !candidate.activeProfileLabel ||
    typeof candidate.isLegacy !== "boolean" ||
    !activeConfig ||
    typeof activeConfig !== "object" ||
    typeof activeConfig.version !== "string"
  ) {
    return null;
  }

  return {
    activeProfileId: candidate.activeProfileId,
    activeProfileLabel: candidate.activeProfileLabel,
    isLegacy: candidate.isLegacy,
    activeConfig: activeConfig as GameConfig
  };
};

export const fetchRuntimeGameConfigState = async (
  apiBase: string = DEFAULT_API_BASE
): Promise<RuntimeGameConfigState> => {
  if (Date.now() < gameConfigFetchBlockedUntil) {
    throw new Error("Game config API is temporarily blocked due to repeated failures");
  }

  try {
    const response = await fetch(`${apiBase}/game-config`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000) // 5s timeout
    });

    if (!response.ok) {
      gameConfigFetchBlockedUntil = Date.now() + GAME_CONFIG_FETCH_RETRY_DELAY_MS;
      if (!gameConfigFetchWarnedOffline) {
        gameConfigFetchWarnedOffline = true;
        console.warn(
          `Game config API returned ${response.status}. Polling paused for 30s; using local fallback.`
        );
      }
      throw new Error(`Failed to fetch active game config: ${response.status}`);
    }

    gameConfigFetchWarnedOffline = false;

    const normalized = normalizeRuntimeGameConfigState(await response.json());
    if (!normalized) {
      throw new Error("Invalid active game config payload");
    }

    return normalized;
  } catch (error) {
    // Catch network errors (connection refused, timeout, etc.)
    gameConfigFetchBlockedUntil = Date.now() + GAME_CONFIG_FETCH_RETRY_DELAY_MS;
    if (!gameConfigFetchWarnedOffline) {
      gameConfigFetchWarnedOffline = true;
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `Game config API is unreachable (${message}). Polling paused for 30s; using local fallback.`
      );
    }
    throw error;
  }
};
