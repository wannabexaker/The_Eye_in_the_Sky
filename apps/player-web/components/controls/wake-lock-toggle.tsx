"use client";

import type { ScreenWakeLockControls } from "@/hooks/useScreenWakeLock";

type WakeLockToggleProps = ScreenWakeLockControls;

const InactiveIcon = () => (
  <svg aria-hidden="true" className="dockSmallIcon wakeLockIcon" viewBox="0 0 24 24">
    <rect fill="none" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.7" width="16" x="4" y="6" />
    <path d="M8 10h8M8 14h5M19 10h1.5v5H19" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
  </svg>
);

const ActiveIcon = () => (
  <svg aria-hidden="true" className="dockSmallIcon wakeLockIcon" viewBox="0 0 24 24">
    <rect fill="none" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.7" width="16" x="4" y="6" />
    <path d="M9 13.2l2 2.1L16 9.8M19 10h1.5v5H19" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
  </svg>
);

export function WakeLockToggle({
  hasSupport,
  isAcquired,
  manualToggleAvailable,
  mode,
  releaseWakeLock,
  requestWakeLock
}: WakeLockToggleProps) {
  if (!manualToggleAvailable) {
    return null;
  }

  const label = isAcquired
    ? `Screen stay-awake enabled${mode === "fallback" ? " with fallback" : ""}`
    : hasSupport
      ? "Keep screen awake"
      : "Keep screen awake with fallback";

  const handleToggle = async () => {
    if (isAcquired) {
      await releaseWakeLock();
      return;
    }

    await requestWakeLock();
  };

  return (
    <button
      aria-label={label}
      aria-pressed={isAcquired}
      className={`dockSmallButton iconOnlyAction ${isAcquired ? "is-active" : ""}`}
      onClick={() => void handleToggle()}
      title={label}
      type="button"
    >
      {isAcquired ? <ActiveIcon /> : <InactiveIcon />}
    </button>
  );
}
