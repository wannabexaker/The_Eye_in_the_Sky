/*
Purpose: shows the bonus meter state in the HUD
Layer: frontend (player-web)
Uses: shared shell asset manifest for the eye core icon
*/

import { shellAssets } from "@/lib/assets/asset-manifest";

type SamsaraMeterProps = {
  meterRatio: number;
  current: number;
  target: number;
};

export function SamsaraMeter({ meterRatio, current, target }: SamsaraMeterProps) {
  const clamped = Math.max(0, Math.min(1, meterRatio));

  return (
    <div className={`samsaraMeter ${clamped >= 1 ? "is-full" : ""}`}>
      <div className="samsaraMeterBody">
        <div
          aria-hidden="true"
          className="samsaraEye"
          style={{ backgroundImage: `url(${shellAssets.meterEye})` }}
        />
        <small>
          {current} / {target}
        </small>
      </div>
      <div className="samsaraTrack">
        <div className="samsaraFill" style={{ width: `${clamped * 100}%` }} />
      </div>
    </div>
  );
}
