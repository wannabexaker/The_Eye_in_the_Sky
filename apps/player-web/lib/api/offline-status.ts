"use client";

export type PlayerApiOfflineStatus = {
  offline: boolean;
  code?: string;
  message?: string;
  updatedAt: number;
};

export const PLAYER_API_OFFLINE_STATUS_EVENT = "eye-player-api-offline-status";

let currentStatus: PlayerApiOfflineStatus = {
  offline: false,
  updatedAt: 0
};

const emitStatus = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<PlayerApiOfflineStatus>(PLAYER_API_OFFLINE_STATUS_EVENT, {
      detail: currentStatus
    })
  );
};

export const getPlayerApiOfflineStatus = () => currentStatus;

export const markPlayerApiOffline = (code: string, message: string) => {
  currentStatus = {
    offline: true,
    code,
    message,
    updatedAt: Date.now()
  };
  emitStatus();
};

export const markPlayerApiOnline = () => {
  if (!currentStatus.offline) {
    return;
  }

  currentStatus = {
    offline: false,
    updatedAt: Date.now()
  };
  emitStatus();
};
