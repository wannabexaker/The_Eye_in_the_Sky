/*
Purpose: renders the professional bottom gameplay control bar
Layer: frontend (player-web)
Uses: slot wallet/bet/autoplay state and spin-button.tsx
*/

import { useEffect, useId, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
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
  ouroborosRingSrc: string;
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

type DockSilhouette = {
  height: number;
  path: string;
  width: number;
};

const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const fmt = (value: number) => Number(value.toFixed(2));

const buildDockSilhouette = (
  rawWidth: number,
  rawHeight: number,
  rawSpinCenterY: number,
  rawSpinSize: number
): DockSilhouette => {
  const width = Math.max(1, fmt(rawWidth));
  const height = Math.max(1, fmt(rawHeight));
  const spinCenterY = clampNumber(rawSpinCenterY, 28, Math.max(29, height - 24));
  const spinSize = clampNumber(rawSpinSize, 68, 132);
  const centerX = width / 2;
  const barTop = fmt(spinCenterY);
  const bottom = fmt(Math.max(barTop + 36, height - 2));
  const sideRadius = fmt(clampNumber((bottom - barTop) * 0.42, 12, 18));
  const domeRadius = fmt(clampNumber(spinSize / 2 + 9, 42, Math.min(width * 0.18, barTop + 18)));
  const domeArcY = fmt(barTop - domeRadius * 0.44);
  const domeArcXOffset = fmt(domeRadius * 0.9);
  const shoulderWidth = fmt(clampNumber(domeRadius * 0.42, 18, Math.max(18, (width - domeRadius * 2 - 80) / 2)));
  const left = 1;
  const right = fmt(width - 1);
  const leftDomeX = fmt(centerX - domeArcXOffset);
  const rightDomeX = fmt(centerX + domeArcXOffset);
  const leftShoulderX = fmt(Math.max(left + sideRadius + 8, leftDomeX - shoulderWidth));
  const rightShoulderX = fmt(Math.min(right - sideRadius - 8, rightDomeX + shoulderWidth));

  const path = [
    `M ${fmt(left + sideRadius)} ${barTop}`,
    `L ${leftShoulderX} ${barTop}`,
    `C ${fmt(leftShoulderX + shoulderWidth * 0.42)} ${barTop} ${fmt(leftDomeX - shoulderWidth * 0.32)} ${fmt(domeArcY + domeRadius * 0.1)} ${leftDomeX} ${domeArcY}`,
    `A ${domeRadius} ${domeRadius} 0 0 1 ${rightDomeX} ${domeArcY}`,
    `C ${fmt(rightDomeX + shoulderWidth * 0.32)} ${fmt(domeArcY + domeRadius * 0.1)} ${fmt(rightShoulderX - shoulderWidth * 0.42)} ${barTop} ${rightShoulderX} ${barTop}`,
    `L ${fmt(right - sideRadius)} ${barTop}`,
    `Q ${right} ${barTop} ${right} ${fmt(barTop + sideRadius)}`,
    `L ${right} ${fmt(bottom - sideRadius)}`,
    `Q ${right} ${bottom} ${fmt(right - sideRadius)} ${bottom}`,
    `L ${fmt(left + sideRadius)} ${bottom}`,
    `Q ${left} ${bottom} ${left} ${fmt(bottom - sideRadius)}`,
    `L ${left} ${fmt(barTop + sideRadius)}`,
    `Q ${left} ${barTop} ${fmt(left + sideRadius)} ${barTop}`,
    "Z"
  ].join(" ");

  return { height, path, width };
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
  ouroborosRingSrc,
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
  const [dockSilhouette, setDockSilhouette] = useState<DockSilhouette>(() =>
    buildDockSilhouette(720, 112, 54, 112)
  );
  const dockInnerRef = useRef<HTMLDivElement>(null);
  const autoplayHoldTimerRef = useRef<number | null>(null);
  const manualClickTimerRef = useRef<number | null>(null);
  const svgId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const silhouetteGradientId = `dockSilhouetteGradient-${svgId}`;
  const silhouetteFilterId = `dockSilhouetteShadow-${svgId}`;

  // Preset spin counts shown in the chip tray (∞ = infinite)
  const AUTOSPIN_PRESETS = [10, 25, 50, 100, "∞"] as const;

  useEffect(() => {
    if (isAutospinActive) {
      setIsSpinButtonPressed(false);
      setAutoplayInputOpen(false);
    }
  }, [isAutospinActive]);

  useEffect(() => {
    const dockInner = dockInnerRef.current;

    if (!dockInner) {
      return;
    }

    let frame = 0;

    const updateSilhouette = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const dockRect = dockInner.getBoundingClientRect();
        const spinButton = dockInner.querySelector<HTMLElement>(".spinCta");
        const spinRect = spinButton?.getBoundingClientRect();
        const spinCenterY = spinRect ? spinRect.top - dockRect.top + spinRect.height / 2 : dockRect.height * 0.46;
        const spinSize = spinRect ? Math.max(spinRect.width, spinRect.height) : 96;
        const next = buildDockSilhouette(dockRect.width, dockRect.height, spinCenterY, spinSize);

        setDockSilhouette((current) => (
          current.width === next.width && current.height === next.height && current.path === next.path
            ? current
            : next
        ));
      });
    };

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateSilhouette);
    resizeObserver?.observe(dockInner);

    const spinButton = dockInner.querySelector<HTMLElement>(".spinCta");
    if (spinButton) {
      resizeObserver?.observe(spinButton);
    }

    updateSilhouette();
    window.addEventListener("resize", updateSilhouette);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateSilhouette);
      resizeObserver?.disconnect();
    };
  }, []);

  const handleAutoplayPress = () => {
    if (isAutospinActive) {
      onStopAutoSpin();
      return;
    }

    if (!canStartAutospin) {
      return;
    }

    setAutoplayInputOpen((prev) => !prev);
  };

  // Tapping a preset chip immediately starts autospin — no keyboard needed.
  const handlePresetSelect = (preset: number | "∞") => {
    setAutoplayInputOpen(false);

    if (preset === "∞") {
      onStartAutospinInfinite();
      return;
    }

    onAutospinInputChange(String(preset));
    // Give the slot state a tick to register the new value before committing.
    window.setTimeout(() => {
      const parsed = onCommitAutospinInput();
      if (parsed) {
        onStartAutospin();
      }
    }, 0);
  };

  const clearAutoplayHoldTimer = () => {
    if (autoplayHoldTimerRef.current === null) {
      return;
    }

    window.clearTimeout(autoplayHoldTimerRef.current);
    autoplayHoldTimerRef.current = null;
  };

  // Keep pointer-down handler stub so we can still cancel if needed.
  const handleAutoplayPointerDown = () => {
    if (isAutospinActive || !canStartAutospin) {
      return;
    }
    clearAutoplayHoldTimer();
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
  const autoplayDisabled = (areBetControlsLocked && !isAutospinActive) || (!isAutospinActive && !canStartAutospin);

  return (
    <div className="floatingGameDock">
      <div className="floatingGameDockInner" ref={dockInnerRef}>
        <svg
          aria-hidden="true"
          className="dockSilhouetteSvg"
          focusable="false"
          height={dockSilhouette.height}
          preserveAspectRatio="xMidYMid meet"
          viewBox={`0 0 ${dockSilhouette.width} ${dockSilhouette.height}`}
          width={dockSilhouette.width}
        >
          <defs>
            <linearGradient id={silhouetteGradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#2a231d" />
              <stop offset="0.5" stopColor="#0d0c0d" />
              <stop offset="1" stopColor="#070708" />
            </linearGradient>
            <filter id={silhouetteFilterId} x="-4%" y="-18%" width="108%" height="136%">
              <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="rgba(0,0,0,0.34)" />
            </filter>
          </defs>
          <path
            d={dockSilhouette.path}
            fill={`url(#${silhouetteGradientId})`}
            filter={`url(#${silhouetteFilterId})`}
            stroke="rgba(226,190,112,0.32)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
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
              ouroborosRingSrc={ouroborosRingSrc}
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
              {/* Preset chip tray — slides up when the autoplay button is tapped */}
              {autoplayInputOpen && !isAutospinActive ? (
                <div aria-label="Autoplay spin count presets" className="dockPresetChips" role="group">
                  {AUTOSPIN_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      aria-label={preset === "∞" ? "Infinite autoplay" : `Autoplay ${preset} spins`}
                      className="dockPresetChip"
                      onMouseDown={suppressSelectionOnPointerDown}
                      onClick={() => handlePresetSelect(preset)}
                      type="button"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              ) : null}

              <button
                aria-label={
                  autospinStopRequested
                    ? "Autoplay stopping"
                    : isAutospinActive
                      ? `Stop autoplay (${autospinRemaining > 0 ? autospinRemaining : "∞"} left)`
                      : autoplayInputOpen
                        ? "Close autoplay presets"
                        : "Autoplay"
                }
                className={`dockSmallButton is-active autoplayButton ${autoplayInputOpen && !isAutospinActive ? "is-open" : ""} ${autoplayIsStopState ? "is-stop" : ""}`}
                disabled={autoplayDisabled}
                onContextMenu={(e) => e.preventDefault()}
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
                      : "Autoplay"
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
