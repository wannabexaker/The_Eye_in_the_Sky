/*
Purpose: renders the main spin CTA with a scale-invariant SVG ouroboros ring
Layer: frontend (player-web)
Uses: presentation spin-state-machine labels
Note: the serpent is an SVG (not tiny CSS pseudo-elements) so the snake stays
recognizable even at the ~80px dock size. The ring rotates on spin.
*/

import { type SpinPhase } from "@/lib/presentation/spin-state-machine";
import { type MouseEvent as ReactMouseEvent } from "react";

type SpinButtonProps = {
  disabled: boolean;
  isManualClicked: boolean;
  isSpinButtonPressed: boolean;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  onKeyUp?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  spinPhase: SpinPhase;
  pulseKey: number;
};

/** Scale-invariant ouroboros: a gold serpent biting its tail, with a clearly
 *  readable head + eye + tongue even at ~80px. viewBox 100x100, ring at r≈35. */
function OuroborosArt() {
  return (
    <svg className="ouroborosArt" viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ouroBody" x1="20" y1="18" x2="82" y2="86" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f7dda2" />
          <stop offset="0.5" stopColor="#e2be70" />
          <stop offset="1" stopColor="#a96f29" />
        </linearGradient>
      </defs>
      {/* Serpent body — near-full circle, gap at the top where the head meets the tail */}
      <path
        d="M45 15 A 35 35 0 1 1 56 14.4"
        stroke="url(#ouroBody)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* Scale texture along the body */}
      <path
        d="M45 15 A 35 35 0 1 1 56 14.4"
        stroke="#5a3b16"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 7.5"
        opacity="0.4"
      />
      {/* Head — a rounded wedge biting back toward the tail */}
      <path
        d="M56 14.4c6.5-3.4 12.6-1 13.8 4.8c1 5-2.8 9.3-8.8 8.7c2.6-3.8 1.6-9.2-5-13.5z"
        fill="url(#ouroBody)"
        stroke="#553715"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* Eye */}
      <circle cx="61.5" cy="16.6" r="2.2" fill="#23110a" />
      <circle cx="62.2" cy="15.9" r="0.7" fill="#f7e2b1" />
      {/* Forked tongue flicking toward the tail */}
      <path
        className="ouroborosTongue"
        d="M53 20.5q-4 1.2-7.6-0.4m7.6 0.4q-3.4 2.8-7.2 2"
        stroke="#cf4b3c"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SpinButton({
  disabled,
  isManualClicked,
  isSpinButtonPressed,
  onKeyDown,
  onKeyUp,
  onMouseDown,
  onMouseUp,
  spinPhase,
  pulseKey
}: SpinButtonProps) {
  const spinning = spinPhase !== "IDLE" && spinPhase !== "ROUND_END";

  const suppressSelectionOnMouseDown = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <button
      className={`spinCta ${spinning ? "is-spinning" : ""} ${isManualClicked ? "is-manual-clicked" : ""} ${isSpinButtonPressed ? "is-pressed" : ""}`}
      data-phase={spinPhase}
      disabled={disabled}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onMouseDown={(event) => {
        suppressSelectionOnMouseDown(event);
        onMouseDown?.();
      }}
      onMouseUp={onMouseUp}
      title="Spin"
      type="button"
    >
      <span className="spinRipple" key={pulseKey} />
      <span aria-hidden="true" className="ouroborosRing">
        <OuroborosArt />
      </span>
      <span className="spinCore">
        <span className="spinText">Spin</span>
      </span>
    </button>
  );
}
