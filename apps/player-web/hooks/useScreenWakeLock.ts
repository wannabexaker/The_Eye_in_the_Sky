"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type WakeLockMode = "native" | "fallback" | null;

interface WakeLockSentinel {
  release(): Promise<void>;
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request(type: "screen"): Promise<WakeLockSentinel>;
  };
};

export type ScreenWakeLockControls = {
  requestWakeLock: () => Promise<void>;
  releaseWakeLock: () => Promise<void>;
  isAcquired: boolean;
  hasSupport: boolean;
  manualToggleAvailable: boolean;
  mode: WakeLockMode;
};

export function useScreenWakeLock(): ScreenWakeLockControls {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const modeRef = useRef<WakeLockMode>(null);
  const [mode, setMode] = useState<WakeLockMode>(null);
  const [hasSupport, setHasSupport] = useState(false);
  const [manualToggleAvailable, setManualToggleAvailable] = useState(false);

  const setActiveMode = useCallback((nextMode: WakeLockMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
  }, []);

  const stopRAFKeepalive = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const startRAFKeepalive = useCallback(() => {
    if (typeof window === "undefined" || animationFrameRef.current !== null) {
      return;
    }

    let lastTime = performance.now();
    const keepAlive = () => {
      const now = performance.now();
      if (now - lastTime > 100) {
        void document.body?.scrollLeft;
        lastTime = now;
      }
      animationFrameRef.current = requestAnimationFrame(keepAlive);
    };

    animationFrameRef.current = requestAnimationFrame(keepAlive);
    setActiveMode("fallback");
  }, [setActiveMode]);

  const requestWakeLock = useCallback(async () => {
    if (typeof window === "undefined" || document.hidden) {
      return;
    }

    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock) {
      startRAFKeepalive();
      return;
    }

    if (wakeLockRef.current) {
      setActiveMode("native");
      return;
    }

    try {
      const sentinel = await nav.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      stopRAFKeepalive();
      setActiveMode("native");
    } catch {
      startRAFKeepalive();
    }
  }, [setActiveMode, startRAFKeepalive, stopRAFKeepalive]);

  const releaseWakeLock = useCallback(async () => {
    const activeWakeLock = wakeLockRef.current;
    wakeLockRef.current = null;

    if (activeWakeLock) {
      try {
        await activeWakeLock.release();
      } catch {
        // Browser/platform releases can race with visibility changes.
      }
    }

    stopRAFKeepalive();
    setActiveMode(null);
  }, [setActiveMode, stopRAFKeepalive]);

  useEffect(() => {
    const nav = navigator as NavigatorWithWakeLock;
    const nativeSupport = Boolean(nav.wakeLock);
    setHasSupport(nativeSupport);
    setManualToggleAvailable(typeof window.requestAnimationFrame === "function");

    startRAFKeepalive();

    if (!nativeSupport) {
      return () => {
        void releaseWakeLock();
      };
    }

    const timer = window.setTimeout(() => {
      void requestWakeLock();
    }, 500);

    return () => {
      window.clearTimeout(timer);
      void releaseWakeLock();
    };
  }, [releaseWakeLock, requestWakeLock, startRAFKeepalive]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        void releaseWakeLock();
        return;
      }

      void requestWakeLock();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [releaseWakeLock, requestWakeLock]);

  return {
    requestWakeLock,
    releaseWakeLock,
    isAcquired: mode !== null,
    hasSupport,
    manualToggleAvailable,
    mode
  };
}
