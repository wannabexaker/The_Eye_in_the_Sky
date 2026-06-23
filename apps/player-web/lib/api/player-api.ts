"use client";

import type { SpinResult } from "@eye/game-engine";
import type { AuthSessionDto, PlayerSnapshotDto } from "@eye/shared-types";
import { markPlayerApiOffline, markPlayerApiOnline } from "./offline-status";

// Use the server-side proxy path so the browser never needs a direct route to
// the API. Next.js rewrites /_api/* → API_INTERNAL_URL/* at the server level.
const API_BASE = "/_api";

export type AuthModePublicConfig = {
  mode: "INTERNAL_ONLY" | "EXTERNAL_ONLY" | "HYBRID";
  fallbackEnabled: boolean;
  mockModeEnabled: boolean;
  turnstileSiteKey?: string | null;
  rgToolsEnabled?: boolean;
  provablyFairEnabled?: boolean;
};

export type FairnessCommitment = {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  previousServerSeed: string | null;
  previousServerSeedHash: string | null;
};

export type FairnessRotation = FairnessCommitment & { revealedServerSeed: string };

export type ServerSpinResponse = {
  result: SpinResult;
  snapshot: PlayerSnapshotDto;
};

export type ResponsibleGamingSettings = {
  depositLimitDaily: number | null;
  depositLimitWeekly: number | null;
  depositLimitMonthly: number | null;
  lossLimitDaily: number | null;
  lossLimitWeekly: number | null;
  lossLimitMonthly: number | null;
  sessionTimeLimitMinutes: number | null;
  realityCheckIntervalMinutes: number | null;
  selfExclusionUntil: string | null;
  cooloffUntil: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ResponsibleGamingSettingsUpdate = Partial<
  Pick<
    ResponsibleGamingSettings,
    | "depositLimitDaily"
    | "depositLimitWeekly"
    | "depositLimitMonthly"
    | "lossLimitDaily"
    | "lossLimitWeekly"
    | "lossLimitMonthly"
    | "sessionTimeLimitMinutes"
    | "realityCheckIntervalMinutes"
  >
>;

export type PlatformExchangeResult = {
  user: { id: string; email: string; displayName: string };
  sessionId: string;
  expiresAt: number;
  authSource: "external";
};

export type PlayerApiFieldErrors = Record<string, string>;

export class PlayerApiError extends Error {
  status: number;
  code: string;
  fieldErrors: PlayerApiFieldErrors;

  constructor(message: string, status: number, code = "REQUEST_FAILED", fieldErrors: PlayerApiFieldErrors = {}) {
    super(message);
    this.name = "PlayerApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      },
      ...init
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? `API unavailable (${error.message})`
        : "API unavailable";
    markPlayerApiOffline("API_UNREACHABLE", message);
    throw new PlayerApiError(message, 503, "API_UNREACHABLE");
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    let code = "REQUEST_FAILED";
    let fieldErrors: PlayerApiFieldErrors = {};
    try {
      const body = (await response.json()) as {
        code?: string;
        message?: string | string[];
        fieldErrors?: PlayerApiFieldErrors;
        error?: string;
      };
      if (typeof body.code === "string") {
        code = body.code;
      }
      if (body.fieldErrors && typeof body.fieldErrors === "object") {
        fieldErrors = body.fieldErrors;
      }
      if (Array.isArray(body.message)) {
        message = body.message.join(", ");
      } else if (typeof body.message === "string") {
        message = body.message;
      } else if (typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // ignore malformed error payloads
    }
    if (code === "API_UNREACHABLE") {
      markPlayerApiOffline(code, message);
    } else {
      markPlayerApiOnline();
    }

    throw new PlayerApiError(message, response.status, code, fieldErrors);
  }

  markPlayerApiOnline();
  return response.json() as Promise<T>;
}

export const fetchAuthSession = () => requestJson<AuthSessionDto>("/auth/me", { method: "GET" });

export const fetchAuthMode = () =>
  requestJson<AuthModePublicConfig>("/auth/mode", { method: "GET" });

export const exchangePlatformToken = (payload: {
  platformAssertion: string;
  nonce: string;
  timestamp: number;
  handoffId?: string;
}) =>
  requestJson<PlatformExchangeResult>("/auth/platform/exchange", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const loginPlayer = (payload: { email: string; password: string }) =>
  requestJson<AuthSessionDto>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const registerPlayer = (payload: {
  email: string;
  password: string;
  displayName: string;
  turnstileToken?: string;
}) =>
  requestJson<AuthSessionDto>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const changePlayerPassword = (payload: {
  currentPassword: string;
  newPassword: string;
}) =>
  requestJson<{ ok: boolean }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const forgotPlayerPassword = (payload: { email: string }) =>
  requestJson<{ ok: boolean; resetToken?: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const resetPlayerPassword = (payload: { token: string; newPassword: string }) =>
  requestJson<{ ok: boolean }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const logoutPlayer = () =>
  requestJson<{ ok: boolean }>("/auth/logout", { method: "POST" });

export const fetchPlayerBootstrap = () =>
  requestJson<PlayerSnapshotDto>("/player/bootstrap", { method: "GET" });

export const fetchResponsibleGamingSettings = () =>
  requestJson<ResponsibleGamingSettings>("/player/responsible-gaming", { method: "GET" });

export const updateResponsibleGamingSettings = (payload: ResponsibleGamingSettingsUpdate) =>
  requestJson<ResponsibleGamingSettings>("/player/responsible-gaming", {
    method: "PUT",
    body: JSON.stringify(payload)
  });

export const startResponsibleGamingCooloff = (durationHours: number) =>
  requestJson<ResponsibleGamingSettings>("/player/responsible-gaming/cooloff", {
    method: "POST",
    body: JSON.stringify({ durationHours })
  });

export const startResponsibleGamingSelfExclusion = (durationHours: number) =>
  requestJson<ResponsibleGamingSettings>("/player/responsible-gaming/self-exclude", {
    method: "POST",
    body: JSON.stringify({ durationHours })
  });

export const claimPlayerWelcomeBonus = () =>
  requestJson<PlayerSnapshotDto>("/player/welcome-bonus/claim", { method: "POST" });

export const depositPlayerWallet = (amount: number, methodLabel?: string) =>
  requestJson<PlayerSnapshotDto>("/player/wallet/deposit", {
    method: "POST",
    body: JSON.stringify({ amount, methodLabel })
  });

export const withdrawPlayerWallet = (amount: number, methodLabel?: string) =>
  requestJson<PlayerSnapshotDto>("/player/wallet/withdraw", {
    method: "POST",
    body: JSON.stringify({ amount, methodLabel })
  });

export const persistPlayerRound = (profileId: string, result: SpinResult) =>
  requestJson<PlayerSnapshotDto>("/player/rounds", {
    method: "POST",
    body: JSON.stringify({ profileId, result })
  });

// Provably-fair / server-authoritative spins (active only when the API flag is on).
export const resolveServerSpin = (payload: { bet: number; profileId?: string }) =>
  requestJson<ServerSpinResponse>("/player/spin", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const fetchFairnessCommitment = () =>
  requestJson<FairnessCommitment>("/player/fairness", { method: "GET" });

export const setFairnessClientSeed = (clientSeed: string) =>
  requestJson<FairnessCommitment>("/player/fairness/client-seed", {
    method: "POST",
    body: JSON.stringify({ clientSeed })
  });

export const rotateFairnessSeed = () =>
  requestJson<FairnessRotation>("/player/fairness/rotate", { method: "POST" });
