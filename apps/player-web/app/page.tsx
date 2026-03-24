/*
Purpose: composes the playable game shell and wallet flows
Layer: frontend (player-web)
Uses: slot hook, player store, Pixi board, and wallet modals
*/

"use client";

import { useEffect, useRef, useState } from "react";
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
import { useScreenWakeLock } from "@/hooks/useScreenWakeLock";
import { shellAssets } from "@/lib/assets/asset-manifest";
import { activeGameConfig } from "@/lib/game-config";
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
  celestial_gate: "Celestial Gate"
};

export default function HomePage() {
  const shellRef = useRef<HTMLElement | null>(null);
  const depositPromptShownRef = useRef(false);
  const previousBonusModeRef = useRef(false);
  const bonusEnterTimerRef = useRef<number | null>(null);
  const bonusExitTimerRef = useRef<number | null>(null);
  const [fullscreenEnabled, setFullscreenEnabled] = useState(false);
  const [bonusEnterCinematic, setBonusEnterCinematic] = useState(false);
  const [bonusExitCinematic, setBonusExitCinematic] = useState(false);

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
    claimWelcomeBonus,
    setModal,
    toggleDebugPanel,
    toggleHistory,
    toggleSettings,
    toggleSound,
    toggleModal,
    setAutoContinueNeverStop
  } = usePlayerUiStore();
  const slot = useSlotMachine();

  const board = slot.lastResult?.board ?? Array.from({ length: activeGameConfig.rows }, () =>
    Array.from({ length: activeGameConfig.cols }, () => "ashen_sigil")
  );

  const fullHistory = slot.history.slice(0, 10);
  const fullWalletHistory = walletTransactions.slice(0, 10);
  const latestRound = slot.lastResult;
  const bonusModeActive = Boolean(slot.gameState.bonusState);
  const bonusFrameActive = Boolean(slot.gameState.bonusState || slot.lastResult?.bonusTriggered);
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
    const handleFullscreenChange = () => {
      setFullscreenEnabled(document.fullscreenElement === shellRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!hasHydrated || !slot.needsDepositPrompt) {
      depositPromptShownRef.current = false;
      return;
    }

    if (welcomeOpen || depositOpen || depositPromptShownRef.current) {
      return;
    }

    setModal("depositOpen", true);
    depositPromptShownRef.current = true;
  }, [depositOpen, hasHydrated, setModal, slot.needsDepositPrompt, welcomeOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isSpaceHotkey = event.code === "Space" || event.key === " ";
      const isFastSpinHotkey = event.code === "KeyF" || event.key.toLowerCase() === "f";

      if (slot.bonusAnnouncement) {
        event.preventDefault();

        if (isFastSpinHotkey) {
          slot.requestBonusAnnouncementFastContinue();
        }

        return;
      }

      if (slot.bonusAnnouncementLocked) {
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

  const startWelcomeFlow = () => {
    claimWelcomeBonus();
  };

  const spinFromInputIntent = () => {
    if (slot.bonusAnnouncementLocked) {
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
          activeBonusSpins={slot.activeBonusSpins}
          balance={formatBalanceRoundedEur(wallet.balance)}
          balanceExact={formatMoneyCompactEur(wallet.balance)}
          bonusActive={Boolean(slot.gameState.bonusState)}
          cascades={latestRound?.cascades.length ?? 0}
          currentBet={formatMoneyCompactEur(slot.bet)}
          freeSpins={slot.activeBonusSpins}
          history={slot.history}
          meterCollected={slot.samsaraCollectedBets}
          meterContributionLog={slot.samsaraContributionLog}
          meterCurrent={slot.gameState.bonusMeter}
          meterRatio={slot.meterRatio}
          meterTarget={activeGameConfig.bonusMeterTarget}
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
                bonusActive={Boolean(slot.gameState.bonusState)}
                phaseMessage={slot.phaseMessage}
                result={slot.lastResult}
                spinPhase={slot.spinPhase}
              />
            </div>
          </div>
        </div>

        <RightOperatorRail
          activeBonusSpins={slot.activeBonusSpins}
          bonusActive={Boolean(slot.gameState.bonusState)}
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
        canSpin={slot.canSpin || Boolean(slot.bonusAnnouncement || slot.bonusSummary || slot.winPresentation)}
        canStartAutospin={slot.canStartAutospin}
        isAutospinActive={slot.isAutospinActive}
        onCommitBetInput={slot.applyManualBet}
        onCommitAutospinInput={slot.applyManualAutospinCount}
        onAutospinInputChange={slot.setAutospinCountInput}
        onBetInputChange={slot.setBetInput}
        onDecreaseBet={slot.decrementBetByStep}
        onIncreaseBet={slot.incrementBetByStep}
        onSpin={spinFromInputIntent}
        onStartAutospin={slot.startAutoSpin}
        onStartAutospinInfinite={slot.startAutoSpinInfinite}
        onStopAutoSpin={slot.stopAutoSpin}
        onToggleAutoContinueNeverStop={() => setAutoContinueNeverStop(!autoContinueNeverStop)}
        spinPhase={slot.spinPhase}
        spinPulseKey={slot.spinPulseKey}
      />

      {slot.bonusAnnouncementLocked ? (
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
        <section className="modalSection">
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

        <section className="modalSection">
          <p className="eyebrow">Board Rules</p>
          <ul className="statsList">
            {slot.boardRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className="modalSection">
          <p className="eyebrow">Paytable</p>
          <div className="paytableGrid">
            {activeGameConfig.paytable.map((entry) => (
              <article className="paytableCard" key={entry.symbol}>
                <strong>{symbolLabels[entry.symbol] ?? entry.symbol}</strong>
                <div className="paytableRows">
                  {Object.entries(entry.payouts).map(([size, multiplier]) => (
                    <div className="paytableRow" key={`${entry.symbol}-${size}`}>
                      <span>{size}+ cluster</span>
                      <span>{formatMoney(slot.bet * multiplier)}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="modalSection">
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

        <section className="modalSection">
          <p className="eyebrow">Screen Wake Lock</p>
          <p style={{ margin: "2px 0 10px", fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
            Keep the screen awake during gameplay on supported devices.
          </p>
          <div className="chipRow">
            <WakeLockToggle />
          </div>
        </section>

        <section className="modalSection">
          <p className="eyebrow">Special Symbols</p>
          <ul className="statsList">
            <li>Seraphim Eye: adds wilds and can boost the bonus multiplier.</li>
            <li>Samsara: fills the bonus meter. Reaching the target opens free spins.</li>
            <li>Ouroboros: increases the sticky bonus multiplier.</li>
            <li>Panepoptis Ophthalmos: converts part of a column into wilds.</li>
            <li>Cascades continue only while a paying win remains, capped at 12 steps.</li>
          </ul>
        </section>
      </OverlayModal>

      <OverlayModal
        onClose={() => toggleModal("depositOpen")}
        open={depositOpen}
        title="Deposit Credits"
      >
        <DepositModal />
      </OverlayModal>

      <OverlayModal
        onClose={() => toggleModal("withdrawOpen")}
        open={withdrawOpen}
        title="Withdraw Credits"
      >
        <WithdrawModal />
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
        onDismissBonusAnnouncement={slot.dismissBonusAnnouncement}
        onDismissBonusSummary={slot.dismissBonusSummary}
        onDismissWinPresentation={slot.dismissWinPresentation}
        winPresentation={slot.winPresentation}
      />

      <WelcomeOverlay onStart={startWelcomeFlow} open={hasHydrated && welcomeOpen} />
    </main>
  );
}
