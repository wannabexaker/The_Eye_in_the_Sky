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
};

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
