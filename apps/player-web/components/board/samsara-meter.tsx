/*
Purpose: shows the bonus meter state in the HUD
Layer: frontend (player-web)
Uses: caller-provided eye core asset
*/

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

type SamsaraMeterProps = {
  meterRatio: number;
  current: number;
  target: number;
  collectedBets?: number;
  contributionLog?: number[];
  bonusActive?: boolean;
  meterEyeSrc?: string;
};

type ContextPlacement = "up" | "down";

type ContextWindowPosition = {
  left: number;
  top: number;
  caretX: number;
  placement: ContextPlacement;
};

export function SamsaraMeter({
  meterRatio,
  current,
  target,
  collectedBets = 0,
  contributionLog = [],
  bonusActive = false,
  meterEyeSrc = "/assets/ui/meter-eye-core.png"
}: SamsaraMeterProps) {
  const [meterProgressed, setMeterProgressed] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [contextPosition, setContextPosition] = useState<ContextWindowPosition | null>(null);
  const previousCurrentRef = useRef(current);
  const progressAnimationTimerRef = useRef<number | null>(null);
  const meterRootRef = useRef<HTMLDivElement | null>(null);
  const eyeButtonRef = useRef<HTMLButtonElement | null>(null);
  const contextWindowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (current > previousCurrentRef.current) {
      setMeterProgressed(true);

      if (progressAnimationTimerRef.current !== null) {
        window.clearTimeout(progressAnimationTimerRef.current);
      }

      progressAnimationTimerRef.current = window.setTimeout(() => {
        setMeterProgressed(false);
        progressAnimationTimerRef.current = null;
      }, 420);
    }

    previousCurrentRef.current = current;
  }, [current]);

  useEffect(() => {
    return () => {
      if (progressAnimationTimerRef.current !== null) {
        window.clearTimeout(progressAnimationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!meterRootRef.current || !contextOpen) {
        return;
      }

      if (contextWindowRef.current?.contains(event.target as Node)) {
        return;
      }

      if (meterRootRef.current.contains(event.target as Node)) {
        return;
      }

      setContextOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [contextOpen]);

  useLayoutEffect(() => {
    if (!contextOpen || !eyeButtonRef.current || !contextWindowRef.current) {
      return;
    }

    const updateContextPosition = () => {
      if (!eyeButtonRef.current || !contextWindowRef.current) {
        return;
      }

      const viewportMargin = 12;
      const anchorRect = eyeButtonRef.current.getBoundingClientRect();
      const popupWidth = contextWindowRef.current.offsetWidth;
      const popupHeight = contextWindowRef.current.offsetHeight;
      const anchorCenterX = anchorRect.left + anchorRect.width / 2;
      const preferredLeft = anchorCenterX - popupWidth / 2;
      const clampedLeft = Math.max(
        viewportMargin,
        Math.min(preferredLeft, window.innerWidth - popupWidth - viewportMargin)
      );

      const canPlaceUp = anchorRect.top - popupHeight - 18 >= viewportMargin;
      const placement: ContextPlacement = canPlaceUp ? "up" : "down";
      const top = canPlaceUp
        ? anchorRect.top - popupHeight - 18
        : Math.min(anchorRect.bottom + 18, window.innerHeight - popupHeight - viewportMargin);

      const caretX = Math.max(
        16,
        Math.min(anchorCenterX - clampedLeft, popupWidth - 16)
      );

      setContextPosition({
        left: clampedLeft,
        top,
        caretX,
        placement
      });
    };

    updateContextPosition();
    window.addEventListener("resize", updateContextPosition);
    window.addEventListener("scroll", updateContextPosition, true);

    return () => {
      window.removeEventListener("resize", updateContextPosition);
      window.removeEventListener("scroll", updateContextPosition, true);
    };
  }, [contextOpen, contributionLog.length]);

  const clamped = Math.max(0, Math.min(1, meterRatio));
  const darkPhaseCutoff = 1 / 17;
  const goldenPhaseStart = 8 / 17;
  const lightProgress =
    clamped <= darkPhaseCutoff ? 0 : Math.min(1, (clamped - darkPhaseCutoff) / (1 - darkPhaseCutoff));
  const goldProgress =
    clamped <= goldenPhaseStart
      ? 0
      : Math.min(1, (clamped - goldenPhaseStart) / (1 - goldenPhaseStart));
  const safeCollectedBets = Number.isFinite(collectedBets) ? collectedBets : 0;
  const collectedTitle = `Samsara collected total: ${safeCollectedBets.toFixed(2)} EUR`;
  const recentEntries = contributionLog.slice(-10);
  const firstVisibleSpin = contributionLog.length - recentEntries.length + 1;
  const contextWindowStyle = contextPosition
    ? ({
        left: `${contextPosition.left}px`,
        top: `${contextPosition.top}px`,
        "--samsara-context-caret-x": `${contextPosition.caretX}px`
      } as CSSProperties)
    : undefined;
  const contextWindow = contextOpen ? (
    <div
      aria-label="Samsara contribution details"
      className={`samsaraContextWindow ${contextPosition?.placement === "down" ? "is-down" : "is-up"}`}
      ref={contextWindowRef}
      role="dialog"
      style={contextWindowStyle}
    >
      <div className="samsaraContextHeader">
        <strong>Samsara Contribution Log</strong>
        <span>{safeCollectedBets.toFixed(2)} EUR total</span>
      </div>
      {recentEntries.length === 0 ? (
        <p className="samsaraContextEmpty">No contributions yet.</p>
      ) : (
        <div className="samsaraContextList">
          {recentEntries.map((amount, index) => {
            const spinNumber = firstVisibleSpin + index;
            return (
              <div className="samsaraContextRow" key={`samsara-spin-${spinNumber}`}>
                <span>Spin {spinNumber}</span>
                <strong>+{amount.toFixed(2)} EUR</strong>
              </div>
            );
          })}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className={`samsaraMeter ${clamped >= 1 ? "is-full" : ""}`}>
      <div className="samsaraMeterBody">
        <small>
          {current} / {target}
        </small>
      </div>
      <div
        className="samsaraTrack"
        style={
          {
            "--meter-progress": clamped,
            "--meter-light": lightProgress,
            "--meter-gold": goldProgress
          } as CSSProperties
        }
        ref={meterRootRef}
      >
        <button
          aria-expanded={contextOpen}
          aria-haspopup="dialog"
          aria-label={`${collectedTitle}. Click to open contribution details.`}
          className={`samsaraEye ${clamped >= 1 ? "is-critical" : ""} ${bonusActive ? "is-cursed" : ""} ${meterProgressed ? "is-progressed" : ""}`}
          onClick={() => setContextOpen((currentOpen) => !currentOpen)}
          ref={eyeButtonRef}
          style={{ backgroundImage: `url(${meterEyeSrc})` }}
          title={collectedTitle}
          type="button"
        />
        <div className="samsaraFill" style={{ width: `${clamped * 100}%` }} />
      </div>
      {typeof document !== "undefined" && contextWindow ? createPortal(contextWindow, document.body) : null}
    </div>
  );
}
