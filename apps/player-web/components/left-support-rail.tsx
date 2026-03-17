/*
Purpose: renders the left support panel with compact feature and status blocks
Layer: frontend (player-web)
Uses: wallet actions, status state, and samsara meter
*/

import type { SpinResult } from "@eye/game-engine";
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
        </div>
        <p className="supportNote">{phaseMessage}</p>
        <div className="supportHistory">
          {history.length === 0 ? (
            <span className="supportMuted">No rounds yet.</span>
          ) : (
            history.slice(0, 3).map((result, index) => (
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
