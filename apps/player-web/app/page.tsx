/*
Purpose: composes the playable game shell and wallet flows
Layer: frontend (player-web)
Uses: slot hook, player store, Pixi board, and wallet modals
*/

"use client";

import { defaultGameConfig } from "@eye/game-engine";
import { useEffect, useRef, useState } from "react";
import { PixiTempleBoard } from "@/components/board/pixi-temple-board";
import { StageStatusStrip } from "@/components/board/stage-status-strip";
import { ControlPanel } from "@/components/controls/control-panel";
import { DebugPanel } from "@/components/debug/debug-panel";
import { LeftSupportRail } from "@/components/layout/left-support-rail";
import { RightOperatorRail } from "@/components/layout/right-operator-rail";
import { DepositModal } from "@/components/modals/deposit-modal";
import { OverlayModal } from "@/components/modals/overlay-modal";
import { PaymentMethodsModal } from "@/components/modals/payment-methods-modal";
import { WelcomeOverlay } from "@/components/modals/welcome-overlay";
import { WithdrawModal } from "@/components/modals/withdraw-modal";
import { WinPresentationController } from "@/components/presentation/win-presentation-controller";
import { useSlotMachine } from "@/hooks/gameplay/use-slot-machine";
import { shellAssets } from "@/lib/assets/asset-manifest";
import { usePlayerUiStore } from "@/lib/state/player-store";

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
  const [fullscreenEnabled, setFullscreenEnabled] = useState(false);
  const {
    hasHydrated,
    debugPanelOpen,
    historyOpen,
    settingsOpen,
    depositOpen,
    withdrawOpen,
    paymentMethodsOpen,
    walletHistoryOpen,
    welcomeOpen,
    soundEnabled,
    autoContinueNeverStop,
    wallet,
    totalDeposited,
    totalWithdrawn,
    walletTransactions,
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

  const board = slot.lastResult?.board ?? Array.from({ length: defaultGameConfig.rows }, () =>
    Array.from({ length: defaultGameConfig.cols }, () => "ashen_sigil")
  );

  const fullHistory = slot.history.slice(0, 10);
  const fullWalletHistory = walletTransactions.slice(0, 10);
  const latestRound = slot.lastResult;

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
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isTypingTarget =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable;

      if (event.code === "Escape") {
        if (!slot.isAutospinActive && !slot.autospinStopRequested) {
          return;
        }

        event.preventDefault();
        slot.stopAutoSpin();
        return;
      }

      if (event.code !== "Space") {
        return;
      }

      if (isTypingTarget) {
        return;
      }

      const hasPresentationOverlay =
        Boolean(slot.bonusAnnouncement) ||
        Boolean(slot.bonusSummary) ||
        Boolean(slot.winPresentation);

      if (hasPresentationOverlay) {
        event.preventDefault();

        if (slot.bonusSummary) {
          slot.dismissBonusSummary();
          return;
        }

        if (slot.bonusAnnouncement) {
          slot.dismissBonusAnnouncement();
          return;
        }

        if (slot.winPresentation) {
          slot.dismissWinPresentation();
        }

        return;
      }

      if (
        welcomeOpen ||
        depositOpen ||
        withdrawOpen ||
        paymentMethodsOpen ||
        walletHistoryOpen ||
        historyOpen ||
        settingsOpen ||
        debugPanelOpen ||
        !slot.canSpin
      ) {
        return;
      }

      event.preventDefault();
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

  return (
    <main
      className={`slotViewport ${fullscreenEnabled ? "is-fullscreen" : ""} ${slot.bonusAnnouncement || slot.bonusSummary ? "is-bonus-entry" : ""} ${slot.winPresentation || slot.bonusSummary ? "is-win-presenting" : ""}`}
      ref={shellRef}
    >
      <div
        aria-hidden="true"
        className="slotBackdrop"
        style={{ backgroundImage: `url(${shellAssets.mainBackground})` }}
      />

      <section className="gameArea machineStage">
        <LeftSupportRail
          activeBonusSpins={slot.activeBonusSpins}
          bonusActive={Boolean(slot.gameState.bonusState)}
          currentBet={slot.headerStats[1]?.value ?? "0.00"}
          totalDeposited={totalDeposited.toFixed(2)}
          totalWithdrawn={totalWithdrawn.toFixed(2)}
          history={slot.history}
          meterCurrent={slot.gameState.bonusMeter}
          meterRatio={slot.meterRatio}
          meterTarget={defaultGameConfig.bonusMeterTarget}
          onDeposit={() => toggleModal("depositOpen")}
          onWithdraw={() => toggleModal("withdrawOpen")}
          phaseMessage={slot.phaseMessage}
        />

        <div className="centerStage">
          <StageStatusStrip
            bonusTotal={slot.gameState.bonusState?.totalBonusWin ?? null}
            cascades={latestRound?.cascades.length ?? 0}
            freeSpins={slot.activeBonusSpins}
            roundWin={latestRound?.totalWin ?? 0}
          />

          <div className="boardShell">
            <div aria-hidden="true" className="boardStageHalo" />
            <div className="boardFrame boardFrameMain">
              <div
                aria-hidden="true"
                className="boardArtFrame"
                style={{ backgroundImage: `url(${shellAssets.boardFrame})` }}
              />

              <div
                aria-hidden="true"
                className={`boardBonusArt ${slot.gameState.bonusState || slot.lastResult?.bonusTriggered ? "is-active" : ""}`}
                style={{ backgroundImage: `url(${shellAssets.bonusOverlay})` }}
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

      <div className="controlsDock bottomControlsDock">
        <ControlPanel
          autospinCountInput={slot.autospinCountInput}
          autospinRemaining={slot.autospinRemaining}
          autospinStopRequested={slot.autospinStopRequested}
          autospinValidationMessage={slot.autospinValidationMessage}
          autoContinueNeverStop={autoContinueNeverStop}
          areBetControlsLocked={slot.areBetControlsLocked}
          balance={wallet.balance}
          bet={slot.bet}
          betInput={slot.betInput}
          betRiskMessage={slot.betRiskMessage}
          betValidationMessage={slot.betValidationMessage}
          canSpin={slot.canSpin}
          canStartAutospin={slot.canStartAutospin}
          fullscreenEnabled={fullscreenEnabled}
          isAutospinActive={slot.isAutospinActive}
          onCommitBetInput={slot.applyManualBet}
          onCommitAutospinInput={slot.applyManualAutospinCount}
          onAutospinInputChange={slot.setAutospinCountInput}
          onBetInputChange={slot.setBetInput}
          onDecreaseBet={slot.decrementBetByStep}
          onIncreaseBet={slot.incrementBetByStep}
          onSpin={slot.spin}
          onStartAutospin={slot.startAutoSpin}
          onStopAutoSpin={slot.stopAutoSpin}
          onToggleFullscreen={toggleFullscreen}
          onToggleAutoContinueNeverStop={() => setAutoContinueNeverStop(!autoContinueNeverStop)}
          onToggleHistory={toggleHistory}
          onToggleSettings={toggleSettings}
          onToggleSound={toggleSound}
          soundEnabled={soundEnabled}
          spinPhase={slot.spinPhase}
          spinPulseKey={slot.spinPulseKey}
        />
      </div>

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
            {defaultGameConfig.paytable.map((entry) => (
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

      <OverlayModal onClose={toggleDebugPanel} open={debugPanelOpen} title="Debug">
        <DebugPanel boardRules={slot.boardRules} result={slot.lastResult} visible />
      </OverlayModal>

      <WinPresentationController
        bonusAnnouncement={slot.bonusAnnouncement}
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
