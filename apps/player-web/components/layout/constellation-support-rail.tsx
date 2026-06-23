/*
Purpose: renders the constellation-simple left support rail with a dedicated compact trigger block
Layer: frontend (player-web)
Uses: wallet actions, status state, and scatter trigger summary
*/

"use client";

import type { SpinResult } from "@eye/game-engine";
import { useEffect, useRef, useState } from "react";
import { AudioControlPopover } from "@/components/audio/audio-control-popover";
import type { SymbolAssetSources } from "@/lib/assets/asset-manifest";
import { useViewport } from "@/hooks/useViewport";

type ConstellationSupportRailProps = {
  balance: string;
  balanceExact: string;
  currentBet: string;
  roundWin: number;
  cascades: number;
  freeSpins: number;
  activeBonusSpins: number;
  bonusActive: boolean;
  symbolAssetSources: SymbolAssetSources;
  scatterRewards: Array<{
    count: number;
    payoutMultiplier: number;
    freeSpinsAwarded: number;
  }>;
  history: SpinResult[];
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  fullscreenEnabled: boolean;
  showCreateAccount: boolean;
  onDeposit: () => void;
  onWithdraw: () => void;
  onCreateAccount: () => void;
  onToggleSound: () => void;
  onSetMusicVolume: (volume: number) => void;
  onSetSfxVolume: (volume: number) => void;
  onToggleInfo: () => void;
  onToggleSettings: () => void;
  onToggleFullscreen: () => void;
  onOpenAnalytics: () => void;
};

const formatWin = (result: SpinResult) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(result.totalWin);

const formatRitualPayout = (result: SpinResult) =>
  result.totalWin > 0 ? `+${formatWin(result)}` : "0.00";

const getRitualModeLabel = (result: SpinResult) =>
  result.mode === "bonus" ? "Sky Opens" : "Temple Watch";

const getRitualTooltip = (result: SpinResult) => {
  if (result.totalWin > 0) {
    return result.mode === "bonus"
      ? `+${formatWin(result)} · the Sky rewards the watch`
      : `+${formatWin(result)} · the Eye favors you`;
  }

  return result.mode === "bonus" ? "the Sky holds its gifts" : "the omen passes";
};

const MAX_RITUAL_LOG_ENTRIES = 100;
const MIN_VISIBLE_ENTRIES = 3;
const MAX_VISIBLE_ENTRIES = 5;
const FALLBACK_HISTORY_ROW_HEIGHT = 26;

export function ConstellationSupportRail({
  balance,
  balanceExact,
  currentBet,
  roundWin,
  cascades,
  freeSpins,
  activeBonusSpins,
  bonusActive,
  symbolAssetSources,
  scatterRewards,
  history,
  soundEnabled,
  musicVolume,
  sfxVolume,
  fullscreenEnabled,
  showCreateAccount,
  onDeposit,
  onWithdraw,
  onCreateAccount,
  onToggleSound,
  onSetMusicVolume,
  onSetSfxVolume,
  onToggleInfo,
  onToggleSettings,
  onToggleFullscreen,
  onOpenAnalytics
}: ConstellationSupportRailProps) {
  const [adaptiveVisibleEntries, setAdaptiveVisibleEntries] = useState(MIN_VISIBLE_ENTRIES);
  const supportHistoryRef = useRef<HTMLDivElement | null>(null);
  const viewport = useViewport();
  const portraitView =
    viewport.orientation === "portrait" && viewport.width / Math.max(viewport.height, 1) <= 10 / 16;
  const handheldPortraitView = portraitView && viewport.band === "phone";

  const ritualEntries = history.slice(0, MAX_RITUAL_LOG_ENTRIES);
  const visibleEntries = ritualEntries.slice(0, adaptiveVisibleEntries);

  const emotionVariant = bonusActive
    ? "bonus"
    : roundWin > 0 && cascades >= 2
      ? "surge"
      : roundWin > 0
        ? "win"
        : history.length > 0
          ? "loss"
          : "idle";

  const emotionLabel = bonusActive
    ? "Constellation Live"
    : roundWin > 0 && cascades >= 2
      ? "Star Chain"
      : roundWin > 0
        ? "Star Win"
        : history.length > 0
          ? "Drift"
          : "Ready";

  const emotionHint = bonusActive
    ? "Sky Opens is active."
    : roundWin > 0 && cascades >= 2
      ? "Cascades aligned."
      : roundWin > 0
        ? "Round paid out."
        : history.length > 0
          ? "No payout this round."
          : "Tap spin to start.";

  useEffect(() => {
    const historyElement = supportHistoryRef.current;

    if (!historyElement) {
      return;
    }

    let frame = 0;

    const updateVisibleEntries = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const rowElement = historyElement.querySelector<HTMLElement>(".supportHistoryRow");
        const historyStyles = window.getComputedStyle(historyElement);
        const rowGap = Number.parseFloat(historyStyles.rowGap || historyStyles.gap || "0") || 0;
        const rowHeight = rowElement?.getBoundingClientRect().height ?? FALLBACK_HISTORY_ROW_HEIGHT;
        const availableHeight = historyElement.getBoundingClientRect().height;
        const nextVisibleEntries = Math.min(
          MAX_VISIBLE_ENTRIES,
          Math.max(
            MIN_VISIBLE_ENTRIES,
            Math.floor((availableHeight + rowGap) / Math.max(1, rowHeight + rowGap))
          )
        );

        setAdaptiveVisibleEntries((current) => (
          current === nextVisibleEntries ? current : nextVisibleEntries
        ));
      });
    };

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateVisibleEntries);
    resizeObserver?.observe(historyElement);

    updateVisibleEntries();
    window.addEventListener("resize", updateVisibleEntries);
    window.addEventListener("orientationchange", updateVisibleEntries);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateVisibleEntries);
      window.removeEventListener("orientationchange", updateVisibleEntries);
      resizeObserver?.disconnect();
    };
  }, [ritualEntries.length]);

  return (
    <aside
      className={`leftRail supportRail constellationSupportRail ${handheldPortraitView ? "is-handheld-portrait" : ""}`}
    >
      <section
        className="compactPanel supportBlock treasuryBlock constellationTreasuryBlock"
        title="Treasury actions for your fake wallet balance."
      >
        <div className="panelHeader">
          <p className="eyebrow">Treasury</p>
        </div>
        <div className="supportActions">
          <button
            className="walletAction walletActionPrimary"
            onClick={onDeposit}
            title="Deposit credits into wallet"
            type="button"
          >
            Deposit
          </button>
          <button
            className="walletAction"
            onClick={onWithdraw}
            title="Withdraw credits from wallet"
            type="button"
          >
            Withdraw
          </button>
        </div>
      </section>

      <section
        className="compactPanel supportBlock supportBalanceBlock constellationBalanceBlock"
        title={`Current wallet and bet values. Balance: ${balanceExact}. Bet: ${currentBet}.`}
      >
        <div className="bottomBarZone balanceZone supportBalanceZone">
          <div className="bottomBarStat" title={`Wallet balance: ${balanceExact}`}>
            <span>Balance</span>
            <strong>{balance}</strong>
          </div>
          <div className="bottomBarStat" title={`Current bet: ${currentBet}`}>
            <span>Bet</span>
            <strong>{currentBet}</strong>
          </div>
        </div>
      </section>

      <section
        className={`compactPanel supportBlock supportStatusBlock constellationStatusBlock ${handheldPortraitView ? "is-handheld-hidden" : ""}`}
        title="Round status for the current resolved spin. Round shows the payout total, Cascade shows how many chained clears happened, and Spins shows active constellation spins."
      >
        <div className="panelHeader">
          <p className="eyebrow">Round Status</p>
        </div>
        <div className="supportStatusStrip">
          <div
            className="miniStat supportMiniStat supportMiniStatRound"
            title="Round total win from the latest resolved spin."
          >
            <span>Round</span>
            <strong>{roundWin.toFixed(2)}</strong>
          </div>
          <div className="supportStatusBottomRow">
            <div
              className="miniStat supportMiniStat supportMiniStatCascade"
              title="Cascade count from the latest resolved spin."
            >
              <span>Cascade</span>
              <strong>{cascades}</strong>
            </div>
            <div
              className="miniStat supportMiniStat"
              title="Bonus spins currently active or gained after bonus triggers."
            >
              <span>Spins</span>
              <strong>{freeSpins}</strong>
            </div>
          </div>
        </div>
      </section>

      <section
        className="compactPanel supportBlock constellationTriggerBlock"
        title={
          bonusActive
            ? `${activeBonusSpins} constellation spins remain active in Sky Opens.`
            : "4+ Samsara scatters open Sky Opens. Full reward details are in the menu."
        }
      >
        <div className="panelHeader">
          <p className="eyebrow">Samsara</p>
        </div>
        <div className="constellationTriggerLead">
          <img
            alt="Samsara"
            className="constellationTriggerIcon"
            src={symbolAssetSources.samsara[0]}
          />
          <span
            className={`constellationTriggerBadge ${bonusActive ? "is-live" : ""}`}
            title={
              bonusActive
                ? `${activeBonusSpins} constellation spins are live now.`
                : "4+ Samsara scatters open Sky Opens. See Menu for the full reward ladder."
            }
          >
            {bonusActive ? `${activeBonusSpins} live` : "4+ opens"}
          </span>
        </div>
        <div aria-hidden="true" className="constellationTriggerTrack">
          {scatterRewards.map((reward) => (
            <span className="constellationTriggerPip" key={`scatter-pip-${reward.count}`} />
          ))}
        </div>
        <div className="constellationTriggerRewards">
          {scatterRewards.map((reward) => (
            <div
              className="constellationTriggerReward"
              key={`scatter-reward-${reward.count}`}
              title={`${reward.count}+ Samsara scatters award ${reward.freeSpinsAwarded} free spins.`}
            >
              <strong>{reward.count}+</strong>
              <span>{reward.freeSpinsAwarded} FS</span>
            </div>
          ))}
        </div>
      </section>

      <section
        className="compactPanel supportBlock supportHistoryBlock constellationHistoryBlock"
        title="Recent constellation outcomes. Shows the latest resolved rounds and whether they happened in base game or bonus mode."
      >
        <div className="panelHeader supportHistoryHeader">
          <button
            aria-label="Open session analytics"
            className="supportHistoryHeaderButton"
            onClick={onOpenAnalytics}
            title="Open session analytics for the full round history"
            type="button"
          >
            <span className="eyebrow">Constellation Log</span>
            <span className="supportHistoryHeaderHint">Analytics</span>
            <svg aria-hidden="true" className="supportToggleIcon" viewBox="0 0 24 24">
              <path d="M5 19V10" />
              <path d="M12 19V5" />
              <path d="M19 19v-6" />
            </svg>
          </button>
        </div>
        <div className={`supportEmotion supportEmotion--${emotionVariant}`} title={emotionHint}>
          <span aria-hidden="true" className="supportEmotionPulse" />
          <strong>{emotionLabel}</strong>
          <span className="supportEmotionHint">{emotionHint}</span>
        </div>
        <div className="supportHistory" ref={supportHistoryRef}>
          {history.length === 0 ? (
            <span className="supportMuted" title="No resolved rounds in this session yet.">
              No rounds yet.
            </span>
          ) : (
            visibleEntries.map((result, index) => (
              <div
                className={`supportHistoryRow ${result.totalWin > 0 ? "is-win" : "is-loss"}`}
                key={`${result.roundSummary.roundId}-${index}`}
                title={getRitualTooltip(result)}
              >
                <span aria-hidden="true" className="supportHistoryDot" />
                <strong className="supportHistoryPayout">{formatRitualPayout(result)}</strong>
                <span className="supportHistoryMode">{getRitualModeLabel(result)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="supportRailUtilityBar constellationSupportUtilityBar">
        {showCreateAccount ? (
          <button
            aria-label="Create Account"
            className="walletAction walletActionPrimary supportRailAccountAction"
            onClick={onCreateAccount}
            title="Save your progress, wallet, and bonuses across devices."
            type="button"
          >
            <svg aria-hidden="true" className="supportRailAccountIcon" viewBox="0 0 24 24">
              <path d="M15 6.5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
              <path d="M3.5 21a7.5 7.5 0 0 1 15 0" />
              <path d="M19 8v6" />
              <path d="M16 11h6" />
            </svg>
            <span>Create Account</span>
          </button>
        ) : null}

        <button
          aria-label="Menu"
          className="secondaryAction compactBottomAction iconOnlyAction supportRailUtilityButton"
          onClick={onToggleSettings}
          title="Open settings menu"
          type="button"
        >
          <svg aria-hidden="true" className="utilityIcon" viewBox="0 0 24 24">
            <path d="M5 8h14" />
            <path d="M5 12h14" />
            <path d="M5 16h14" />
          </svg>
        </button>

        <button
          aria-label="Info"
          className="secondaryAction compactBottomAction iconOnlyAction supportRailUtilityButton"
          onClick={onToggleInfo}
          title="Open game rules, paytable, symbols, and FAQ"
          type="button"
        >
          <svg aria-hidden="true" className="utilityIcon" viewBox="0 0 24 24">
            <circle cx="12" cy="12" fill="none" r="8" />
            <path d="M12 10v5" />
            <path d="M11 15h2" />
            <circle cx="12" cy="7.4" fill="currentColor" r="1" stroke="none" />
          </svg>
        </button>

        <AudioControlPopover
          musicVolume={musicVolume}
          onSetMusicVolume={onSetMusicVolume}
          onSetSfxVolume={onSetSfxVolume}
          onToggleSound={onToggleSound}
          sfxVolume={sfxVolume}
          soundEnabled={soundEnabled}
        />

        <button
          aria-label={fullscreenEnabled ? "Exit fullscreen" : "Enter fullscreen"}
          className="secondaryAction compactBottomAction iconOnlyAction supportRailUtilityButton"
          onClick={onToggleFullscreen}
          title={fullscreenEnabled ? "Exit fullscreen mode" : "Enter fullscreen mode"}
          type="button"
        >
          {fullscreenEnabled ? (
            <svg aria-hidden="true" className="utilityIcon" viewBox="0 0 24 24">
              <path d="M9 5H5v4" />
              <path d="M15 5h4v4" />
              <path d="M9 19H5v-4" />
              <path d="M15 19h4v-4" />
            </svg>
          ) : (
            <svg aria-hidden="true" className="utilityIcon" viewBox="0 0 24 24">
              <path d="M9 5H5v4" />
              <path d="M5 5l5 5" />
              <path d="M15 5h4v4" />
              <path d="M19 5l-5 5" />
              <path d="M9 19H5v-4" />
              <path d="M5 19l5-5" />
              <path d="M15 19h4v-4" />
              <path d="M19 19l-5-5" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  );
}
