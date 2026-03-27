/*
Purpose: renders the professional bottom gameplay control bar
Layer: frontend (player-web)
Uses: slot wallet/bet/autoplay state and spin-button.tsx
*/

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { SpinButton } from "@/components/controls/spin-button";
import type { SpinAnimationSpeed, SpinPhase } from "@/lib/presentation/spin-state-machine";

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
  spinAnimationSpeed: SpinAnimationSpeed;
  spinSpeedOptions: readonly SpinAnimationSpeed[];
  spinPhase: SpinPhase;
  spinPulseKey: number;
  onSpinSpeedChange: (speed: SpinAnimationSpeed) => void;
  onBetInputChange: (value: string) => void;
  onCommitBetInput: () => boolean;
  onIncreaseBet: () => boolean;
  onDecreaseBet: () => boolean;
  onAutospinInputChange: (value: string) => void;
  onCommitAutospinInput: () => number | null;
  onSpin: () => void;
  onStartAutospin: () => void;
  onStartAutospinInfinite: () => void;
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
  spinAnimationSpeed,
  spinSpeedOptions,
  spinPhase,
  spinPulseKey,
  onSpinSpeedChange,
  onBetInputChange,
  onCommitBetInput,
  onIncreaseBet,
  onDecreaseBet,
  onAutospinInputChange,
  onCommitAutospinInput,
  onSpin,
  onStartAutospin,
  onStartAutospinInfinite,
  onStopAutoSpin,
  onToggleAutoContinueNeverStop
}: ControlPanelProps) {
  const spinSpeedLabel: Record<SpinAnimationSpeed, string> = {
    slow: "Slow",
    normal: "Normal",
    fast: "Fast",
    fast_af: "FastAF"
  };
  const [autoplayInputOpen, setAutoplayInputOpen] = useState(false);
  const [isManualClickedRef, setIsManualClicked] = useState(false);
  const [isSpinButtonPressed, setIsSpinButtonPressed] = useState(false);
  const autoplayInputRef = useRef<HTMLInputElement>(null);
  const autoplayHoldTimerRef = useRef<number | null>(null);
  const autoplayLongPressTriggeredRef = useRef(false);
  const manualClickTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isAutospinActive) {
      setIsSpinButtonPressed(false);
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
    if (autoplayLongPressTriggeredRef.current) {
      autoplayLongPressTriggeredRef.current = false;
      return;
    }

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

  const clearAutoplayHoldTimer = () => {
    if (autoplayHoldTimerRef.current === null) {
      return;
    }

    window.clearTimeout(autoplayHoldTimerRef.current);
    autoplayHoldTimerRef.current = null;
  };

  const handleAutoplayPointerDown = () => {
    if (isAutospinActive) {
      return;
    }

    clearAutoplayHoldTimer();
    autoplayLongPressTriggeredRef.current = false;

    autoplayHoldTimerRef.current = window.setTimeout(() => {
      autoplayLongPressTriggeredRef.current = true;
      setAutoplayInputOpen(false);
      onStartAutospinInfinite();
      autoplayHoldTimerRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    return () => {
      clearAutoplayHoldTimer();
      if (manualClickTimerRef.current !== null) {
        window.clearTimeout(manualClickTimerRef.current);
        manualClickTimerRef.current = null;
      }
    };
  }, []);

  const handleManualSpin = () => {
    if (isAutospinActive) {
      return;
    }

    setIsManualClicked(true);

    if (manualClickTimerRef.current !== null) {
      window.clearTimeout(manualClickTimerRef.current);
    }

    manualClickTimerRef.current = window.setTimeout(() => {
      setIsManualClicked(false);
      manualClickTimerRef.current = null;
    }, 380);

    onSpin();
  };

  const handleSpinKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const isSpaceKey = event.code === "Space" || event.key === " ";
    const isEnterKey = event.code === "Enter" || event.key === "Enter";

    if ((isSpaceKey || isEnterKey) && !isAutospinActive) {
      event.preventDefault();
      if (!isSpinButtonPressed) {
        setIsSpinButtonPressed(true);
      }
    }
  };

  const handleSpinKeyUp = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const isSpaceKey = event.code === "Space" || event.key === " ";
    const isEnterKey = event.code === "Enter" || event.key === "Enter";

    if (isSpaceKey || isEnterKey) {
      event.preventDefault();
      setIsSpinButtonPressed(false);
      if (isEnterKey && !isAutospinActive) {
        handleManualSpin();
      }
    }
  };

  const handleSpinButtonMouseDown = () => {
    if (!isAutospinActive) {
      setIsSpinButtonPressed(true);
    }
  };

  const handleSpinButtonMouseUp = () => {
    setIsSpinButtonPressed(false);
    if (!isAutospinActive) {
      handleManualSpin();
    }
  };

  useEffect(() => {
    const handleDocumentKeyUp = (event: KeyboardEvent) => {
      if ((event.code === "Space" || event.key === " ")) {
        setIsSpinButtonPressed(false);
      }
    };

    window.addEventListener("keyup", handleDocumentKeyUp);
    return () => {
      window.removeEventListener("keyup", handleDocumentKeyUp);
    };
  }, [isAutospinActive]);

  const suppressSelectionOnPointerDown = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const normalizedSpeedOptions: SpinAnimationSpeed[] =
    spinSpeedOptions.length > 0 ? [...spinSpeedOptions] : ["normal"];
  const activeSpeedIndex = Math.max(0, normalizedSpeedOptions.indexOf(spinAnimationSpeed));
  const nextSpeed = normalizedSpeedOptions[(activeSpeedIndex + 1) % normalizedSpeedOptions.length];

  const handleCycleSpinSpeed = () => {
    onSpinSpeedChange(nextSpeed);
  };

  const autoplayIsStopState = isAutospinActive || autospinStopRequested;

  return (
    <div className="floatingGameDock">
      <div className="floatingGameDockInner">
        {/* Top Row: Spin */}
        <div className="dockTopRow">
          <div className="dockSpinWrapper">
            <SpinButton
              disabled={!canSpin}
              isManualClicked={isManualClickedRef}
              isSpinButtonPressed={isSpinButtonPressed}
              onKeyDown={handleSpinKeyDown}
              onKeyUp={handleSpinKeyUp}
              onMouseDown={handleSpinButtonMouseDown}
              onMouseUp={handleSpinButtonMouseUp}
              pulseKey={spinPulseKey}
              spinPhase={spinPhase}
            />
          </div>
        </div>

        {/* Bottom Row: Bet Controls + Autoplay */}
        <div className="dockBottomRow">
          {/* Bet Controls */}
          <div className="dockBetCluster">
            <button
              aria-label="Decrease bet"
              className="dockSmallButton iconOnlyAction betAdjustIconButton"
              disabled={areBetControlsLocked}
              onMouseDown={suppressSelectionOnPointerDown}
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
              onMouseDown={suppressSelectionOnPointerDown}
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
                aria-label={
                  autospinStopRequested
                    ? "Autoplay stopping"
                    : isAutospinActive
                      ? "Stop autoplay"
                      : autoplayInputOpen
                        ? "Start autoplay"
                        : "Set autoplay count"
                }
                className={`dockSmallButton is-active autoplayButton ${autoplayInputOpen && !isAutospinActive ? "is-open" : ""} ${autoplayIsStopState ? "is-stop" : ""}`}
                disabled={areBetControlsLocked && !isAutospinActive}
                onMouseDown={suppressSelectionOnPointerDown}
                onPointerDown={handleAutoplayPointerDown}
                onPointerUp={clearAutoplayHoldTimer}
                onPointerLeave={clearAutoplayHoldTimer}
                onPointerCancel={clearAutoplayHoldTimer}
                onClick={handleAutoplayPress}
                title={
                  autospinStopRequested
                    ? "Autoplay is stopping"
                    : isAutospinActive
                      ? "Stop autoplay"
                      : autoplayInputOpen
                        ? "Start autoplay"
                        : "Set autoplay count"
                }
                type="button"
              >
                {autoplayIsStopState ? (
                  <svg aria-hidden="true" className="dockSmallIcon autoplayStopXIcon" viewBox="0 0 24 24">
                    <path d="M7 7l10 10" />
                    <path d="M17 7l-10 10" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" className="dockSmallIcon autoplayActionIcon" viewBox="0 0 24 24">
                    <path d="M13 4l8 8-8 8" />
                    <path d="M3 4l8 8-8 8" />
                  </svg>
                )}
              </button>
            </div>

            <button
              aria-label={autoContinueNeverStop ? "Disable nonstop" : "Enable nonstop"}
              className={`dockSmallButton iconOnlyAction ${autoContinueNeverStop ? "is-active" : ""}`}
              onMouseDown={suppressSelectionOnPointerDown}
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

            {/* Spin Speed: single cycle button */}
            <button
              aria-label={`Spin speed ${spinSpeedLabel[spinAnimationSpeed]}. Click for ${spinSpeedLabel[nextSpeed]}`}
              className="dockSmallButton dockSpeedCycleButton"
              data-speed-label={spinSpeedLabel[spinAnimationSpeed]}
              onMouseDown={suppressSelectionOnPointerDown}
              onClick={handleCycleSpinSpeed}
              title={`Speed: ${spinSpeedLabel[spinAnimationSpeed]} -> ${spinSpeedLabel[nextSpeed]}`}
              type="button"
            >
              <span className="dockSpeedCycleValue">{spinSpeedLabel[spinAnimationSpeed]}</span>
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
