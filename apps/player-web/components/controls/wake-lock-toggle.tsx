"use client";

import { useEffect, useState } from "react";
import { useScreenWakeLock } from "@/hooks/useScreenWakeLock";

const WakeLockActiveIcon = () => (
  <svg aria-hidden="true" className="dockSmallIcon wakeLockIcon" viewBox="0 0 24 24">
    <rect x="4" y="7" width="16" height="11" rx="2" />
    <path d="M8 21h8" />
    <path d="M12 3v2" />
    <path d="M17 5l-1.4 1.4" />
    <path d="M7 5l1.4 1.4" />
    <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0" />
  </svg>
);

const WakeLockInactiveIcon = () => (
  <svg aria-hidden="true" className="dockSmallIcon wakeLockIcon" viewBox="0 0 24 24">
    <rect x="4" y="7" width="16" height="11" rx="2" />
    <path d="M8 21h8" />
    <path d="M15.5 10.5a3.8 3.8 0 1 1-4-4.9a4.8 4.8 0 1 0 4.9 6.9" />
    <path d="M7 16l10-8" />
  </svg>
);

/**
 * Renders a manual wake-lock toggle button.
 * It uses native Screen Wake Lock when available and keeps the RAF fallback
 * toggle visible when native support is unavailable.
 */
export function WakeLockToggle() {
  const {
    requestWakeLock,
    releaseWakeLock,
    hasSupport,
    isAcquired,
    manualToggleAvailable
  } = useScreenWakeLock();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(isAcquired);
  }, [isAcquired]);

  const handleToggle = async () => {
    if (isActive) {
      await releaseWakeLock();
      setIsActive(false);
    } else {
      await requestWakeLock();
      setIsActive(true);
    }
  };

  if (!manualToggleAvailable) {
    return null;
  }

  const inactiveLabel = hasSupport ? "Keep screen awake" : "Keep screen awake with fallback";

  return (
    <button
      aria-label={isActive ? "Screen stay-awake enabled" : inactiveLabel}
      aria-pressed={isActive}
      className={`dockSmallButton iconOnlyAction ${isActive ? "is-active" : ""}`}
      onClick={handleToggle}
      title={
        isActive
          ? "Stay-awake active: screen will not sleep"
          : hasSupport
            ? "Click to keep screen awake during gameplay"
            : "Native wake lock is unavailable; use fallback keep-awake mode"
      }
      type="button"
    >
      {isActive ? <WakeLockActiveIcon /> : <WakeLockInactiveIcon />}
    </button>
  );
}
