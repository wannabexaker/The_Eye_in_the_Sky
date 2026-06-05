/*
Purpose: composes the playable game shell and wallet flows
Layer: frontend (player-web)
Uses: slot hook, player store, Pixi board, and wallet modals
*/

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SymbolId } from "@eye/game-engine";
import type { AuthUserDto } from "@eye/shared-types";
import { AuthOverlay } from "@/components/auth/auth-overlay";
import { ChangePasswordModal } from "@/components/auth/change-password-modal";
import { PixiTempleBoard } from "@/components/board/pixi-temple-board";
import { ControlPanel } from "@/components/controls/control-panel";
import { WakeLockToggle } from "@/components/controls/wake-lock-toggle";
import { DebugPanel } from "@/components/debug/debug-panel";
import { ConstellationSupportRail } from "@/components/layout/constellation-support-rail";
import { ConstellationRightRail } from "@/components/layout/constellation-right-rail";
import { LeftSupportRail } from "@/components/layout/left-support-rail";
import { RightOperatorRail } from "@/components/layout/right-operator-rail";
import { DepositModal } from "@/components/modals/deposit-modal";
import { OverlayModal } from "@/components/modals/overlay-modal";
import { PaymentMethodsModal } from "@/components/modals/payment-methods-modal";
import { WelcomeOverlay } from "@/components/modals/welcome-overlay";
import { WithdrawModal } from "@/components/modals/withdraw-modal";
import { WinPresentationController } from "@/components/presentation/win-presentation-controller";
import { SessionAnalyticsOverlay } from "@/components/analytics/session-analytics-overlay";
import { useSlotMachine } from "@/hooks/gameplay/use-slot-machine";
import { useRuntimeGameConfig } from "@/hooks/use-runtime-game-config";
import { useScreenWakeLock } from "@/hooks/useScreenWakeLock";
import { useViewport } from "@/hooks/useViewport";
import {
  changePlayerPassword,
  claimPlayerWelcomeBonus,
  depositPlayerWallet,
  exchangePlatformToken,
  fetchAuthMode,
  fetchAuthSession,
  fetchPlayerBootstrap,
  forgotPlayerPassword,
  loginPlayer,
  logoutPlayer,
  PlayerApiError,
  persistPlayerRound,
  registerPlayer,
  resetPlayerPassword,
  withdrawPlayerWallet,
  type AuthModePublicConfig
} from "@/lib/api/player-api";
import {
  getOuroborosRingAsset,
  getShellAssetSources,
  getShellAssets,
  getSymbolAssetSources,
  selectRuntimeGraphicsQuality,
  type GraphicsQuality
} from "@/lib/assets/asset-manifest";
import { ensureGuestSession, loadGuestSession } from "@/lib/identity/guest-session";
import { initPlayerStoreCrossTabSync, usePlayerUiStore } from "@/lib/state/player-store";

const formatWalletRow = (
  amount: number,
  type: "deposit" | "withdrawal" | "bet" | "win" | "welcome_bonus",
  label: string
) => `${type === "withdrawal" || type === "bet" ? "-" : "+"}${amount} ${label}`;

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

const formatMoneyCompactEur = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);

const formatBalanceRoundedEur = (value: number) => `€${Math.round(value)}`;

const readEmbedMode = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("embed") === "1";
};

const symbolLabels: Record<string, string> = {
  ashen_sigil: "Ashen Sigil",
  broken_halo: "Broken Halo",
  ritual_dagger: "Ritual Dagger",
  sealed_scroll: "Sealed Scroll",
  seraphim_feather: "Seraphim Feather",
  burning_crown: "Burning Crown",
  ophidian_relic: "Ophidian Relic",
  celestial_gate: "Celestial Gate",
  seraphim_eye: "Seraphim Eye",
  samsara: "Samsara",
  ouroboros: "Ouroboros",
  panepoptis_ophthalmos: "Panepoptis Ophthalmos"
};

const graphicsQualityOptions: readonly GraphicsQuality[] = ["high", "low"];

const graphicsQualityLabels: Record<GraphicsQuality, string> = {
  high: "High",
  low: "Low"
};

type RuntimeGraphicsHints = {
  deviceMemory?: number;
  devicePixelRatio: number;
  viewportWidth: number;
};

const DEFAULT_RUNTIME_GRAPHICS_HINTS: RuntimeGraphicsHints = {
  devicePixelRatio: 1,
  viewportWidth: 0
};

const readRuntimeGraphicsHints = (): RuntimeGraphicsHints => {
  if (typeof window === "undefined") {
    return DEFAULT_RUNTIME_GRAPHICS_HINTS;
  }

  const nav = window.navigator as Navigator & { deviceMemory?: number };

  return {
    deviceMemory: nav.deviceMemory,
    devicePixelRatio: window.devicePixelRatio || 1,
    viewportWidth: Math.round(window.visualViewport?.width ?? window.innerWidth)
  };
};

export default function HomePage() {
  const allowSkipLogin = process.env.NODE_ENV !== "production";
  const shellRef = useRef<HTMLElement | null>(null);
  const depositPromptShownRef = useRef(false);
  const previousBonusModeRef = useRef(false);
  const bonusEnterTimerRef = useRef<number | null>(null);
  const bonusExitTimerRef = useRef<number | null>(null);
  const persistedRoundIdRef = useRef<string | null>(null);
  const [fullscreenEnabled, setFullscreenEnabled] = useState(false);
  const [embedMode, setEmbedMode] = useState(false);
  const [bonusEnterCinematic, setBonusEnterCinematic] = useState(false);
  const [bonusExitCinematic, setBonusExitCinematic] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authErrorCode, setAuthErrorCode] = useState<string | undefined>();
  const [authFieldErrors, setAuthFieldErrors] = useState<Record<string, string>>({});
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordBusy, setChangePasswordBusy] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<PlayerApiError | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUserDto | null>(null);
  const [authMode, setAuthMode] = useState<AuthModePublicConfig | null>(null);
  // True when mode is EXTERNAL_ONLY and platform exchange has failed — show blocked screen
  const [authModeBlocked, setAuthModeBlocked] = useState(false);

  // Keep screen awake while game is active
  const wakeLock = useScreenWakeLock();

  const clearAuthError = useCallback(() => {
    setAuthError("");
    setAuthErrorCode(undefined);
    setAuthFieldErrors({});
  }, []);

  const applyAuthError = useCallback((error: unknown, fallback: string) => {
    if (error instanceof PlayerApiError) {
      setAuthError(error.message);
      setAuthErrorCode(error.code);
      setAuthFieldErrors(error.fieldErrors);
      return;
    }

    setAuthError(error instanceof Error ? error.message : fallback);
    setAuthErrorCode(undefined);
    setAuthFieldErrors({});
  }, []);

  const {
    hasHydrated,
    debugPanelOpen,
    historyOpen,
    settingsOpen,
    depositOpen,
    withdrawOpen,
    paymentMethodsOpen,
    walletHistoryOpen,
    analyticsOpen,
    welcomeOpen,
    soundEnabled,
    graphicsQuality,
    autoContinueNeverStop,
    wallet,
    walletTransactions,
    roundsLog,
    runtimeMode,
    guestDisplayName,
    applyServerSnapshot,
    claimWelcomeBonus,
    completeDeposit,
    completeWithdrawal,
    enterSimulatorMode,
    exitSimulatorMode,
    setModal,
    toggleDebugPanel,
    toggleHistory,
    toggleSettings,
    toggleSound,
    toggleModal,
    setGraphicsQuality,
    setAutoContinueNeverStop,
    setGuestDisplayName,
    setAuthenticatedUserId,
    finishDepositProcessing,
    finishWithdrawalProcessing
  } = usePlayerUiStore();
  const { activeGameConfig, activeGameConfigProfile, usingRemoteConfig } = useRuntimeGameConfig();
  const slot = useSlotMachine(activeGameConfig);
  const viewport = useViewport();
  const [runtimeGraphicsHints, setRuntimeGraphicsHints] = useState<RuntimeGraphicsHints>(
    DEFAULT_RUNTIME_GRAPHICS_HINTS
  );
  const [runtimeGraphicsHintsReady, setRuntimeGraphicsHintsReady] = useState(false);
  const effectiveSymbolGraphicsQuality = useMemo(
    () =>
      runtimeGraphicsHintsReady
        ? selectRuntimeGraphicsQuality(graphicsQuality, {
            deviceMemory: runtimeGraphicsHints.deviceMemory,
            devicePixelRatio: runtimeGraphicsHints.devicePixelRatio,
            viewportWidth: runtimeGraphicsHints.viewportWidth
          })
        : "low",
    [
      graphicsQuality,
      runtimeGraphicsHints.deviceMemory,
      runtimeGraphicsHints.devicePixelRatio,
      runtimeGraphicsHints.viewportWidth,
      runtimeGraphicsHintsReady
    ]
  );
  const activeShellAssets = useMemo(
    () => getShellAssets(graphicsQuality),
    [graphicsQuality]
  );
  const activeShellAssetSources = useMemo(
    () => getShellAssetSources(graphicsQuality),
    [graphicsQuality]
  );
  const activeSymbolAssetSources = useMemo(
    () => getSymbolAssetSources(effectiveSymbolGraphicsQuality),
    [effectiveSymbolGraphicsQuality]
  );
  const ouroborosRingAsset = useMemo(
    () => getOuroborosRingAsset(graphicsQuality),
    [graphicsQuality]
  );
  const isSimulatorMode = runtimeMode === "simulator";
  const canUseServerPersistence = runtimeMode === "authenticated" && isAuthenticated;
  const canPlayWithoutAuth = isSimulatorMode || canUseServerPersistence;
  const presentationBlocked =
    slot.bonusEntryPending || slot.bonusAnnouncementLocked || slot.bonusSummaryLocked;
  const authBlocked = authLoading || !canPlayWithoutAuth;
  const inputAllowed = !authBlocked && !presentationBlocked;
  const spinInteractionAllowed = useMemo(
    () =>
      inputAllowed &&
      (slot.canSpin || Boolean(slot.bonusAnnouncement || slot.bonusSummary || slot.winPresentation)),
    [inputAllowed, slot.bonusAnnouncement, slot.bonusSummary, slot.canSpin, slot.winPresentation]
  );
  const sessionCardTitle = isSimulatorMode
    ? "Guest session. Wallet is stored only in this tab session."
    : authUser
      ? `Authenticated as ${authUser.displayName} (${authUser.email}). Wallet and round state are stored on PostgreSQL.`
    : "Login is required to restore PostgreSQL-backed wallet and round state.";

  useEffect(() => {
    const syncGraphicsHints = () => {
      setRuntimeGraphicsHints(readRuntimeGraphicsHints());
      setRuntimeGraphicsHintsReady(true);
    };

    syncGraphicsHints();
    window.addEventListener("resize", syncGraphicsHints);
    window.visualViewport?.addEventListener("resize", syncGraphicsHints);

    return () => {
      window.removeEventListener("resize", syncGraphicsHints);
      window.visualViewport?.removeEventListener("resize", syncGraphicsHints);
    };
  }, []);

  useEffect(() => {
    setAuthenticatedUserId(isAuthenticated && authUser ? authUser.id : null);
  }, [authUser, isAuthenticated, setAuthenticatedUserId]);

  const refreshServerBackedPlayerState = useCallback(async () => {
    const session = await fetchAuthSession();
    const authenticated = Boolean(session.authenticated && session.user);
    setIsAuthenticated(authenticated);
    clearAuthError();
    setAuthUser(session.user);

    if (!authenticated) {
      usePlayerUiStore.getState().resetSession();
      return;
    }

    const snapshot = await fetchPlayerBootstrap();
    applyServerSnapshot(snapshot);
    setAuthUser(snapshot.user);
  }, [applyServerSnapshot, clearAuthError]);

  const isConstellationVariant = activeGameConfig.variantId === "constellation_simple";
  const paytableThresholds = Array.from(
    new Set(activeGameConfig.paytable.flatMap((entry) => Object.keys(entry.payouts).map(Number)))
  ).sort((left, right) => left - right);
  const simpleScatterSummary =
    activeGameConfig.scatterRewards.length > 0
      ? activeGameConfig.scatterRewards
          .map((reward) => `${reward.count}+ -> ${reward.freeSpinsAwarded} spins`)
          .join(" | ")
      : `${activeGameConfig.bonusSpinsAwarded} Sky Opens free spins`;
  const bonusRuleRows = isConstellationVariant
    ? ([
        {
          label: "Board",
          value: `${activeGameConfig.rows} rows x ${activeGameConfig.cols} cols`
        },
        {
          label: "How wins pay",
          value: `${activeGameConfig.clusterThreshold}+ matching symbols anywhere on the board`
        },
        {
          label: "Pay bands",
          value: paytableThresholds.map((value) => `${value}+`).join(" / ")
        },
        {
          label: "Gravity",
          value:
            activeGameConfig.gravity === "top-down" ? "Top-down tumble refill" : activeGameConfig.gravity
        },
        {
          label: "Cascades",
          value: `Continue while a paying settle remains, up to ${activeGameConfig.maxCascadeSteps} steps`
        },
        {
          label: "Bonus trigger",
          value: "Samsara scatters pay separately and trigger Sky Opens on 4+"
        },
        {
          label: "Bonus award",
          value: simpleScatterSummary
        }
      ] as const)
    : ([
        {
          label: "Board",
          value: `${activeGameConfig.rows} rows x ${activeGameConfig.cols} cols`
        },
        {
          label: "How wins break",
          value: `${activeGameConfig.clusterThreshold}+ orthogonal cluster`
        },
        {
          label: "Gravity",
          value:
            activeGameConfig.gravity === "top-down" ? "Top-down symbol drop" : activeGameConfig.gravity
        },
        {
          label: "Cascades",
          value: `Continue while a paying win remains, up to ${activeGameConfig.maxCascadeSteps} steps`
        },
        {
          label: "Cascade ladder",
          value: activeGameConfig.cascadeMultiplierLadder.map((value) => `x${value}`).join(" -> ")
        },
        {
          label: "Bonus trigger",
          value: `${activeGameConfig.bonusMeterTarget} Samsara symbols fill the meter`
        },
        {
          label: "Bonus award",
          value: `${activeGameConfig.bonusSpinsAwarded} Sky Opens free spins`
        }
      ] as const);
  const specialSymbolRows: Array<{ symbol: SymbolId; effect: string }> = isConstellationVariant
    ? [
        {
          symbol: "seraphim_eye",
          effect:
            "Acts as the only active multiplier special. If a settle wins, all visible Eye values add together and apply once to that settle."
        },
        {
          symbol: "samsara",
          effect:
            "Pays separately as scatter. 4+ scatters trigger Sky Opens, with larger scatter counts awarding stronger start packages."
        }
      ]
    : [
        {
          symbol: "seraphim_eye",
          effect: "Converts 1-2 regular symbols into wilds. During bonus it can also add +1 sticky multiplier."
        },
        {
          symbol: "samsara",
          effect: "Each symbol adds +1 to the meter and collects the current bet into the bonus budget pool. Reaching the target opens Sky Opens."
        },
        {
          symbol: "ouroboros",
          effect: "During bonus, each hit adds +1 sticky multiplier up to the configured cap."
        },
        {
          symbol: "panepoptis_ophthalmos",
          effect: "Converts part of one random column into wilds. During bonus it also adds +1 sticky multiplier."
        }
      ];

  const board = slot.lastResult?.board ?? Array.from({ length: activeGameConfig.rows }, () =>
    Array.from({ length: activeGameConfig.cols }, () => "ashen_sigil")
  );

  const fullHistory = slot.history.slice(0, 10);
  const fullWalletHistory = walletTransactions.slice(0, 10);
  const latestRound = slot.lastResult;
  const bonusAnnouncementVisible = Boolean(slot.bonusAnnouncement);
  const bonusModeActive =
    Boolean(slot.gameState.bonusState) &&
    !slot.bonusEntryPending &&
    !bonusAnnouncementVisible;
  const needsDepositAttention =
    inputAllowed &&
    !bonusModeActive &&
    !slot.canSpin &&
    (slot.needsDepositPrompt || wallet.balance < slot.bet);
  const visibleBonusSpins = bonusModeActive ? slot.activeBonusSpins : 0;
  const bonusFrameActive = bonusModeActive;
  const boardFrameBackground = bonusFrameActive
    ? activeShellAssets.bonusOverlay
    : activeShellAssets.boardFrame;

  useEffect(() => {
    const syncEmbedMode = () => setEmbedMode(readEmbedMode());

    syncEmbedMode();
    window.addEventListener("popstate", syncEmbedMode);
    return () => window.removeEventListener("popstate", syncEmbedMode);
  }, []);

  useEffect(() => {
    const wasBonusModeActive = previousBonusModeRef.current;

    if (!wasBonusModeActive && bonusModeActive) {
      setBonusExitCinematic(false);
      setBonusEnterCinematic(true);

      if (bonusExitTimerRef.current !== null) {
        window.clearTimeout(bonusExitTimerRef.current);
        bonusExitTimerRef.current = null;
      }

      if (bonusEnterTimerRef.current !== null) {
        window.clearTimeout(bonusEnterTimerRef.current);
      }

      bonusEnterTimerRef.current = window.setTimeout(() => {
        setBonusEnterCinematic(false);
        bonusEnterTimerRef.current = null;
      }, 760);
    }

    if (wasBonusModeActive && !bonusModeActive) {
      setBonusEnterCinematic(false);
      setBonusExitCinematic(true);

      if (bonusEnterTimerRef.current !== null) {
        window.clearTimeout(bonusEnterTimerRef.current);
        bonusEnterTimerRef.current = null;
      }

      if (bonusExitTimerRef.current !== null) {
        window.clearTimeout(bonusExitTimerRef.current);
      }

      bonusExitTimerRef.current = window.setTimeout(() => {
        setBonusExitCinematic(false);
        bonusExitTimerRef.current = null;
      }, 680);
    }

    previousBonusModeRef.current = bonusModeActive;
  }, [bonusModeActive]);

  useEffect(() => {
    return () => {
      if (bonusEnterTimerRef.current !== null) {
        window.clearTimeout(bonusEnterTimerRef.current);
      }

      if (bonusExitTimerRef.current !== null) {
        window.clearTimeout(bonusExitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const disposeSync = initPlayerStoreCrossTabSync();
    return () => disposeSync();
  }, []);

  useEffect(() => {
    if (runtimeMode === "simulator") {
      if (!loadGuestSession()) {
        exitSimulatorMode();
        return;
      }

      setAuthLoading(false);
      setAuthBusy(false);
      clearAuthError();
      setIsAuthenticated(false);
      setAuthUser(null);
      setAuthModeBlocked(false);
      return;
    }

    let disposed = false;

    const bootstrapAuth = async () => {
      try {
        setAuthLoading(true);
        clearAuthError();
        setAuthModeBlocked(false);

        // Step 1: Fetch auth mode (non-fatal — defaults to INTERNAL_ONLY on failure)
        let mode: AuthModePublicConfig = { mode: "INTERNAL_ONLY", fallbackEnabled: false, mockModeEnabled: false };
        try {
          mode = await fetchAuthMode();
          if (!disposed) setAuthMode(mode);
        } catch {
          // API unreachable or mode endpoint not yet available — default to internal
        }

        // Step 2: Try existing session first (works regardless of mode)
        try {
          await refreshServerBackedPlayerState();
          // Session resolved — user is authenticated, nothing more to do
          return;
        } catch {
          // No active session — continue with mode-aware bootstrap
        }

        // Step 3: Mode-aware path for unauthenticated user
        if (mode.mode === "INTERNAL_ONLY") {
          // Show normal login overlay — nothing to auto-attempt
          if (!disposed) {
            setIsAuthenticated(false);
            setAuthUser(null);
          }
          return;
        }

        // EXTERNAL_ONLY or HYBRID: look for a platform assertion in the URL
        const params = typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
        const platformAssertion = params?.get("platform_assertion") ?? null;
        const handoffId = params?.get("handoff_id") ?? undefined;

        if (platformAssertion) {
          // Step 4a: Try platform token exchange
          try {
            const nonce = crypto.randomUUID();
            await exchangePlatformToken({
              platformAssertion,
              nonce,
              timestamp: Date.now(),
              handoffId
            });
            // Exchange succeeded — now load full session
            await refreshServerBackedPlayerState();
            // Clean the assertion from the URL so refresh doesn't re-submit it
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.delete("platform_assertion");
              url.searchParams.delete("handoff_id");
              window.history.replaceState({}, "", url.toString());
            }
          } catch (exchangeError) {
            if (disposed) return;
            const msg = exchangeError instanceof Error ? exchangeError.message : "Platform login failed.";
            if (mode.mode === "EXTERNAL_ONLY") {
              // Hard block - no fallback available
              setAuthModeBlocked(true);
              applyAuthError(exchangeError, msg);
              setIsAuthenticated(false);
              setAuthUser(null);
            } else {
              // HYBRID - fall back to internal login overlay
              applyAuthError(exchangeError, msg);
              setIsAuthenticated(false);
              setAuthUser(null);
            }
          }
        } else if (mode.mode === "EXTERNAL_ONLY") {
          // Step 4b: EXTERNAL_ONLY with no assertion in URL — show blocked screen
          if (!disposed) {
            setAuthModeBlocked(true);
            setIsAuthenticated(false);
            setAuthUser(null);
            applyAuthError(
              new Error("This game requires a platform launch link. Please return via the platform portal."),
              "This game requires a platform launch link. Please return via the platform portal."
            );
          }
        } else {
          // HYBRID with no assertion — fall through to login overlay
          if (!disposed) {
            setIsAuthenticated(false);
            setAuthUser(null);
          }
        }
      } catch (error) {
        if (!disposed) {
          setIsAuthenticated(false);
          setAuthUser(null);
          applyAuthError(error, "Authentication bootstrap failed.");
        }
      } finally {
        if (!disposed) {
          setAuthLoading(false);
        }
      }
    };

    void bootstrapAuth();

    return () => {
      disposed = true;
    };
  }, [applyAuthError, clearAuthError, exitSimulatorMode, refreshServerBackedPlayerState, runtimeMode]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreenEnabled(document.fullscreenElement === shellRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!allowSkipLogin && runtimeMode === "simulator") {
      exitSimulatorMode();
    }
  }, [allowSkipLogin, exitSimulatorMode, runtimeMode]);

  useEffect(() => {
    if (!hasHydrated || !canPlayWithoutAuth || !slot.needsDepositPrompt) {
      depositPromptShownRef.current = false;
      return;
    }

    if (welcomeOpen || depositOpen || depositPromptShownRef.current) {
      return;
    }

    setModal("depositOpen", true);
    depositPromptShownRef.current = true;
  }, [canPlayWithoutAuth, depositOpen, hasHydrated, setModal, slot.needsDepositPrompt, welcomeOpen]);

  useEffect(() => {
    if (!canUseServerPersistence || !slot.lastResult) {
      return;
    }

    const roundId = slot.lastResult.roundSummary.roundId;
    if (!roundId || persistedRoundIdRef.current === roundId) {
      return;
    }

    persistedRoundIdRef.current = roundId;

    void persistPlayerRound(activeGameConfigProfile.profileId, slot.lastResult)
      .then((snapshot) => {
        applyServerSnapshot(snapshot);
      })
      .catch((error) => {
        persistedRoundIdRef.current = null;
        console.warn(
          "[player] failed to persist round to API; local gameplay state is kept until next bootstrap.",
          error
        );
      });
  }, [activeGameConfigProfile.profileId, applyServerSnapshot, canUseServerPersistence, slot.lastResult]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Never intercept keyboard input when the user is typing in a form field.
      const tag = (event.target as HTMLElement)?.tagName;
      const isTypingInInput = tag === "INPUT" || tag === "TEXTAREA" || (event.target as HTMLElement)?.isContentEditable;
      if (isTypingInInput) {
        return;
      }

      if (authBlocked) {
        event.preventDefault();
        return;
      }

      if (slot.bonusEntryPending) {
        event.preventDefault();
        return;
      }

      const isSpaceHotkey = event.code === "Space" || event.key === " ";
      const isFastSpinHotkey = event.code === "KeyF" || event.key.toLowerCase() === "f";

      if (slot.bonusAnnouncement) {
        event.preventDefault();

        if (isFastSpinHotkey) {
          slot.requestBonusAnnouncementFastContinue();
        }

        return;
      }

      if (slot.bonusAnnouncementLocked || slot.bonusSummaryLocked) {
        event.preventDefault();
        return;
      }

      if (event.code === "Escape") {
        if (!slot.isAutospinActive && !slot.autospinStopRequested) {
          return;
        }

        event.preventDefault();
        slot.stopAutoSpin();
        return;
      }

      const wantsIncreaseBet =
        event.key === "+" ||
        (event.key === "=" && event.shiftKey) ||
        event.code === "NumpadAdd";
      const wantsDecreaseBet =
        event.key === "-" || event.code === "Minus" || event.code === "NumpadSubtract";

      if (wantsIncreaseBet) {
        event.preventDefault();
        slot.incrementBetByStep();
        return;
      }

      if (wantsDecreaseBet) {
        event.preventDefault();
        slot.decrementBetByStep();
        return;
      }

      if (!isSpaceHotkey && !isFastSpinHotkey) {
        return;
      }

      event.preventDefault();

      if (isSpaceHotkey && event.repeat) {
        return;
      }

      if (isSpaceHotkey) {
        if (slot.bonusSummary || slot.winPresentation) {
          return;
        }

        slot.spin();
        return;
      }

      if (slot.bonusSummary) {
        slot.dismissBonusSummary();
      }

      if (slot.winPresentation) {
        slot.dismissWinPresentation();
      }

      slot.spin();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    authBlocked,
    debugPanelOpen,
    depositOpen,
    historyOpen,
    paymentMethodsOpen,
    settingsOpen,
    slot,
    walletHistoryOpen,
    welcomeOpen,
    withdrawOpen
  ]);

  const toggleFullscreen = async () => {
    const element = shellRef.current;
    if (!element) {
      return;
    }

    try {
      // keep fullscreen scoped to the game shell
      if (document.fullscreenElement === element) {
        await document.exitFullscreen();
        return;
      }

      await element.requestFullscreen();
    } catch {
      // ignore browser/platform fullscreen rejections
    }
  };

  const handleLogin = useCallback(
    async (payload: { email: string; password: string }) => {
      setAuthBusy(true);
      clearAuthError();
      try {
        exitSimulatorMode();
        persistedRoundIdRef.current = null;
        await loginPlayer(payload);
        await refreshServerBackedPlayerState();
      } catch (error) {
        applyAuthError(error, "Login failed.");
        throw error;
      } finally {
        setAuthBusy(false);
        setAuthLoading(false);
      }
    },
    [applyAuthError, clearAuthError, exitSimulatorMode, refreshServerBackedPlayerState]
  );

  const handleRegister = useCallback(
    async (payload: { email: string; password: string; displayName: string }) => {
      setAuthBusy(true);
      clearAuthError();
      try {
        exitSimulatorMode();
        persistedRoundIdRef.current = null;
        await registerPlayer(payload);
        await refreshServerBackedPlayerState();
      } catch (error) {
        applyAuthError(error, "Registration failed.");
        throw error;
      } finally {
        setAuthBusy(false);
        setAuthLoading(false);
      }
    },
    [applyAuthError, clearAuthError, exitSimulatorMode, refreshServerBackedPlayerState]
  );

  const handleForgotPassword = useCallback(
    async (payload: { email: string }) => {
      setAuthBusy(true);
      clearAuthError();
      try {
        return await forgotPlayerPassword(payload);
      } catch (error) {
        applyAuthError(error, "Password reset request failed.");
        throw error;
      } finally {
        setAuthBusy(false);
        setAuthLoading(false);
      }
    },
    [applyAuthError, clearAuthError]
  );

  const handleResetPassword = useCallback(
    async (payload: { token: string; newPassword: string }) => {
      setAuthBusy(true);
      clearAuthError();
      try {
        await resetPlayerPassword(payload);
      } catch (error) {
        applyAuthError(error, "Password reset failed.");
        throw error;
      } finally {
        setAuthBusy(false);
        setAuthLoading(false);
      }
    },
    [applyAuthError, clearAuthError]
  );

  const handleSkipLogin = useCallback(() => {
    if (!allowSkipLogin) {
      return;
    }

    ensureGuestSession();
    persistedRoundIdRef.current = null;
    enterSimulatorMode();
    slot.reset();
    setAuthBusy(false);
    setAuthLoading(false);
    clearAuthError();
    setIsAuthenticated(false);
    setAuthUser(null);
  }, [allowSkipLogin, clearAuthError, enterSimulatorMode, slot]);

  const handleSwitchToLogin = useCallback(() => {
    persistedRoundIdRef.current = null;
    exitSimulatorMode();
    slot.reset();
    setAuthBusy(false);
    setAuthLoading(false);
    clearAuthError();
    setIsAuthenticated(false);
    setAuthUser(null);
  }, [clearAuthError, exitSimulatorMode, slot]);

  const handleLogout = useCallback(async () => {
    setAuthBusy(true);
    clearAuthError();

    try {
      await logoutPlayer();
    } catch (error) {
      applyAuthError(error, "Logout failed.");
    } finally {
      persistedRoundIdRef.current = null;
      slot.reset();
      setAuthUser(null);
      setIsAuthenticated(false);
      setAuthBusy(false);
      setAuthLoading(false);
    }
  }, [applyAuthError, clearAuthError, slot]);

  const handleChangePassword = useCallback(
    async (payload: { currentPassword: string; newPassword: string }) => {
      setChangePasswordBusy(true);
      setChangePasswordError(null);

      try {
        await changePlayerPassword(payload);
      } catch (error) {
        setChangePasswordError(
          error instanceof PlayerApiError
            ? error
            : new PlayerApiError(error instanceof Error ? error.message : "Password change failed.", 0)
        );
        throw error;
      } finally {
        setChangePasswordBusy(false);
      }
    },
    []
  );

  const handleRenameGuest = useCallback(() => {
    const nextName = window.prompt("Guest display name", guestDisplayName);
    if (nextName === null) {
      return;
    }

    setGuestDisplayName(nextName);
  }, [guestDisplayName, setGuestDisplayName]);

  const startWelcomeFlow = useCallback(async () => {
    if (isSimulatorMode) {
      claimWelcomeBonus();
      return;
    }

    setAuthBusy(true);
    clearAuthError();
    try {
      const snapshot = await claimPlayerWelcomeBonus();
      applyServerSnapshot(snapshot);
    } catch (error) {
      applyAuthError(error, "Welcome bonus claim failed.");
    } finally {
      setAuthBusy(false);
    }
  }, [applyAuthError, applyServerSnapshot, claimWelcomeBonus, clearAuthError, isSimulatorMode]);

  const handleConfirmDeposit = useCallback(
    async (amount: number) => {
      if (isSimulatorMode) {
        completeDeposit();
        return;
      }

      try {
        const snapshot = await depositPlayerWallet(amount, "Simulated Card");
        applyServerSnapshot(snapshot);
      } catch (error) {
        finishDepositProcessing("");
        throw error;
      }
    },
    [applyServerSnapshot, completeDeposit, finishDepositProcessing, isSimulatorMode]
  );

  const handleRequestWithdrawal = useCallback(
    async (amount: number, methodLabel?: string) => {
      if (isSimulatorMode) {
        const outcome = completeWithdrawal();
        if (!outcome.ok) {
          throw new Error(outcome.reason ?? "Withdrawal failed.");
        }
        return;
      }

      try {
        const snapshot = await withdrawPlayerWallet(amount, methodLabel);
        applyServerSnapshot(snapshot);
      } catch (error) {
        finishWithdrawalProcessing("");
        throw error;
      }
    },
    [applyServerSnapshot, completeWithdrawal, finishWithdrawalProcessing, isSimulatorMode]
  );

  const spinFromInputIntent = () => {
    if (!inputAllowed) {
      return;
    }

    if (slot.bonusEntryPending) {
      return;
    }

    if (slot.bonusAnnouncementLocked) {
      return;
    }

    if (slot.bonusSummaryLocked) {
      return;
    }

    if (slot.bonusAnnouncement) {
      return;
    }

    if (slot.bonusSummary) {
      slot.dismissBonusSummary();
    }

    if (slot.winPresentation) {
      slot.dismissWinPresentation();
    }

    slot.spin();
  };

  return (
    <main
      className={`slotViewport ${embedMode ? "is-embed-mode" : ""} ${fullscreenEnabled ? "is-fullscreen" : ""} ${bonusModeActive ? "is-bonus-active" : ""} ${bonusEnterCinematic ? "is-bonus-enter-cinematic" : ""} ${bonusExitCinematic ? "is-bonus-exit-cinematic" : ""} ${slot.bonusAnnouncement || slot.bonusSummary ? "is-bonus-entry" : ""} ${slot.winPresentation || slot.bonusSummary ? "is-win-presenting" : ""} ${slot.bonusAnnouncementLocked ? "is-bonus-announce-lock" : ""} ${isConstellationVariant ? "is-constellation-variant" : "is-main-cluster-variant"}`}
      data-embed={embedMode ? "1" : "0"}
      data-config-source={usingRemoteConfig ? "api" : "env"}
      data-deposit-attention={needsDepositAttention ? "1" : "0"}
      data-graphics-quality={graphicsQuality}
      data-symbol-graphics-quality={effectiveSymbolGraphicsQuality}
      data-math-profile={activeGameConfigProfile.profileId}
      data-orientation={viewport.orientation}
      data-viewport-band={viewport.band}
      ref={shellRef}
    >
      <div
        aria-hidden="true"
        className="slotBackdrop slotBackdropBase"
        style={{
          backgroundImage: `url(${activeShellAssets.mainBackground})`,
          opacity: bonusModeActive ? 0.28 : 0.82
        }}
      />
      <div
        aria-hidden="true"
        className="slotBackdrop slotBackdropBonus"
        style={{
          backgroundImage: `url(${activeShellAssets.bonusOverlay})`,
          opacity: bonusModeActive ? 0.82 : 0
        }}
      />

      <section
        className={`gameArea machineStage fluidShell ${isConstellationVariant ? "is-constellation-stage" : "is-main-cluster-stage"}`}
      >
        {isConstellationVariant ? (
          <ConstellationRightRail
            activeBonusSpins={visibleBonusSpins}
            bonusActive={bonusModeActive}
            shellAssetSources={activeShellAssetSources}
            shellAssets={activeShellAssets}
          />
        ) : (
          <RightOperatorRail
            activeBonusSpins={visibleBonusSpins}
            bonusActive={bonusModeActive}
            shellAssetSources={activeShellAssetSources}
            shellAssets={activeShellAssets}
            variantId={activeGameConfig.variantId}
          />
        )}

        <div className="centerStage">
          <div className="boardShell">
            <div aria-hidden="true" className="boardStageHalo" />
            <div className="boardFrame boardFrameMain">
              <div
                aria-hidden="true"
                className="boardArtFrame"
                style={{ backgroundImage: `url(${boardFrameBackground})` }}
              />

              {runtimeGraphicsHintsReady ? (
                <PixiTempleBoard
                  board={board}
                  bonusActive={bonusModeActive}
                  floatingTextFadeMs={slot.floatingTextFadeMs}
                  floatingTextHoldMs={slot.floatingTextHoldMs}
                  key={effectiveSymbolGraphicsQuality}
                  phaseMessage={slot.phaseMessage}
                  presentationTimings={slot.presentationTimings}
                  result={slot.lastResult}
                  spinPhase={slot.spinPhase}
                  symbolAssetSources={activeSymbolAssetSources}
                />
              ) : (
                <div aria-hidden="true" className="boardAssetLoading" />
              )}
            </div>
          </div>
        </div>

        {isConstellationVariant ? (
          <ConstellationSupportRail
            activeBonusSpins={visibleBonusSpins}
            balance={formatBalanceRoundedEur(wallet.balance)}
            balanceExact={formatMoneyCompactEur(wallet.balance)}
            bonusActive={bonusModeActive}
            cascades={latestRound?.cascades.length ?? 0}
            currentBet={formatMoneyCompactEur(slot.bet)}
            freeSpins={visibleBonusSpins}
            history={slot.history}
            onDeposit={() => toggleModal("depositOpen")}
            onToggleFullscreen={toggleFullscreen}
            onToggleHistory={toggleHistory}
            onToggleSettings={toggleSettings}
            onToggleSound={toggleSound}
            onWithdraw={() => toggleModal("withdrawOpen")}
            roundWin={latestRound?.totalWin ?? 0}
            scatterRewards={activeGameConfig.scatterRewards}
            symbolAssetSources={activeSymbolAssetSources}
            fullscreenEnabled={fullscreenEnabled}
            soundEnabled={soundEnabled}
          />
        ) : (
          <LeftSupportRail
            activeBonusSpins={visibleBonusSpins}
            balance={formatBalanceRoundedEur(wallet.balance)}
            balanceExact={formatMoneyCompactEur(wallet.balance)}
            bonusActive={bonusModeActive}
            cascades={latestRound?.cascades.length ?? 0}
            currentBet={formatMoneyCompactEur(slot.bet)}
            freeSpins={visibleBonusSpins}
            history={slot.history}
            meterCollected={slot.samsaraCollectedBets}
            meterContributionLog={slot.samsaraContributionLog}
            meterCurrent={slot.gameState.bonusMeter}
            meterEyeSrc={activeShellAssets.meterEye}
            meterRatio={slot.meterRatio}
            meterTarget={activeGameConfig.bonusMeterTarget}
            onDeposit={() => toggleModal("depositOpen")}
            onToggleFullscreen={toggleFullscreen}
            onToggleHistory={toggleHistory}
            onToggleSettings={toggleSettings}
            onToggleSound={toggleSound}
            onWithdraw={() => toggleModal("withdrawOpen")}
            roundWin={latestRound?.totalWin ?? 0}
            fullscreenEnabled={fullscreenEnabled}
            soundEnabled={soundEnabled}
          />
        )}

        <ControlPanel
          autospinCountInput={slot.autospinCountInput}
          autospinRemaining={slot.autospinRemaining}
          autospinStopRequested={slot.autospinStopRequested}
          autospinValidationMessage={slot.autospinValidationMessage}
          autoContinueNeverStop={autoContinueNeverStop}
          areBetControlsLocked={slot.areBetControlsLocked}
          betInput={slot.betInput}
          betRiskMessage={slot.betRiskMessage}
          betRiskTooltip={slot.betRiskTooltip}
          betValidationMessage={slot.betValidationMessage}
          betValidationTooltip={slot.betValidationTooltip}
          canSpin={spinInteractionAllowed}
          canStartAutospin={inputAllowed && slot.canStartAutospin}
          isAutospinActive={slot.isAutospinActive}
          ouroborosRingSrc={ouroborosRingAsset}
          onCommitBetInput={slot.applyManualBet}
          onCommitAutospinInput={slot.applyManualAutospinCount}
          onAutospinInputChange={slot.setAutospinCountInput}
          onBetInputChange={slot.setBetInput}
          onDecreaseBet={slot.decrementBetByStep}
          onIncreaseBet={slot.incrementBetByStep}
          onSpin={spinFromInputIntent}
          onSpinSpeedChange={slot.setSpinAnimationSpeed}
          onStartAutospin={slot.startAutoSpin}
          onStartAutospinInfinite={slot.startAutoSpinInfinite}
          onStopAutoSpin={slot.stopAutoSpin}
          onToggleAutoContinueNeverStop={() => setAutoContinueNeverStop(!autoContinueNeverStop)}
          spinAnimationSpeed={slot.spinAnimationSpeed}
          spinPhase={slot.spinPhase}
          spinPulseKey={slot.spinPulseKey}
          spinSpeedOptions={slot.spinSpeedOptions}
        />
      </section>

      {presentationBlocked || authLoading ? (
        <div aria-hidden="true" className="slotInputLockLayer" />
      ) : null}

      <OverlayModal onClose={toggleHistory} open={historyOpen} title="Round History">
        <div className="history overlayHistory">
          {fullHistory.length === 0 ? (
            <p className="emptyState">No rounds yet.</p>
          ) : (
            fullHistory.map((result, index) => (
              <article className="historyItem" key={`${result.totalWin}-${index}`}>
                <div>
                  <strong>
                    {result.totalWin > 0
                      ? `WIN ${formatMoney(result.totalWin)} | x${result.appliedWinMultiplier} | ${result.cascades.length} cascades`
                      : "LOSS"}
                  </strong>
                </div>
                <span>{result.mode}</span>
              </article>
            ))
          )}
        </div>
      </OverlayModal>

      <OverlayModal
        onClose={() => toggleModal("walletHistoryOpen")}
        open={walletHistoryOpen}
        title="Wallet History"
      >
        <div className="history overlayHistory">
          {fullWalletHistory.length === 0 ? (
            <p className="emptyState">No wallet transactions yet.</p>
          ) : (
            fullWalletHistory.map((transaction) => (
              <article className="historyItem" key={transaction.id}>
                <div>
                  <strong>
                    {formatWalletRow(transaction.amount, transaction.type, transaction.label)}
                  </strong>
                  <span>{transaction.method ?? "Simulation Wallet"}</span>
                </div>
                <span>{transaction.balanceAfter.toFixed(2)}</span>
              </article>
            ))
          )}
        </div>
      </OverlayModal>

      <OverlayModal onClose={toggleSettings} open={settingsOpen} title="Menu">
        <section className="modalSection menuSectionControls">
          <p className="eyebrow">Win Multiplier</p>
          <div className="chipRow">
            {slot.winMultiplierOptions.map((option) => (
              <button
                className={`controlChip ${slot.winMultiplier === option ? "is-active" : ""}`}
                key={option}
                onClick={() => slot.setWinMultiplier(option)}
                type="button"
              >
                x{option}
              </button>
            ))}
          </div>
        </section>

        <section className="modalSection menuSectionGraphics">
          <p className="eyebrow">Graphics</p>
          <div aria-label="Graphics quality" className="chipRow" role="group">
            {graphicsQualityOptions.map((quality) => (
              <button
                aria-pressed={graphicsQuality === quality}
                className={`controlChip ${graphicsQuality === quality ? "is-active" : ""}`}
                key={quality}
                onClick={() => setGraphicsQuality(quality)}
                type="button"
              >
                {graphicsQualityLabels[quality]}
              </button>
            ))}
          </div>
        </section>

        <section className="modalSection menuSectionSession">
          <p className="eyebrow">Session</p>
          <div className="menuSessionCard" title={sessionCardTitle}>
            <div className="menuSessionMeta">
              <strong>{isSimulatorMode ? guestDisplayName || "Guest" : authUser?.displayName ?? "Player Session"}</strong>
              <span>
                {isSimulatorMode
                  ? "Guest mode is active. Server writes are disabled and this tab owns the session."
                  : authUser
                    ? `${authUser.email} | Wallet, rounds, and bonus state are restored from PostgreSQL.`
                    : "Login is required for PostgreSQL-backed wallet and round restore."}
              </span>
            </div>
            <div className="menuSessionActions">
              {isSimulatorMode ? (
                <>
                  <button className="welcomeButton compactPrimary" onClick={handleRenameGuest} type="button">
                    Rename Guest
                  </button>
                  <button className="welcomeButton compactPrimary" onClick={handleSwitchToLogin} type="button">
                    Create Account
                  </button>
                </>
              ) : authUser ? (
                <>
                  <button
                    className="welcomeButton compactPrimary"
                    disabled={authBusy}
                    onClick={() => setChangePasswordOpen(true)}
                    type="button"
                  >
                    Change Password
                  </button>
                  <button
                    className="welcomeButton compactPrimary"
                    disabled={authBusy}
                    onClick={() => void handleLogout()}
                    type="button"
                  >
                    {authBusy ? "Signing Out..." : "Logout"}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <section className="modalSection menuSectionRules">
          <p className="eyebrow">{isConstellationVariant ? "Constellation Rules" : "Game Rules"}</p>
          <div className="menuRuleTable">
            {bonusRuleRows.map((row) => (
              <div className="menuRuleRow" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="modalSection menuSectionPaytable">
          <p className="eyebrow">{isConstellationVariant ? "Constellation Paytable" : "Paytable"}</p>
          <div className="paytableTableWrap">
            <table className="paytableTable">
              <thead>
                <tr>
                  <th scope="col">Symbol</th>
                  <th scope="col">{isConstellationVariant ? "Pays On" : "Breaks On"}</th>
                  {paytableThresholds.map((size) => (
                    <th key={`paytable-head-${size}`} scope="col">
                      {size}+
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeGameConfig.paytable.map((entry) => (
                  <tr key={entry.symbol}>
                    <th className="paytableSymbolCell" scope="row">
                      <img
                        alt=""
                        aria-hidden="true"
                        className="paytableSymbolIcon"
                        src={activeSymbolAssetSources[entry.symbol][0]}
                      />
                      <span>{symbolLabels[entry.symbol] ?? entry.symbol}</span>
                    </th>
                    <td>
                      {isConstellationVariant
                        ? `${activeGameConfig.clusterThreshold}+ anywhere`
                        : `${activeGameConfig.clusterThreshold}+ connected`}
                    </td>
                    {paytableThresholds.map((size) => {
                      const multiplier = entry.payouts[size];
                      return (
                        <td key={`${entry.symbol}-${size}`}>
                          {typeof multiplier === "number" ? formatMoney(slot.bet * multiplier) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="modalSection menuSectionAnalytics">
          <p className="eyebrow">Session Analytics</p>
          <p style={{ margin: "2px 0 10px", fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
            {roundsLog.length > 0
              ? `${roundsLog.length.toLocaleString()} rounds tracked. View RTP trend, win distribution, cascade histogram, and export CSV.`
              : "Play rounds to start tracking analytics."}
          </p>
          <button
            className="welcomeButton compactPrimary"
            onClick={() => {
              toggleSettings();
              toggleModal("analyticsOpen");
            }}
            type="button"
          >
            Open Session Analytics
          </button>
        </section>

        <section className="modalSection menuSectionWakeLock">
          <p className="eyebrow">Screen Wake Lock</p>
          <p style={{ margin: "2px 0 10px", fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
            Keep the screen awake during gameplay on supported devices.
          </p>
          <div className="chipRow">
            <WakeLockToggle {...wakeLock} />
          </div>
        </section>

        {isConstellationVariant ? (
          <section className="modalSection menuSectionVariant">
            <p className="eyebrow">Active Variant</p>
            <div className="menuVariantHero">
              <div className="menuVariantHeader">
                <img
                  alt=""
                  aria-hidden="true"
                  className="menuVariantIcon"
                  src={activeSymbolAssetSources.samsara[0]}
                />
                <div>
                  <strong>Constellation Simple</strong>
                  <span>Count-anywhere pays with scatter-led Sky Opens.</span>
                </div>
              </div>
              <div className="menuVariantPills">
                <span>Scatter Trigger</span>
                <span>Anywhere Pays</span>
                <span>Seraphim Eye Multipliers</span>
              </div>
            </div>
          </section>
        ) : null}

        <section className="modalSection menuSectionSymbols">
          <p className="eyebrow">
            {isConstellationVariant ? "Constellation Symbols & Bonus" : "Special Symbols & Bonus"}
          </p>
          <div className="symbolRuleTable">
            {specialSymbolRows.map((row) => (
              <article className="symbolRuleRow" key={row.symbol}>
                <div className="symbolRuleHeader">
                  <img
                    alt=""
                    aria-hidden="true"
                    className="symbolRuleIcon"
                    src={activeSymbolAssetSources[row.symbol][0]}
                  />
                  <strong>{symbolLabels[row.symbol] ?? row.symbol}</strong>
                </div>
                <p>{row.effect}</p>
              </article>
            ))}
            <article className="symbolRuleRow bonusRuleRow">
              <div className="symbolRuleHeader">
                <img
                  alt=""
                  aria-hidden="true"
                  className="symbolRuleIcon"
                  src={activeSymbolAssetSources.samsara[0]}
                />
                <strong>Sky Opens Bonus</strong>
              </div>
              <p>
                {isConstellationVariant
                  ? `Samsara scatters open Sky Opens on 4+, with ${simpleScatterSummary}. During Sky Opens, Seraphim Eye is the main value spike and can build rare high-total settle multipliers while keeping the same shell and board flow.`
                  : `Triggering the meter awards ${activeGameConfig.bonusSpinsAwarded} free spins. The collected Samsara pool becomes the bonus budget, split across the bonus and spent per spin. Ouroboros and Panepoptis can raise the sticky bonus multiplier up to x${activeGameConfig.maxBonusMultiplier}.`}
              </p>
            </article>
          </div>
        </section>
      </OverlayModal>

      <OverlayModal
        onClose={() => toggleModal("depositOpen")}
        open={depositOpen}
        title="Deposit Credits"
      >
        <DepositModal onConfirmDeposit={handleConfirmDeposit} />
      </OverlayModal>

      <OverlayModal
        onClose={() => toggleModal("withdrawOpen")}
        open={withdrawOpen}
        title="Withdraw Credits"
      >
        <WithdrawModal onRequestWithdrawal={handleRequestWithdrawal} />
      </OverlayModal>

      <OverlayModal
        onClose={() => toggleModal("paymentMethodsOpen")}
        open={paymentMethodsOpen}
        title="Payment Methods"
      >
        <PaymentMethodsModal />
      </OverlayModal>

      <OverlayModal
        onClose={() => toggleModal("analyticsOpen")}
        open={analyticsOpen}
        title="Session Analytics"
      >
        <SessionAnalyticsOverlay rounds={roundsLog} />
      </OverlayModal>

      <OverlayModal onClose={toggleDebugPanel} open={debugPanelOpen} title="Debug">
        <DebugPanel boardRules={slot.boardRules} result={slot.lastResult} visible />
      </OverlayModal>

      <WinPresentationController
        bonusAnnouncement={slot.bonusAnnouncement}
        bonusAnnouncementLocked={slot.bonusAnnouncementLocked}
        bonusSummary={slot.bonusSummary}
        bonusSummaryLocked={slot.bonusSummaryLocked}
        onDismissBonusAnnouncement={slot.dismissBonusAnnouncement}
        onDismissBonusSummary={slot.dismissBonusSummary}
        onDismissWinPresentation={slot.dismissWinPresentation}
        shellAssets={activeShellAssets}
        winPresentation={slot.winPresentation}
      />

      <WelcomeOverlay
        busy={authBusy}
        logoSrc={activeShellAssets.logo}
        onStart={startWelcomeFlow}
        open={hasHydrated && canPlayWithoutAuth && welcomeOpen}
      />
      <ChangePasswordModal
        busy={changePasswordBusy}
        error={changePasswordError}
        onClose={() => {
          setChangePasswordOpen(false);
          setChangePasswordError(null);
        }}
        onSubmit={handleChangePassword}
        open={changePasswordOpen}
      />
      {/* EXTERNAL_ONLY mode: platform exchange failed or no assertion - hard blocked */}
      {!authLoading && authModeBlocked ? (
        <div className="overlayBackdrop welcomeBackdrop" role="alertdialog" aria-label="Access blocked">
          <section className="overlayModal welcomeModal" style={{ textAlign: "center", padding: "2.5rem 2rem" }}>
            <div style={{ fontSize: "2.8rem", marginBottom: "0.75rem" }}>🔒</div>
            <h2 style={{ marginBottom: "0.5rem" }}>Platform Login Required</h2>
            <p style={{ opacity: 0.72, marginBottom: "1.25rem", lineHeight: 1.5 }}>
              {authError || "This game requires a valid platform launch link. Please return via the platform portal."}
            </p>
            <p style={{ opacity: 0.48, fontSize: "0.8rem" }}>
              If you believe this is an error, contact support with correlation ID: {Date.now().toString(36).toUpperCase()}
            </p>
          </section>
        </div>
      ) : null}
      {/* Internal login overlay — shown for INTERNAL_ONLY and HYBRID (when not blocked) */}
      {!authLoading && !authModeBlocked && !canPlayWithoutAuth && authMode?.mode !== "EXTERNAL_ONLY" ? (
        <AuthOverlay
          allowSkipLogin={allowSkipLogin}
          busy={authBusy}
          error={authError}
          errorCode={authErrorCode}
          fieldErrors={authFieldErrors}
          logoSrc={activeShellAssets.logo}
          onForgotPassword={handleForgotPassword}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onResetPassword={handleResetPassword}
          onSkipLogin={handleSkipLogin}
        />
      ) : null}
    </main>
  );
}
