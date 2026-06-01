"use client";

import { generateRandomDisplayName } from "./random-display-name";

export type GuestSession = {
  id: string;
  displayName: string;
  walletBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  welcomeClaimed: boolean;
};

const GUEST_SESSION_KEY = "eye-in-the-sky-guest-session";

const createGuestId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createGuestSession = (): GuestSession => ({
  id: createGuestId(),
  displayName: generateRandomDisplayName(),
  walletBalance: 0,
  totalDeposited: 0,
  totalWithdrawn: 0,
  welcomeClaimed: false
});

export const loadGuestSession = (): GuestSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<GuestSession>;
    if (!parsed.id || !parsed.displayName) {
      return null;
    }

    return {
      id: parsed.id,
      displayName: parsed.displayName,
      walletBalance: Number.isFinite(parsed.walletBalance) ? parsed.walletBalance ?? 0 : 0,
      totalDeposited: Number.isFinite(parsed.totalDeposited) ? parsed.totalDeposited ?? 0 : 0,
      totalWithdrawn: Number.isFinite(parsed.totalWithdrawn) ? parsed.totalWithdrawn ?? 0 : 0,
      welcomeClaimed: Boolean(parsed.welcomeClaimed)
    };
  } catch {
    return null;
  }
};

export const saveGuestSession = (session: GuestSession) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
  } catch {
    // sessionStorage can be unavailable in private contexts; guest mode still works in memory.
  }
};

export const clearGuestSession = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(GUEST_SESSION_KEY);
  } catch {
    // sessionStorage unavailable - non-critical.
  }
};

export const ensureGuestSession = () => {
  const existing = loadGuestSession();
  if (existing) {
    return existing;
  }

  const created = createGuestSession();
  saveGuestSession(created);
  return created;
};
