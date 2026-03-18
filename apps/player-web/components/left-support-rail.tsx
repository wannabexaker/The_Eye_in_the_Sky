/*
Purpose: renders the left support panel with compact feature and status blocks
Layer: frontend (player-web)
Uses: wallet actions, status state, and samsara meter
*/

"use client";

import type { SpinResult } from "@eye/game-engine";
import { useEffect, useState } from "react";
import { SamsaraMeter } from "./samsara-meter";

type LeftSupportRailProps = {
  currentBet: string;
  totalDeposited: string;
  totalWithdrawn: string;
  activeBonusSpins: number;
  bonusActive: boolean;
  phaseMessage: string;
  meterRatio: number;
  meterCurrent: number;
  meterTarget: number;
  history: SpinResult[];
  onDeposit: () => void;
  onWithdraw: () => void;
};

const formatWin = (result: SpinResult) =>
  result.totalWin > 0
    ? `+${new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(result.totalWin)}`
    : "LOSS";

const MAX_RITUAL_LOG_ENTRIES = 10;
const DESKTOP_VISIBLE_ENTRIES = 5;
const COMPACT_VISIBLE_ENTRIES = 3;

export function LeftSupportRail({
  currentBet,
  totalDeposited,
  totalWithdrawn,
  activeBonusSpins,
  bonusActive,
  phaseMessage,
  meterRatio,
  meterCurrent,
  meterTarget,
  history,
  onDeposit,
  onWithdraw
}: LeftSupportRailProps) {
  const [compactView, setCompactView] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1600px), (max-height: 900px)");
    const syncCompactView = () => setCompactView(mediaQuery.matches);

    syncCompactView();
    mediaQuery.addEventListener("change", syncCompactView);
    return () => mediaQuery.removeEventListener("change", syncCompactView);
  }, []);

  const ritualEntries = history.slice(0, MAX_RITUAL_LOG_ENTRIES);
  const defaultVisibleEntries = compactView ? COMPACT_VISIBLE_ENTRIES : DESKTOP_VISIBLE_ENTRIES;
  const visibleEntries = showMore ? ritualEntries : ritualEntries.slice(0, defaultVisibleEntries);
  const canToggleHistory = ritualEntries.length > defaultVisibleEntries;

  useEffect(() => {
    if (ritualEntries.length <= defaultVisibleEntries && showMore) {
      setShowMore(false);
    }
  }, [defaultVisibleEntries, ritualEntries.length, showMore]);

  return (
    <aside className="leftRail supportRail">
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
        <div className="treasuryTotals">
          <div className="treasuryTotalRow">
            <span>Deposited</span>
            <strong>{totalDeposited}</strong>
          </div>
          <div className="treasuryTotalRow">
            <span>Withdrawn</span>
            <strong>{totalWithdrawn}</strong>
          </div>
        </div>
      </section>

      <section className="compactPanel supportBlock">
        <div className="panelHeader">
          <p className="eyebrow">Bet Info</p>
        </div>
        <div className="supportSummary">
          <strong>{currentBet}</strong>
          <span>Current ritual stake</span>
        </div>
      </section>

      <section className="compactPanel supportBlock">
        <div className="panelHeader">
          <p className="eyebrow">Samsara</p>
        </div>
        <SamsaraMeter current={meterCurrent} meterRatio={meterRatio} target={meterTarget} />
        <p className="supportNote">
          {bonusActive ? `${activeBonusSpins} spins remain in Sky Opens.` : "Fill the meter to open the sky."}
        </p>
      </section>

      <section className="compactPanel supportBlock">
        <div className="panelHeader">
          <p className="eyebrow">Ritual Log</p>
          {canToggleHistory ? (
            <button
              className="supportToggle"
              onClick={() => setShowMore((current) => !current)}
              type="button"
            >
              {showMore ? "Less" : "More"}
            </button>
          ) : null}
        </div>
        <p className="supportNote">{phaseMessage}</p>
        <div className={`supportHistory ${showMore ? "is-scrollable" : ""}`}>
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
    </aside>
  );
}
