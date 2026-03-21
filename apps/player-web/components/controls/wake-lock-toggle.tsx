'use client';

import { useEffect, useState } from 'react';
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock';

/**
 * Renders a manual wake-lock toggle button.
 * On mobile/low-power devices where automatic wake lock may fail,
 * this lets the user explicitly keep the screen on during gameplay.
 */
export function WakeLockToggle() {
  const { requestWakeLock, releaseWakeLock, hasSupport } = useScreenWakeLock();
  const [isActive, setIsActive] = useState(false);

  const handleToggle = async () => {
    if (isActive) {
      await releaseWakeLock();
      setIsActive(false);
    } else {
      await requestWakeLock();
      setIsActive(true);
    }
  };

  // Only show button if wake lock is supported
  if (!hasSupport) {
    return null;
  }

  return (
    <button
      aria-label={isActive ? 'Screen stay-awake enabled' : 'Keep screen awake'}
      className={`dockSmallButton iconOnlyAction ${isActive ? 'is-active' : ''}`}
      onClick={handleToggle}
      title={isActive ? 'Stay-awake active: screen will not sleep' : 'Click to keep screen awake during gameplay'}
      type="button"
    >
      <svg aria-hidden="true" className="dockSmallIcon wakeLockIcon" viewBox="0 0 24 24">
        {/* Battery/Screen metaphor: a simple eye-like icon */}
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <path d="M12 12c-3 0-9 3-9 3s6 3 9 3 9-3 9-3-6-3-9-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
