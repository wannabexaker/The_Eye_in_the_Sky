/*
Purpose: renders the compact top HUD with live game stats and shell controls
Layer: frontend (player-web)
Uses: samsara-meter.tsx and the shared shell asset manifest
*/

import { shellAssets } from "../lib/asset-manifest";
import { SamsaraMeter } from "./samsara-meter";

type GameHeaderProps = {
  balance: string;
  currentBet: string;
  lastWin: string;
  mode: string;
  autospin: string;
  meterRatio: number;
  meterCurrent: number;
  meterTarget: number;
  soundEnabled: boolean;
  fullscreenEnabled: boolean;
  onDeposit: () => void;
  onWithdraw: () => void;
  onToggleSound: () => void;
  onToggleFullscreen: () => void;
};

export function GameHeader({
  balance,
  currentBet,
  lastWin,
  mode,
  autospin,
  meterRatio,
  meterCurrent,
  meterTarget,
  soundEnabled,
  fullscreenEnabled,
  onDeposit,
  onWithdraw,
  onToggleSound,
  onToggleFullscreen
}: GameHeaderProps) {
  return (
    <header className="topHud">
      <div className="logoChip logoChipHero hudGroup hudLogoGroup">
        <div
          aria-hidden="true"
          className="logoMark logoMarkHero"
          style={{ backgroundImage: `url(${shellAssets.logo})` }}
        />
        <span className="logoHeroTag">Sacred Surveillance</span>
      </div>

      <section className="hudGroup walletGroup">
        <article className="statChip balanceChip">
          <span>Balance</span>
          <strong>{balance}</strong>
        </article>
        <div className="walletActions">
          <button className="walletAction walletActionPrimary" onClick={onDeposit} type="button">
            Deposit
          </button>
          <button className="walletAction" onClick={onWithdraw} type="button">
            Withdraw
          </button>
        </div>
      </section>

      <section className="hudGroup statPairGroup">
        <article className="statChip">
          <span>Bet</span>
          <strong>{currentBet}</strong>
        </article>
        <article className="statChip">
          <span>Last Win</span>
          <strong>{lastWin}</strong>
        </article>
      </section>

      <section className="hudGroup statPairGroup">
        <article className="statChip">
          <span>Mode</span>
          <strong>{mode}</strong>
        </article>
        <article className="statChip">
          <span>Autospin</span>
          <strong>{autospin}</strong>
        </article>
      </section>

      <article className="meterChip hudGroup meterGroup">
        <div className="meterChipHeader">
          <span>Samsara</span>
          <strong>
            {meterCurrent}/{meterTarget}
          </strong>
        </div>
        <SamsaraMeter current={meterCurrent} meterRatio={meterRatio} target={meterTarget} />
      </article>

      <section className="hudGroup systemGroup">
        <button className="iconChip" onClick={onToggleFullscreen} type="button">
          <span>Frame</span>
          <strong>{fullscreenEnabled ? "Exit" : "Full"}</strong>
        </button>

        <button className="iconChip" onClick={onToggleSound} type="button">
          <span>Sound</span>
          <strong>{soundEnabled ? "On" : "Off"}</strong>
        </button>
      </section>
    </header>
  );
}
