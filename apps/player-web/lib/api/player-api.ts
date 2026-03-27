"use client";

import type { SpinResult } from "@eye/game-engine";
import type { AuthSessionDto, PlayerSnapshotDto } from "@eye/shared-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3200";

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
