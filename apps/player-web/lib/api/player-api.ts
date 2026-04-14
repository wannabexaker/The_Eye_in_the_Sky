"use client";

import type { SpinResult } from "@eye/game-engine";
import type { AuthSessionDto, PlayerSnapshotDto } from "@eye/shared-types";

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
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        message = body.message.join(", ");
      } else if (typeof body.message === "string") {
        message = body.message;
      }
    } catch {
      // ignore malformed error payloads
    }
    throw new Error(message);
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
