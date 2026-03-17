/*
Purpose: renders the professional bottom gameplay control bar
Layer: frontend (player-web)
Uses: slot wallet/bet/autoplay state and spin-button.tsx
*/

import type { SpinPhase } from "../lib/presentation/spin-state-machine";
import { SpinButton } from "./spin-button";

type ControlPanelProps = {
  balance: number;
  bet: number;
  betInput: string;
  betRiskMessage: string;
  betValidationMessage: string;
  areBetControlsLocked: boolean;
  requestedAutospinCount: number;
  autospinCountInput: string;
  autospinValidationMessage: string;
  isAutospinActive: boolean;
  autospinStopRequested: boolean;
  canSpin: boolean;
  canStartAutospin: boolean;
  soundEnabled: boolean;
  fullscreenEnabled: boolean;
  spinPhase: SpinPhase;
  spinPulseKey: number;
  onBetInputChange: (value: string) => void;
  onCommitBetInput: () => boolean;
  onIncreaseBet: () => boolean;
  onDecreaseBet: () => boolean;
  onAutospinInputChange: (value: string) => void;
  onCommitAutospinInput: () => number | null;
  onSpin: () => void;
  onStartAutospin: () => void;
  onStopAutoSpin: () => void;
  onToggleSound: () => void;
  onToggleFullscreen: () => void;
  onToggleHistory: () => void;
  onToggleSettings: () => void;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export function ControlPanel({
  balance,
  bet,
  betInput,
  betRiskMessage,
  betValidationMessage,
  areBetControlsLocked,
  requestedAutospinCount,
  autospinCountInput,
  autospinValidationMessage,
  isAutospinActive,
  autospinStopRequested,
  canSpin,
  canStartAutospin,
  soundEnabled,
  fullscreenEnabled,
  spinPhase,
  spinPulseKey,
  onBetInputChange,
  onCommitBetInput,
  onIncreaseBet,
  onDecreaseBet,
  onAutospinInputChange,
  onCommitAutospinInput,
  onSpin,
  onStartAutospin,
  onStopAutoSpin,
  onToggleSound,
  onToggleFullscreen,
  onToggleHistory,
  onToggleSettings
}: ControlPanelProps) {
  return (
    <footer className="controlBar machineBottomBar">
      <div className="bottomBarZone utilityZone">
        <button
          aria-label={soundEnabled ? "Mute sound" : "Unmute sound"}
          className="secondaryAction compactBottomAction iconOnlyAction utilityButtonSound"
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
          className="secondaryAction compactBottomAction iconOnlyAction utilityButtonInfo"
          onClick={onToggleHistory}
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
          aria-label="Menu"
          className="secondaryAction compactBottomAction iconOnlyAction utilityButtonMenu"
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
          aria-label={fullscreenEnabled ? "Exit fullscreen" : "Enter fullscreen"}
          className="secondaryAction compactBottomAction iconOnlyAction utilityButtonFullscreen"
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

      <div className="bottomBarZone balanceZone">
        <div className="bottomBarStat">
          <span>Balance</span>
          <strong>{formatMoney(balance)}</strong>
        </div>
        <div className="bottomBarStat">
          <span>Bet</span>
          <strong>{formatMoney(bet)}</strong>
        </div>
      </div>

      <div className="bottomBarZone spinZone">
        <div className="spinAnchor">
          <SpinButton
            disabled={!canSpin}
            onClick={onSpin}
            pulseKey={spinPulseKey}
            spinPhase={spinPhase}
          />
        </div>
      </div>

      <div className="bottomBarZone betAdjustZone">
        <div className="betAdjustControls">
          <button
            className="controlChip compactChip"
            disabled={areBetControlsLocked}
            onClick={onDecreaseBet}
            type="button"
          >
            -
          </button>
          <input
            aria-label="Bet amount"
            className="controlInput bottomBarInput betAmountInput"
            disabled={areBetControlsLocked}
            inputMode="decimal"
            onBlur={onCommitBetInput}
            onChange={(event) => onBetInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCommitBetInput();
              }
            }}
            type="text"
            value={betInput}
          />
          <button
            className="controlChip compactChip"
            disabled={areBetControlsLocked}
            onClick={onIncreaseBet}
            type="button"
          >
            +
          </button>
        </div>
        <div className="betMetaRow">
          {betRiskMessage ? <span className="betRiskNotice inline">{betRiskMessage}</span> : null}
          {betValidationMessage ? <span className="validationText inline">{betValidationMessage}</span> : null}
        </div>
      </div>

      <div className="bottomBarZone autoplayZone">
        <div className="autoplayControls">
          <input
            aria-label="Autoplay count"
            className="controlInput bottomBarInput"
            disabled={isAutospinActive}
            inputMode="numeric"
            onBlur={onCommitAutospinInput}
            onChange={(event) => onAutospinInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCommitAutospinInput();
              }
            }}
            type="text"
            value={autospinCountInput}
          />

          <button
            className="controlChip is-active compactChip"
            disabled={!canStartAutospin || isAutospinActive}
            onClick={onStartAutospin}
            type="button"
          >
            Auto
          </button>

          <button
            className="controlChip subtle compactChip"
            disabled={!isAutospinActive}
            onClick={onStopAutoSpin}
            type="button"
          >
            {autospinStopRequested ? "Stopping" : "Stop"}
          </button>
        </div>

        <div className="autoplayMetaRow">
          <span className="controlHelper inline">Count {requestedAutospinCount}</span>
          {autospinValidationMessage ? (
            <span className="validationText inline">{autospinValidationMessage}</span>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
