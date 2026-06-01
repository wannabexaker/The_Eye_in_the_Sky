'use client';

import { useEffect, useRef, useState } from 'react';

interface WakeLockSentinel {
  release(): Promise<void>;
}

/**
 * Hook to keep the screen awake while the game is active.
 * Uses Screen Wake Lock API on modern browsers (requires user gesture on mobile).
 * Falls back to requestAnimationFrame for unsupported browsers.
 * Automatically releases when document becomes hidden (tab loses focus).
 * Reacquires when document becomes visible again.
 */
export function useScreenWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isAcquiredRef = useRef(false);
  const hasSupport = useRef(false);
  const [hasNativeSupport, setHasNativeSupport] = useState(false);
  const [manualToggleAvailable, setManualToggleAvailable] = useState(false);
  const [isAcquired, setIsAcquired] = useState(false);

  // Check if wake lock is supported
  useEffect(() => {
    const nav = navigator as any;
    hasSupport.current = !!(nav && nav.wakeLock);
    setHasNativeSupport(hasSupport.current);
    setManualToggleAvailable(true);
  }, []);

  const requestWakeLock = async () => {
    try {
      if (isAcquiredRef.current) {
        return;
      }

      const nav = navigator as any;
      if (nav && nav.wakeLock) {
        try {
          wakeLockRef.current = await nav.wakeLock.request('screen');
          isAcquiredRef.current = true;
          setIsAcquired(true);
          console.log('[useScreenWakeLock] Wake lock acquired');
        } catch (lockErr) {
          // Permission denied or user dismissed
          console.warn('[useScreenWakeLock] Wake lock request denied (may need user gesture):', lockErr);
          // Fall through to RAF fallback
          startRAFKeepalive();
        }
      } else {
        // No wake lock support: use RAF fallback
        startRAFKeepalive();
      }
    } catch (err) {
      console.warn('[useScreenWakeLock] Unexpected error:', err);
    }
  };

  const startRAFKeepalive = () => {
    if (isAcquiredRef.current) {
      return;
    }

    let lastTime = performance.now();
    const keepAlive = () => {
      const now = performance.now();
      // Throttle to avoid excessive redraws; just touch a DOM property every ~100ms
      if (now - lastTime > 100) {
        // Minimal DOM touch to signal activity
        const body = document.body;
        const x = body.scrollLeft;
        lastTime = now;
      }
    animationFrameRef.current = requestAnimationFrame(keepAlive);
    };
    keepAlive();
    isAcquiredRef.current = true;
    setIsAcquired(true);
    console.log('[useScreenWakeLock] Using requestAnimationFrame fallback');
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('[useScreenWakeLock] Wake lock released');
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isAcquiredRef.current = false;
      setIsAcquired(false);
    } catch (err) {
      console.warn('[useScreenWakeLock] Release error:', err);
    }
  };

  useEffect(() => {
    // Start RAF fallback immediately as a baseline
    startRAFKeepalive();

    // Try to request native wake lock once
    if (hasSupport.current) {
      // Delay the request slightly to let the browser settle
      const timer = setTimeout(() => {
        requestWakeLock();
      }, 500);
      return () => clearTimeout(timer);
    }

    return () => {};
  }, []);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        releaseWakeLock();
      } else {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    requestWakeLock,
    releaseWakeLock,
    isAcquired,
    hasSupport: hasNativeSupport,
    manualToggleAvailable
  };
}
