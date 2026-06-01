"use client";

import type { SpinResult } from "@eye/game-engine";
import type { AuthSessionDto, PlayerSnapshotDto } from "@eye/shared-types";
import { isGuestModeStorageEnabled } from "@/lib/identity/guest-session";

// Use the server-side proxy path so the browser never needs a direct route to
// the API. Next.js rewrites /_api/* → API_INTERNAL_URL/* at the server level.
const API_BASE = "/_api";

export type AuthModePublicConfig = {
  mode: "INTERNAL_ONLY" | "EXTERNAL_ONLY" | "HYBRID";
  fallbackEnabled: boolean;
  mockModeEnabled: boolean;
};

export type PlatformExchangeResult = {
  user: { id: string; email: string; displayName: string };
  sessionId: string;
  expiresAt: number;
  authSource: "external";
};

export type PlayerApiErrorShape = {
  code?: string;
  message: string;
  status: number;
  details?: Array<{ path: string; message: string }>;
};

export class PlayerApiError extends Error implements PlayerApiErrorShape {
  code?: string;
  status: number;
  details?: Array<{ path: string; message: string }>;

  constructor(error: PlayerApiErrorShape) {
    super(error.message);
    this.name = "PlayerApiError";
    this.code = error.code;
    this.status = error.status;
    this.details = error.details;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeErrorBody = (body: unknown, status: number): PlayerApiErrorShape => {
  const fallback = `Request failed (${status})`;
  if (!isRecord(body)) {
    return { message: fallback, status };
  }

  const nestedMessage = body.message;
  const source = isRecord(nestedMessage) ? nestedMessage : body;
  const rawMessage = source.message;
  const rawCode = source.code;
  const rawDetails = source.details;

  return {
    code: typeof rawCode === "string" ? rawCode : undefined,
    message:
      typeof rawMessage === "string"
        ? rawMessage
        : Array.isArray(rawMessage)
          ? rawMessage.join(", ")
          : typeof nestedMessage === "string"
            ? nestedMessage
            : fallback,
    status,
    details: Array.isArray(rawDetails)
      ? rawDetails.filter(
          (entry): entry is { path: string; message: string } =>
            isRecord(entry) &&
            typeof entry.path === "string" &&
            typeof entry.message === "string"
        )
      : undefined
  };
};

const resolveGuestNoop = <T>(operation: string): Promise<T> => {
  console.assert(false, `[player-api] blocked ${operation} while guest mode is active`);
  return Promise.resolve(undefined as T);
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    let errorBody: unknown = null;
    try {
      errorBody = await response.json();
    } catch {
      // ignore malformed error payloads
    }
    throw new PlayerApiError(normalizeErrorBody(errorBody, response.status));
  }

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

export const claimPlayerWelcomeBonus = () =>
  isGuestModeStorageEnabled()
    ? resolveGuestNoop<PlayerSnapshotDto>("claimPlayerWelcomeBonus")
    : requestJson<PlayerSnapshotDto>("/player/welcome-bonus/claim", { method: "POST" });

export const depositPlayerWallet = (amount: number, methodLabel?: string) =>
  isGuestModeStorageEnabled()
    ? resolveGuestNoop<PlayerSnapshotDto>("depositPlayerWallet")
    : requestJson<PlayerSnapshotDto>("/player/wallet/deposit", {
        method: "POST",
        body: JSON.stringify({ amount, methodLabel })
      });

export const withdrawPlayerWallet = (amount: number, methodLabel?: string) =>
  isGuestModeStorageEnabled()
    ? resolveGuestNoop<PlayerSnapshotDto>("withdrawPlayerWallet")
    : requestJson<PlayerSnapshotDto>("/player/wallet/withdraw", {
        method: "POST",
        body: JSON.stringify({ amount, methodLabel })
      });

export const persistPlayerRound = (profileId: string, result: SpinResult) =>
  isGuestModeStorageEnabled()
    ? resolveGuestNoop<PlayerSnapshotDto>("persistPlayerRound")
    : requestJson<PlayerSnapshotDto>("/player/rounds", {
        method: "POST",
        body: JSON.stringify({ profileId, result })
      });
