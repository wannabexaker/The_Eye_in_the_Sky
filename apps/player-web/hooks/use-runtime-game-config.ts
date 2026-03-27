"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fallbackGameConfig,
  fallbackGameConfigProfile,
  fallbackRuntimeGameConfigState,
  fetchRuntimeGameConfigState,
  type RuntimeGameConfigProfile,
  type RuntimeGameConfigState
} from "@/lib/game-config";

const RUNTIME_CONFIG_POLL_MS = 10000;
const GAME_CONFIG_BACKOFF_THRESHOLD = 2;

export function useRuntimeGameConfig() {
  const [runtimeState, setRuntimeState] = useState<RuntimeGameConfigState>(
    fallbackRuntimeGameConfigState
  );
  const [loading, setLoading] = useState(true);
  const [usingRemoteConfig, setUsingRemoteConfig] = useState(false);
  const [pollingPaused, setPollingPaused] = useState(false);

  // useRef so failures never trigger re-creation of refreshRuntimeConfig
  const failureCountRef = useRef(0);

  const refreshRuntimeConfig = useCallback(async () => {
    try {
      const nextState = await fetchRuntimeGameConfigState();
      setRuntimeState((current) =>
        current.activeConfig.version === nextState.activeConfig.version &&
        current.activeProfileId === nextState.activeProfileId
          ? current
          : nextState
      );
      setUsingRemoteConfig(true);
      failureCountRef.current = 0;
      setPollingPaused(false);
    } catch {
      failureCountRef.current += 1;
      if (failureCountRef.current === 1) {
        // Single warning per offline event
        console.warn("Failed to fetch game config; using local fallback config.");
      }
      if (failureCountRef.current >= GAME_CONFIG_BACKOFF_THRESHOLD) {
        setPollingPaused(true);
      }
    } finally {
      setLoading(false);
    }
  }, []); // stable — no deps that change

  useEffect(() => {
    void refreshRuntimeConfig();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Reset backoff when user returns to tab
        failureCountRef.current = 0;
        setPollingPaused(false);
        void refreshRuntimeConfig();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (pollingPaused) {
      // Polling is suspended — only resume on visibility change
      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshRuntimeConfig();
      }
    }, RUNTIME_CONFIG_POLL_MS);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshRuntimeConfig, pollingPaused]);

  const activeGameConfigProfile: RuntimeGameConfigProfile = usingRemoteConfig
    ? {
        profileId: runtimeState.activeProfileId,
        profileLabel: runtimeState.activeProfileLabel,
        configVersion: runtimeState.activeConfig.version,
        isLegacy: runtimeState.isLegacy
      }
    : fallbackGameConfigProfile;

  return {
    activeGameConfig: usingRemoteConfig ? runtimeState.activeConfig : fallbackGameConfig,
    activeGameConfigProfile,
    loadingRuntimeConfig: loading,
    refreshRuntimeConfig,
    usingRemoteConfig
  };
}
