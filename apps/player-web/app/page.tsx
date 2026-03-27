/*
Purpose: composes the playable game shell and wallet flows
Layer: frontend (player-web)
Uses: slot hook, player store, Pixi board, and wallet modals
*/

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SymbolId } from "@eye/game-engine";
import { AuthOverlay } from "@/components/auth/auth-overlay";
import { PixiTempleBoard } from "@/components/board/pixi-temple-board";
import { ControlPanel } from "@/components/controls/control-panel";
import { WakeLockToggle } from "@/components/controls/wake-lock-toggle";
import { DebugPanel } from "@/components/debug/debug-panel";
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
import {
  claimPlayerWelcomeBonus,
  depositPlayerWallet,
  fetchAuthSession,
  fetchPlayerBootstrap,
  loginPlayer,
  persistPlayerRound,
  registerPlayer,
  withdrawPlayerWallet
} from "@/lib/api/player-api";
import { shellAssets, symbolAssetSources } from "@/lib/assets/asset-manifest";
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

export default function HomePage() {
  const allowSkipLogin = process.env.NODE_ENV !== "production";
  const shellRef = useRef<HTMLElement | null>(null);
  const depositPromptShownRef = useRef(false);
  const previousBonusModeRef = useRef(false);
  const bonusEnterTimerRef = useRef<number | null>(null);
  const bonusExitTimerRef = useRef<number | null>(null);
  const persistedRoundIdRef = useRef<string | null>(null);
  const [fullscreenEnabled, setFullscreenEnabled] = useState(false);
  const [bonusEnterCinematic, setBonusEnterCinematic] = useState(false);
  const [bonusExitCinematic, setBonusExitCinematic] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Keep screen awake while game is active
  useScreenWakeLock();

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
    autoContinueNeverStop,
    wallet,
    walletTransactions,
    roundsLog,
    runtimeMode,
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
    setAutoContinueNeverStop,
    finishDepositProcessing,
    finishWithdrawalProcessing
  } = usePlayerUiStore();
  const { activeGameConfig, activeGameConfigProfile, usingRemoteConfig } = useRuntimeGameConfig();
  const slot = useSlotMachine(activeGameConfig);
  const isSimulatorMode = runtimeMode === "simulator";
  const canUseServerPersistence = runtimeMode === "authenticated" && isAuthenticated;
  const canPlayWithoutAuth = isSimulatorMode || canUseServerPersistence;

  const refreshServerBackedPlayerState = useCallback(async () => {
    const session = await fetchAuthSession();
    const authenticated = Boolean(session.authenticated && session.user);
    setIsAuthenticated(authenticated);
    setAuthError("");

    if (!authenticated) {
      return;
    }

    const snapshot = await fetchPlayerBootstrap();
    applyServerSnapshot(snapshot);
  }, [applyServerSnapshot]);

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
  const visibleBonusSpins = bonusModeActive ? slot.activeBonusSpins : 0;
  const bonusFrameActive = bonusModeActive;
  const boardFrameBackground = bonusFrameActive ? shellAssets.bonusOverlay : shellAssets.boardFrame;

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
      setAuthLoading(false);
      setAuthBusy(false);
      setAuthError("");
      setIsAuthenticated(false);
      return;
    }

    let disposed = false;

    const bootstrapAuth = async () => {
      try {
        setAuthLoading(true);
        setAuthError("");
        await refreshServerBackedPlayerState();
      } catch (error) {
        if (!disposed) {
          setIsAuthenticated(false);
          setAuthError(error instanceof Error ? error.message : "Authentication bootstrap failed.");
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
  }, [refreshServerBackedPlayerState, runtimeMode]);

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
      if (authLoading || !canPlayWithoutAuth) {
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
    authLoading,
    canPlayWithoutAuth,
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
      setAuthError("");
      try {
        exitSimulatorMode();
        await loginPlayer(payload);
        await refreshServerBackedPlayerState();
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : "Login failed.");
        throw error;
      } finally {
        setAuthBusy(false);
        setAuthLoading(false);
      }
    },
    [exitSimulatorMode, refreshServerBackedPlayerState]
  );

  const handleRegister = useCallback(
    async (payload: { email: string; password: string; displayName: string }) => {
      setAuthBusy(true);
      setAuthError("");
      try {
        exitSimulatorMode();
        await registerPlayer(payload);
        await refreshServerBackedPlayerState();
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : "Registration failed.");
        throw error;
      } finally {
        setAuthBusy(false);
        setAuthLoading(false);
      }
    },
    [exitSimulatorMode, refreshServerBackedPlayerState]
  );

  const handleSkipLogin = useCallback(() => {
    if (!allowSkipLogin) {
      return;
    }

    setAuthBusy(false);
    setAuthLoading(false);
    setAuthError("");
    setIsAuthenticated(false);
    enterSimulatorMode();
  }, [allowSkipLogin, enterSimulatorMode]);

  const startWelcomeFlow = useCallback(async () => {
    if (isSimulatorMode) {
      claimWelcomeBonus();
      return;
    }

    setAuthBusy(true);
    setAuthError("");
    try {
      const snapshot = await claimPlayerWelcomeBonus();
      applyServerSnapshot(snapshot);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Welcome bonus claim failed.");
    } finally {
      setAuthBusy(false);
    }
  }, [applyServerSnapshot, claimWelcomeBonus, isSimulatorMode]);

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
    if (authLoading || !canPlayWithoutAuth) {
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
      className={`slotViewport ${fullscreenEnabled ? "is-fullscreen" : ""} ${bonusModeActive ? "is-bonus-active" : ""} ${bonusEnterCinematic ? "is-bonus-enter-cinematic" : ""} ${bonusExitCinematic ? "is-bonus-exit-cinematic" : ""} ${slot.bonusAnnouncement || slot.bonusSummary ? "is-bonus-entry" : ""} ${slot.winPresentation || slot.bonusSummary ? "is-win-presenting" : ""} ${slot.bonusAnnouncementLocked ? "is-bonus-announce-lock" : ""}`}
      data-config-source={usingRemoteConfig ? "api" : "env"}
      data-math-profile={activeGameConfigProfile.profileId}
      ref={shellRef}
    >
      <div
        aria-hidden="true"
        className="slotBackdrop slotBackdropBase"
        style={{
          backgroundImage: `url(${shellAssets.mainBackground})`,
          opacity: bonusModeActive ? 0.28 : 0.82
        }}
      />
      <div
        aria-hidden="true"
        className="slotBackdrop slotBackdropBonus"
        style={{
          backgroundImage: `url(${shellAssets.bonusOverlay})`,
          opacity: bonusModeActive ? 0.82 : 0
        }}
      />

      <section className="gameArea machineStage">
        <LeftSupportRail
          activeBonusSpins={visibleBonusSpins}
          balance={formatBalanceRoundedEur(wallet.balance)}
          balanceExact={formatMoneyCompactEur(wallet.balance)}
          bonusTriggerMode={activeGameConfig.bonusTriggerMode}
          bonusActive={bonusModeActive}
          cascades={latestRound?.cascades.length ?? 0}
          currentBet={formatMoneyCompactEur(slot.bet)}
          freeSpins={visibleBonusSpins}
          history={slot.history}
          meterCollected={slot.samsaraCollectedBets}
          meterContributionLog={slot.samsaraContributionLog}
          meterCurrent={slot.gameState.bonusMeter}
          meterRatio={slot.meterRatio}
          meterTarget={activeGameConfig.bonusMeterTarget}
          scatterRewards={activeGameConfig.scatterRewards}
          onDeposit={() => toggleModal("depositOpen")}
          onToggleFullscreen={toggleFullscreen}
          onToggleHistory={toggleHistory}
          onToggleSettings={toggleSettings}
          onToggleSound={toggleSound}
          onWithdraw={() => toggleModal("withdrawOpen")}
          phaseMessage={slot.phaseMessage}
          roundWin={latestRound?.totalWin ?? 0}
          fullscreenEnabled={fullscreenEnabled}
          soundEnabled={soundEnabled}
        />

        <div className="centerStage">
          <div className="boardShell">
            <div aria-hidden="true" className="boardStageHalo" />
            <div className="boardFrame boardFrameMain">
              <div
                aria-hidden="true"
                className="boardArtFrame"
                style={{ backgroundImage: `url(${boardFrameBackground})` }}
              />

              <PixiTempleBoard
                board={board}
                bonusActive={bonusModeActive}
                floatingTextFadeMs={slot.floatingTextFadeMs}
                floatingTextHoldMs={slot.floatingTextHoldMs}
                phaseMessage={slot.phaseMessage}
                presentationTimings={slot.presentationTimings}
                result={slot.lastResult}
                spinPhase={slot.spinPhase}
              />
            </div>
          </div>
        </div>

        <RightOperatorRail
          activeBonusSpins={visibleBonusSpins}
          bonusActive={bonusModeActive}
          variantId={activeGameConfig.variantId}
        />
      </section>

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
        canSpin={
          canPlayWithoutAuth &&
          (slot.canSpin || Boolean(slot.bonusAnnouncement || slot.bonusSummary || slot.winPresentation))
        }
        canStartAutospin={slot.canStartAutospin}
        isAutospinActive={slot.isAutospinActive}
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

      {slot.bonusAnnouncementLocked || slot.bonusSummaryLocked || authLoading ? (
        <div aria-hidden="true" className="slotInputLockLayer" />
      ) : null}

      {isSimulatorMode ? (
        <div className="runtimeModeBadge">
          <span className="eyebrow">Local Simulator</span>
          <strong>No SQL save</strong>
          <button className="controlChip subtle" onClick={exitSimulatorMode} type="button">
            Use Login
          </button>
        </div>
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
                        src={symbolAssetSources[entry.symbol][0]}
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
            <WakeLockToggle />
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
                  src={symbolAssetSources.samsara[0]}
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
                    src={symbolAssetSources[row.symbol][0]}
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
                  src={symbolAssetSources.samsara[0]}
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
        winPresentation={slot.winPresentation}
      />

      <WelcomeOverlay
        busy={authBusy}
        onStart={startWelcomeFlow}
        open={hasHydrated && canPlayWithoutAuth && welcomeOpen}
      />
      {!authLoading && !canPlayWithoutAuth ? (
        <AuthOverlay
          allowSkipLogin={allowSkipLogin}
          busy={authBusy}
          error={authError}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onSkipLogin={handleSkipLogin}
        />
      ) : null}
    </main>
  );
}
