/*
Purpose: shows the bonus meter state in the HUD
Layer: frontend (player-web)
Uses: shared shell asset manifest for the eye core icon
*/

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { shellAssets } from "@/lib/assets/asset-manifest";

type SamsaraMeterProps = {
  meterRatio: number;
  current: number;
  target: number;
};

export function SamsaraMeter({ meterRatio, current, target }: SamsaraMeterProps) {
  const [meterProgressed, setMeterProgressed] = useState(false);
  const previousCurrentRef = useRef(current);
  const progressAnimationTimerRef = useRef<number | null>(null);

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

  const clamped = Math.max(0, Math.min(1, meterRatio));
  const darkPhaseCutoff = 1 / 17;
  const goldenPhaseStart = 8 / 17;
  const lightProgress =
    clamped <= darkPhaseCutoff ? 0 : Math.min(1, (clamped - darkPhaseCutoff) / (1 - darkPhaseCutoff));
  const goldProgress =
    clamped <= goldenPhaseStart
      ? 0
      : Math.min(1, (clamped - goldenPhaseStart) / (1 - goldenPhaseStart));

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
      >
        <div
          aria-hidden="true"
          className={`samsaraEye ${clamped >= 1 ? "is-critical" : ""} ${meterProgressed ? "is-progressed" : ""}`}
          style={{ backgroundImage: `url(${shellAssets.meterEye})` }}
        />
        <div className="samsaraFill" style={{ width: `${clamped * 100}%` }} />
      </div>
    </div>
  );
}
