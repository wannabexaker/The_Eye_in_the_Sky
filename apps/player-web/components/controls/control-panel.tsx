/*
Purpose: renders the professional bottom gameplay control bar
Layer: frontend (player-web)
Uses: slot wallet/bet/autoplay state and spin-button.tsx
*/

import { SpinButton } from "@/components/controls/spin-button";
import type { SpinPhase } from "@/lib/presentation/spin-state-machine";

type ControlPanelProps = {
  betInput: string;
  betRiskMessage: string;
  betValidationMessage: string;
  areBetControlsLocked: boolean;
  autospinRemaining: number;
  autospinCountInput: string;
  autospinValidationMessage: string;
  isAutospinActive: boolean;
  autospinStopRequested: boolean;
  autoContinueNeverStop: boolean;
  canSpin: boolean;
  canStartAutospin: boolean;
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
  onToggleAutoContinueNeverStop: () => void;
};

export function ControlPanel({
  betInput,
  betRiskMessage,
  betValidationMessage,
  areBetControlsLocked,
  autospinRemaining,
  autospinCountInput,
  autospinValidationMessage,
  isAutospinActive,
  autospinStopRequested,
  autoContinueNeverStop,
  canSpin,
  canStartAutospin,
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
  onToggleAutoContinueNeverStop
}: ControlPanelProps) {
  return (
    <>
      <footer className="controlBar machineBottomBar">
        <div className="machineFooterCluster machineFooterClusterRight">
          <div className="bottomBarZone betAdjustZone">
            <div className="betAdjustControls">
              <button
                aria-label="Decrease bet"
                className="controlChip compactChip iconOnlyAction betAdjustIconButton"
                disabled={areBetControlsLocked}
                onClick={onDecreaseBet}
                title="Decrease bet"
                type="button"
              >
                <svg aria-hidden="true" className="utilityIcon betAdjustIcon" viewBox="0 0 24 24">
                  <path d="M7 12h10" />
                </svg>
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
                aria-label="Increase bet"
                className="controlChip compactChip iconOnlyAction betAdjustIconButton"
                disabled={areBetControlsLocked}
                onClick={onIncreaseBet}
                title="Increase bet"
                type="button"
              >
                <svg aria-hidden="true" className="utilityIcon betAdjustIcon" viewBox="0 0 24 24">
                  <path d="M7 12h10" />
                  <path d="M12 7v10" />
                </svg>
              </button>
            </div>
            <div className="betMetaRow">
              {betRiskMessage ? <span className="betRiskNotice inline">{betRiskMessage}</span> : null}
              {betValidationMessage ? <span className="validationText inline">{betValidationMessage}</span> : null}
            </div>
          </div>

          <div className="bottomBarZone autoplayZone">
            <div className="autoplayActionRow">
              <div className="autoplayModeStack">
                <div className="autoplayModeGroup" role="group" aria-label="Autoplay controls">
                  <button
                    className="controlChip is-active compactChip autoplayModeButton autoplayModeButtonStart"
                    disabled={!canStartAutospin || isAutospinActive}
                    onClick={onStartAutospin}
                    title="Start autoplay with the selected spin count"
                    type="button"
                  >
                    Auto
                  </button>

                  <button
                    className="controlChip subtle compactChip autoplayModeButton autoplayModeButtonEnd"
                    disabled={!isAutospinActive}
                    onClick={onStopAutoSpin}
                    title="Stop autoplay after the current spin finishes"
                    type="button"
                  >
                    {autospinStopRequested ? "Stopping" : "Stop"}
                  </button>
                </div>

                <div className="autoplayControls">
                  <input
                    aria-label="Autoplay count"
                    className="controlInput bottomBarInput autoplayCountInput"
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
                    title="Number of automatic spins to run"
                    type="text"
                    value={autospinCountInput}
                  />
                </div>
              </div>

              <button
                aria-label={autoContinueNeverStop ? "Disable non-stop auto continue" : "Enable non-stop auto continue"}
                className={`controlChip compactChip iconOnlyAction autoContinueToggle ${autoContinueNeverStop ? "is-active" : ""}`}
                onClick={onToggleAutoContinueNeverStop}
                title={
                  autoContinueNeverStop
                    ? "Non-stop auto continue is enabled"
                    : "Keep autoplay moving through win and bonus presentations"
                }
                type="button"
              >
                <svg aria-hidden="true" className="utilityIcon skipIcon" viewBox="0 0 24 24">
                  <path d="M5 7 11 12 5 17V7Z" />
                  <path d="M12 7 18 12 12 17V7Z" />
                </svg>
              </button>
            </div>

            <div className="autoplayMetaRow">
              {isAutospinActive || autospinStopRequested ? (
                <span className="controlHelper inline">{autospinRemaining} autospins left</span>
              ) : null}
              {autospinValidationMessage ? (
                <span className="validationText inline">{autospinValidationMessage}</span>
              ) : null}
            </div>
          </div>
        </div>
      </footer>

      <div className="machineFooterSpinDock">
        <div className="betSpinAnchor">
          <SpinButton
            disabled={!canSpin}
            onClick={onSpin}
            pulseKey={spinPulseKey}
            spinPhase={spinPhase}
          />
        </div>
      </div>
    </>
  );
}
