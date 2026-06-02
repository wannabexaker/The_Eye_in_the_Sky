"use client";

import { useEffect, useState } from "react";
import {
  getPlayerApiOfflineStatus,
  PLAYER_API_OFFLINE_STATUS_EVENT,
  type PlayerApiOfflineStatus
} from "@/lib/api/offline-status";

export function usePlayerApiOfflineStatus() {
  const [status, setStatus] = useState<PlayerApiOfflineStatus>(() =>
    getPlayerApiOfflineStatus()
  );

  useEffect(() => {
    const handleStatusChange = (event: Event) => {
      setStatus((event as CustomEvent<PlayerApiOfflineStatus>).detail);
    };

    window.addEventListener(PLAYER_API_OFFLINE_STATUS_EVENT, handleStatusChange);
    setStatus(getPlayerApiOfflineStatus());

    return () => {
      window.removeEventListener(PLAYER_API_OFFLINE_STATUS_EVENT, handleStatusChange);
    };
  }, []);

  return status;
}
