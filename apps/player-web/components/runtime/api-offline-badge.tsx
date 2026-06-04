"use client";

import { usePlayerApiOfflineStatus } from "@/hooks/use-player-api-offline-status";
import styles from "./api-offline-badge.module.css";

export function ApiOfflineBadge() {
  const status = usePlayerApiOfflineStatus();

  if (!status.offline) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={styles.badge}
      title={status.message ?? "API unavailable; guest mode remains playable."}
    >
      <span aria-hidden="true" className={styles.dot} />
      <span>Offline — guest mode</span>
    </div>
  );
}
