/*
Purpose: renders the left support panel with compact feature and status blocks
Layer: frontend (player-web)
Uses: wallet actions, status state, and samsara meter
*/

"use client";

import type { SpinResult } from "@eye/game-engine";
import { useEffect, useRef, useState } from "react";
import { SamsaraMeter } from "@/components/board/samsara-meter";

type LeftSupportRailProps = {
  balance: string;
  currentBet: string;
  roundWin: number;
  cascades: number;
  freeSpins: number;
  activeBonusSpins: number;
  bonusActive: boolean;
  phaseMessage: string;
  meterRatio: number;
  meterCurrent: number;
  meterTarget: number;
  history: SpinResult[];
  soundEnabled: boolean;
  fullscreenEnabled: boolean;
  onDeposit: () => void;
  onWithdraw: () => void;
  onToggleSound: () => void;
  onToggleHistory: () => void;
  onToggleSettings: () => void;
  onToggleFullscreen: () => void;
};

const formatWin = (result: SpinResult) =>
  result.totalWin > 0
    ? `+${new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(result.totalWin)}`
    : "LOSS";

const MAX_RITUAL_LOG_ENTRIES = 100;
const DESKTOP_VISIBLE_ENTRIES = 5;
const COMPACT_VISIBLE_ENTRIES = 3;
const PORTRAIT_VISIBLE_ENTRIES = 10;
const HANDHELD_PORTRAIT_VISIBLE_ENTRIES = 11;

export function LeftSupportRail({
  balance,
  currentBet,
  roundWin,
  cascades,
  freeSpins,
  activeBonusSpins,
  bonusActive,
  phaseMessage,
  meterRatio,
  meterCurrent,
  meterTarget,
  history,
  soundEnabled,
  fullscreenEnabled,
  onDeposit,
  onWithdraw
  ,
  onToggleSound,
  onToggleHistory,
  onToggleSettings,
  onToggleFullscreen
}: LeftSupportRailProps) {
  const [compactView, setCompactView] = useState(false);
  const [portraitView, setPortraitView] = useState(false);
  const [handheldPortraitView, setHandheldPortraitView] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [mobileRoundStatusOpen, setMobileRoundStatusOpen] = useState(false);
  const [expandedHistoryMaxHeight, setExpandedHistoryMaxHeight] = useState<number | null>(null);
  const supportHistoryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1600px), (max-height: 900px)");
    const syncCompactView = () => setCompactView(mediaQuery.matches);

    syncCompactView();
    mediaQuery.addEventListener("change", syncCompactView);
    return () => mediaQuery.removeEventListener("change", syncCompactView);
  }, []);

  useEffect(() => {
    const portraitQuery = window.matchMedia("(orientation: portrait) and (max-aspect-ratio: 10/16)");
    const syncPortraitView = () => setPortraitView(portraitQuery.matches);

    syncPortraitView();
    portraitQuery.addEventListener("change", syncPortraitView);
    return () => portraitQuery.removeEventListener("change", syncPortraitView);
  }, []);

  useEffect(() => {
    const handheldPortraitQuery = window.matchMedia(
      "(orientation: portrait) and (max-aspect-ratio: 10/16) and (max-width: 11in)"
    );
    const syncHandheldPortraitView = () => setHandheldPortraitView(handheldPortraitQuery.matches);

    syncHandheldPortraitView();
    handheldPortraitQuery.addEventListener("change", syncHandheldPortraitView);
    return () => handheldPortraitQuery.removeEventListener("change", syncHandheldPortraitView);
  }, []);

  useEffect(() => {
    if (!handheldPortraitView) {
      setMobileRoundStatusOpen(false);
    }
  }, [handheldPortraitView]);

  const ritualEntries = history.slice(0, MAX_RITUAL_LOG_ENTRIES);
  const defaultVisibleEntries = handheldPortraitView
    ? HANDHELD_PORTRAIT_VISIBLE_ENTRIES
    : portraitView
      ? PORTRAIT_VISIBLE_ENTRIES
      : compactView
        ? COMPACT_VISIBLE_ENTRIES
        : DESKTOP_VISIBLE_ENTRIES;
  const visibleEntries = showMore ? ritualEntries : ritualEntries.slice(0, defaultVisibleEntries);
  const canToggleHistory = ritualEntries.length > defaultVisibleEntries;
  const historyToggleTitle = showMore
    ? `Collapse ritual log. ${phaseMessage}`
    : `Expand ritual log. ${phaseMessage}`;

  useEffect(() => {
    if (ritualEntries.length <= defaultVisibleEntries && showMore) {
      setShowMore(false);
    }
  }, [defaultVisibleEntries, ritualEntries.length, showMore]);

  useEffect(() => {
    if (!showMore) {
      setExpandedHistoryMaxHeight(null);
      return;
    }

    const updateExpandedHeight = () => {
      if (!supportHistoryRef.current) {
        return;
      }

      const { top } = supportHistoryRef.current.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const availableHeight = Math.max(120, Math.floor(viewportHeight - top - 12));
      setExpandedHistoryMaxHeight(availableHeight);
    };

    const frame = window.requestAnimationFrame(updateExpandedHeight);
    window.addEventListener("resize", updateExpandedHeight);
    window.addEventListener("orientationchange", updateExpandedHeight);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateExpandedHeight);
      window.removeEventListener("orientationchange", updateExpandedHeight);
    };
  }, [showMore, ritualEntries.length]);

  return (
    <aside
      className={`leftRail supportRail ${handheldPortraitView ? "is-handheld-portrait" : ""} ${mobileRoundStatusOpen ? "is-mobile-status-open" : ""}`}
    >
      <section className="compactPanel supportBlock treasuryBlock">
        <div className="panelHeader">
          <p className="eyebrow">Treasury</p>
        </div>
        <div className="supportActions">
          <button className="walletAction walletActionPrimary" onClick={onDeposit} type="button">
            Deposit
          </button>
          <button className="walletAction" onClick={onWithdraw} type="button">
            Withdraw
          </button>
        </div>
      </section>

      <section className="compactPanel supportBlock supportBalanceBlock">
        <div className="bottomBarZone balanceZone supportBalanceZone">
          <div className="bottomBarStat">
            <span>Balance</span>
            <strong>{balance}</strong>
          </div>
          <div className="bottomBarStat">
            <span>Bet</span>
            <strong>{currentBet}</strong>
          </div>
        </div>
      </section>

      <section
        className={`compactPanel supportBlock supportStatusBlock ${handheldPortraitView ? "is-handheld-hidden" : ""}`}
        title="Round status for the current resolved spin. Round shows the payout total, Cascade shows how many chained clears happened, and Spins shows bonus spins currently active."
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
              className="miniStat supportMiniStat"
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
        className="compactPanel supportBlock supportMeterBlock"
        title={
          bonusActive
            ? `${activeBonusSpins} bonus spins remain in Sky Opens.`
            : "Fill the Samsara meter to trigger Sky Opens bonus spins."
        }
      >
        <div className="panelHeader">
          <p className="eyebrow">Samsara</p>
        </div>
        <SamsaraMeter current={meterCurrent} meterRatio={meterRatio} target={meterTarget} />
      </section>

      <section
        className="compactPanel supportBlock supportHistoryBlock"
        title="Recent ritual outcomes. Shows the latest resolved rounds and whether they happened in base game or bonus mode."
      >
        <div className="panelHeader">
          <p className="eyebrow">Ritual Log</p>
          {canToggleHistory ? (
            <button
              className="supportToggle"
              onClick={() => setShowMore((current) => !current)}
              aria-expanded={showMore}
              aria-label={showMore ? "Collapse ritual log" : "Expand ritual log"}
              title={historyToggleTitle}
              type="button"
            >
              <svg aria-hidden="true" className="supportToggleIcon" viewBox="0 0 24 24">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          ) : null}
        </div>
        <p className="supportNote" title={phaseMessage}>{phaseMessage}</p>
        <div
          className={`supportHistory ${showMore ? "is-scrollable" : ""}`}
          ref={supportHistoryRef}
          style={
            showMore && expandedHistoryMaxHeight
              ? { maxHeight: `${expandedHistoryMaxHeight}px` }
              : undefined
          }
        >
          {history.length === 0 ? (
            <span className="supportMuted">No rounds yet.</span>
          ) : (
            visibleEntries.map((result, index) => (
              <div className="supportHistoryRow" key={`${result.roundSummary.roundId}-${index}`}>
                <strong>{formatWin(result)}</strong>
                <span>{result.mode === "bonus" ? "bonus" : "base"}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="supportRailUtilityBar">
        {handheldPortraitView && mobileRoundStatusOpen ? (
          <section
            className="compactPanel supportBlock supportStatusContextWindow"
            title="Round status for the current resolved spin. Round shows the payout total, Cascade shows how many chained clears happened, and Spins shows bonus spins currently active."
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
                  className="miniStat supportMiniStat"
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
        ) : null}

        <button
          aria-label="Menu"
          className="secondaryAction compactBottomAction iconOnlyAction supportRailUtilityButton"
          onClick={onToggleSettings}
          title="Menu"
          type="button"
        >
          <svg aria-hidden="true" className="utilityIcon" viewBox="0 0 24 24">
            <path d="M5 8h14" />
            <path d="M5 12h14" />
            <path d="M5 16h14" />
          </svg>
        </button>

        <button
          aria-label={soundEnabled ? "Mute sound" : "Unmute sound"}
          className="secondaryAction compactBottomAction iconOnlyAction supportRailUtilityButton"
          onClick={onToggleSound}
          title={soundEnabled ? "Mute" : "Unmute"}
          type="button"
        >
          {soundEnabled ? (
            <svg aria-hidden="true" className="utilityIcon" viewBox="0 0 24 24">
              <path d="M4 10h4l5-4v12l-5-4H4z" />
              <path d="M16.5 9a4 4 0 0 1 0 6" />
              <path d="M18.7 6.8a7 7 0 0 1 0 10.4" />
            </svg>
          ) : (
            <svg aria-hidden="true" className="utilityIcon" viewBox="0 0 24 24">
              <path d="M4 10h4l5-4v12l-5-4H4z" />
              <path d="M16 9l4 6" />
              <path d="M20 9l-4 6" />
            </svg>
          )}
        </button>

        <button
          aria-label="Info"
          className="secondaryAction compactBottomAction iconOnlyAction supportRailUtilityButton"
          onClick={() => {
            if (handheldPortraitView) {
              setMobileRoundStatusOpen((current) => !current);
              return;
            }

            onToggleHistory();
          }}
          title="Info"
          type="button"
        >
          <svg aria-hidden="true" className="utilityIcon" viewBox="0 0 24 24">
            <circle cx="12" cy="12" fill="none" r="8" />
            <path d="M12 10v5" />
            <path d="M11 15h2" />
            <circle cx="12" cy="7.4" fill="currentColor" r="1" stroke="none" />
          </svg>
        </button>

        <button
          aria-label={fullscreenEnabled ? "Exit fullscreen" : "Enter fullscreen"}
          className="secondaryAction compactBottomAction iconOnlyAction supportRailUtilityButton"
          onClick={onToggleFullscreen}
          title={fullscreenEnabled ? "Exit fullscreen" : "Enter fullscreen"}
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
