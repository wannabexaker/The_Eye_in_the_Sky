/*
Purpose: renders the professional bottom gameplay control bar
Layer: frontend (player-web)
Uses: slot wallet/bet/autoplay state and spin-button.tsx
*/

import { useEffect, useRef, useState } from "react";
import { SpinButton } from "@/components/controls/spin-button";
import type { SpinPhase } from "@/lib/presentation/spin-state-machine";

type ControlPanelProps = {
  betInput: string;
  betRiskMessage: string;
  betRiskTooltip: string;
  betValidationMessage: string;
  betValidationTooltip: string;
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
  betRiskTooltip,
  betValidationMessage,
  betValidationTooltip,
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
  const [autoplayInputOpen, setAutoplayInputOpen] = useState(false);
  const autoplayInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAutospinActive) {
      setAutoplayInputOpen(false);
    }
  }, [isAutospinActive]);

  useEffect(() => {
    if (!autoplayInputOpen || isAutospinActive || !autoplayInputRef.current) {
      return;
    }

    autoplayInputRef.current.focus();
    autoplayInputRef.current.select();
  }, [autoplayInputOpen, isAutospinActive]);

  const handleAutoplayPress = () => {
    if (isAutospinActive) {
      onStopAutoSpin();
      return;
    }

    if (!autoplayInputOpen) {
      setAutoplayInputOpen(true);
      return;
    }

    const parsedCount = onCommitAutospinInput();
    if (!parsedCount) {
      return;
    }

    onStartAutospin();
    setAutoplayInputOpen(false);
  };

  return (
    <div className="floatingGameDock">
      <div className="floatingGameDockInner">
        {/* Top Row: Spin + Stop */}
        <div className="dockTopRow">
          <div className="dockSpinWrapper">
            <SpinButton
              disabled={!canSpin}
              onClick={onSpin}
              pulseKey={spinPulseKey}
              spinPhase={spinPhase}
            />
          </div>

          <button
            aria-label="Stop autoplay now"
            className="dockStopButton"
            disabled={!isAutospinActive && !autospinStopRequested}
            onClick={onStopAutoSpin}
            title="Stop autoplay"
            type="button"
          >
            <span aria-hidden="true" className="dockStopCore" />
          </button>
        </div>

        {/* Bottom Row: Bet Controls + Autoplay */}
        <div className="dockBottomRow">
          {/* Bet Controls */}
          <div className="dockBetCluster">
            <button
              aria-label="Decrease bet"
              className="dockSmallButton iconOnlyAction betAdjustIconButton"
              disabled={areBetControlsLocked}
              onClick={onDecreaseBet}
              title="Decrease bet"
              type="button"
            >
              <svg aria-hidden="true" className="dockSmallIcon betAdjustIcon" viewBox="0 0 24 24">
                <path d="M7 12h10" />
              </svg>
            </button>

            <input
              aria-label="Bet amount"
              className="dockBetInput"
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
              className="dockSmallButton iconOnlyAction betAdjustIconButton"
              disabled={areBetControlsLocked}
              onClick={onIncreaseBet}
              title="Increase bet"
              type="button"
            >
              <svg aria-hidden="true" className="dockSmallIcon betAdjustIcon" viewBox="0 0 24 24">
                <path d="M7 12h10" />
                <path d="M12 7v10" />
              </svg>
            </button>
          </div>

          {/* Autoplay Controls */}
          <div className="dockAutoCluster">
            <div className={`autoplayPopoverAnchor dockPopoverAnchor ${autoplayInputOpen && !isAutospinActive ? "is-open" : ""}`}>
              {autoplayInputOpen && !isAutospinActive ? (
                <input
                  ref={autoplayInputRef}
                  aria-label="Autoplay spin count"
                  className="dockAutoInlineInput"
                  inputMode="numeric"
                  onBlur={onCommitAutospinInput}
                  onChange={(event) => onAutospinInputChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      const parsedCount = onCommitAutospinInput();
                      if (!parsedCount) {
                        return;
                      }

                      onStartAutospin();
                      setAutoplayInputOpen(false);
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      setAutoplayInputOpen(false);
                    }
                  }}
                  placeholder="50"
                  type="text"
                  value={autospinCountInput}
                />
              ) : null}

              <button
                className={`dockSmallButton is-active autoplayButton ${autoplayInputOpen && !isAutospinActive ? "is-open" : ""}`}
                disabled={!canStartAutospin && !isAutospinActive}
                onClick={handleAutoplayPress}
                title={isAutospinActive ? "Stop autoplay" : autoplayInputOpen ? "Start autoplay" : "Set autoplay count"}
                type="button"
              >
                <svg aria-hidden="true" className="dockSmallIcon autoplayActionIcon" viewBox="0 0 24 24">
                  <path d="M13 4l8 8-8 8" />
                  <path d="M3 4l8 8-8 8" />
                </svg>
              </button>
            </div>

            <button
              aria-label={autoContinueNeverStop ? "Disable nonstop" : "Enable nonstop"}
              className={`dockSmallButton iconOnlyAction ${autoContinueNeverStop ? "is-active" : ""}`}
              onClick={onToggleAutoContinueNeverStop}
              title={autoContinueNeverStop ? "Nonstop enabled: skip win overlays" : "Nonstop disabled"}
              type="button"
            >
              <svg aria-hidden="true" className="dockSmallIcon nonstopIcon" viewBox="0 0 24 24">
                <path d="M9 6l6 6-6 6" />
                <path d="M4 6l6 6-6 6" />
                <path d="M17 6v12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Meta Info */}
        <div className="dockMetaInfo">
          {betRiskMessage ? <span className="betRiskNotice inline" title={betRiskTooltip}>{betRiskMessage}</span> : null}
          {betValidationMessage ? <span className="validationText inline" title={betValidationTooltip}>{betValidationMessage}</span> : null}
          {isAutospinActive || autospinStopRequested ? (
            <span className="controlHelper inline">
              {Number.isFinite(autospinRemaining)
                ? `${autospinRemaining} spins`
                : "Running"}
            </span>
          ) : null}
          {autospinValidationMessage ? (
            <span className="validationText inline">{autospinValidationMessage}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
